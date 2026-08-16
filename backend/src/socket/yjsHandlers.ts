import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { TypedServer, TypedSocket } from "./types";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

// ------ Message types (match y-websocket protocol) --------------------
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// -------- Per-room Y.js state -------------------

interface RoomYState {
    doc: Y.Doc;
    awareness: awarenessProtocol.Awareness;
    saveTimer: NodeJS.Timeout | null;
}

const roomYDocs = new Map<string, RoomYState>();
const pendingRoomYDocs = new Map<string, Promise<RoomYState>>();

export function getRoomDocKey(
    roomId: string,
    language: string,
    questionId?: string,
): string {
    return questionId
        ? `${roomId}:${language}:${questionId}`
        : `${roomId}:${language}`;
}

async function getOrCreateRoomDoc(
    roomId: string,
    language: string,
    questionId?: string,
): Promise<RoomYState> {
    const key = getRoomDocKey(roomId, language, questionId);
    if (roomYDocs.has(key)) return roomYDocs.get(key)!;

    const pending = pendingRoomYDocs.get(key);
    if (pending) return pending;

    const creation = createRoomDoc(roomId, language, questionId, key);
    pendingRoomYDocs.set(key, creation);
    try {
        return await creation;
    } finally {
        if (pendingRoomYDocs.get(key) === creation) {
            pendingRoomYDocs.delete(key);
        }
    }
}

async function createRoomDoc(
    roomId: string,
    language: string,
    questionId: string | undefined,
    key: string,
): Promise<RoomYState> {

    const doc = new Y.Doc();
    const awareness = new awarenessProtocol.Awareness(doc);

    // ── Restore from latest snapshot if one exists ─────────────────────────
    try {
        const snapshot = await prisma.codeSnapshot.findFirst({
            where: {
                roomId,
                language: language as any,
                questionId: questionId,
            },
            orderBy: { savedAt: "desc" },
        });
        if (snapshot && snapshot.code.trim()) {
            // Apply the saved code into the Y.Doc before any client connects
            doc.transact(() => {
                const yText = doc.getText("monaco");
                yText.delete(0, yText.length);
                yText.insert(0, snapshot.code);
            });
        }
    } catch (err) {
        logger.error(err, "Failed to restore Y.js doc from snapshot");
    }

    // Auto-save snapshot every 60 seconds
    const saveTimer = setInterval(
        () => saveSnapshot(roomId, doc, language, questionId),
        60_000,
    );

    const state: RoomYState = { doc, awareness, saveTimer };
    roomYDocs.set(key, state);

    logger.debug({ roomId, language, key }, "Y.js doc created for room");
    return state;
}

function destroyRoomDoc(roomId: string) {
    for (const [key, state] of roomYDocs.entries()) {
        if (!key.startsWith(`${roomId}:`)) continue;
        if (state.saveTimer) clearInterval(state.saveTimer);
        state.doc.destroy();
        roomYDocs.delete(key);
    }
    logger.debug({ roomId }, "Y.js doc destroyed");
}

async function saveAllRoomSnapshots(roomId: string) {
    const saves: Promise<void>[] = [];
    for (const [key, state] of roomYDocs.entries()) {
        if (!key.startsWith(`${roomId}:`)) continue;
        const [, language, questionId] = key.split(":");
        saves.push(saveSnapshot(roomId, state.doc, language, questionId));
    }
    await Promise.all(saves);
}

async function saveSnapshot(
    roomId: string,
    doc: Y.Doc,
    language?: string,
    questionId?: string,
) {
    try {
        const code = doc.getText("monaco").toString();
        if (!code.trim()) return;
        const roomData = await prisma.room.findUnique({
            where: { id: roomId },
            select: { language: true, status: true },
        });
        if (!roomData || roomData.status !== "ACTIVE") return;

        const lang = language ?? roomData.language;

        await prisma.codeSnapshot.create({
            data: {
                roomId,
                questionId: questionId ?? null,
                code,
                language: lang as any,
                savedById: "system",
            },
        });
        logger.debug({ roomId }, "Code snapshot saved");
    } catch (err) {
        logger.error(err, "Failed to save code snapshot");
    }
}

// ------ Socket handlers --------------------------------------------

export function registerYjsHandlers(_io: TypedServer, socket: TypedSocket) {
    // Client sends raw Y.js binary messages
    socket.on("yjs:message", async (data: ArrayBuffer) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        // Get current room language from DB (or cache it in socket.data)
        const language = socket.data.language ?? "JAVASCRIPT";
        const questionId = socket.data.questionId;
        const key = getRoomDocKey(roomId, language, questionId);
        const channel = `yjs:${key}`;
        if (!socket.rooms.has(channel)) return;

        const state = await getOrCreateRoomDoc(roomId, language, questionId);
        const arr = new Uint8Array(data);
        const decoder = decoding.createDecoder(arr);
        const msgType = decoding.readVarInt(decoder);

        if (msgType === MSG_SYNC) {
            // Handle Y.js sync protocol step 1 and step 2
            const encoder = encoding.createEncoder();
            encoding.writeVarInt(encoder, MSG_SYNC);
            syncProtocol.readSyncMessage(decoder, encoder, state.doc, null);

            const reply = encoding.toUint8Array(encoder);
            if (reply.length > 1) {
                // send sync reply back to this client only
                socket.emit("yjs:message", reply.buffer as ArrayBuffer);
            }

            // Broadcast update to all OTHER clients in room
            const update = Y.encodeStateAsUpdate(state.doc);
            const broadcastEncoder = encoding.createEncoder();
            encoding.writeVarInt(broadcastEncoder, MSG_SYNC);
            syncProtocol.writeUpdate(broadcastEncoder, update);
            socket
                .to(channel)
                .emit(
                    "yjs:message",
                    encoding.toUint8Array(broadcastEncoder)
                        .buffer as ArrayBuffer,
                );
        } else if (msgType === MSG_AWARENESS) {
            // Broadcast awareness (cursor positions) to everyone including sender
            const awarenessUpdate = decoding.readVarUint8Array(decoder);
            awarenessProtocol.applyAwarenessUpdate(
                state.awareness,
                awarenessUpdate,
                socket,
            );
            socket.to(channel).emit("yjs:message", arr.buffer as ArrayBuffer);
        }
    });

    // When user joins a room - send them the current document state
    socket.on("yjs:sync-request", async (data?: { questionId?: string }) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const language = socket.data.language ?? "JAVASCRIPT";
        const questionId = data?.questionId;
        const key = getRoomDocKey(roomId, language, questionId);
        const channel = `yjs:${key}`;

        for (const joinedRoom of socket.rooms) {
            if (joinedRoom.startsWith("yjs:") && joinedRoom !== channel) {
                await socket.leave(joinedRoom);
            }
        }
        await socket.join(channel);
        socket.data.questionId = questionId;

        const state = await getOrCreateRoomDoc(roomId, language, questionId);
        const encoder = encoding.createEncoder();
        encoding.writeVarInt(encoder, MSG_SYNC);
        syncProtocol.writeSyncStep1(encoder, state.doc);
        socket.emit(
            "yjs:message",
            encoding.toUint8Array(encoder).buffer as ArrayBuffer,
        );
    });
}

export {
    getOrCreateRoomDoc,
    destroyRoomDoc,
    saveSnapshot,
    saveAllRoomSnapshots,
    roomYDocs,
};
