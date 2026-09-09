import * as Y from "yjs";
import * as awarenessProtocol from "y-protocols/awareness";
import * as syncProtocol from "y-protocols/sync";
import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { TypedServer, TypedSocket } from "./types";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import { completeStarterCode } from "../services/questions/templates";

// ------ Message types (match y-websocket protocol) --------------------
const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// -------- Per-room Y.js state -------------------

interface RoomYState {
    doc: Y.Doc;
    awareness: awarenessProtocol.Awareness;
    saveTimer: NodeJS.Timeout | null;
    roomId: string;
    language: string;
    questionId?: string;
    lastSavedCode: string;
    hasPersistedState: boolean;
    saving: Promise<void> | null;
}

const roomYDocs = new Map<string, RoomYState>();
const pendingRoomYDocs = new Map<string, Promise<RoomYState>>();
const socketAwareness = new Map<
    string,
    { documentKey: string; clientIds: Set<number> }
>();

function readAwarenessClientIds(update: Uint8Array): number[] {
    const decoder = decoding.createDecoder(update);
    const count = decoding.readVarUint(decoder);
    const clientIds: number[] = [];
    for (let index = 0; index < count; index += 1) {
        clientIds.push(decoding.readVarUint(decoder));
        decoding.readVarUint(decoder); // awareness clock
        decoding.readVarString(decoder); // serialized awareness state
    }
    return clientIds;
}

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
    let initialCode = "";
    let lastSavedCode = "";
    let hasPersistedState = false;
    let shouldPersistInitialState = false;

    // ── Restore from latest snapshot if one exists ─────────────────────────
    try {
        const snapshot = await prisma.codeSnapshot.findFirst({
            where: {
                roomId,
                language: language as any,
                questionId: questionId ?? null,
            },
            orderBy: { savedAt: "desc" },
        });

        if (snapshot?.yState) {
            Y.applyUpdate(doc, new Uint8Array(snapshot.yState));
            initialCode = doc.getText("monaco").toString();
            lastSavedCode = initialCode;
            hasPersistedState = true;
        } else if (snapshot) {
            initialCode = snapshot.code;
            lastSavedCode = snapshot.code;
            shouldPersistInitialState = true;
        } else if (questionId) {
            const question = await prisma.question.findUnique({
                where: { id: questionId },
                select: { starterCode: true },
            });
            initialCode = completeStarterCode(question?.starterCode)[
                language as keyof ReturnType<typeof completeStarterCode>
            ];
            shouldPersistInitialState = true;
        }
    } catch (err) {
        logger.error(err, "Failed to restore Y.js doc from snapshot");
    }

    if (initialCode) {
        doc.getText("monaco").insert(0, initialCode);
    }

    const state: RoomYState = {
        doc,
        awareness,
        saveTimer: null,
        roomId,
        language,
        questionId,
        lastSavedCode,
        hasPersistedState,
        saving: null,
    };
    doc.on("update", () => scheduleSnapshot(state));
    roomYDocs.set(key, state);

    if (shouldPersistInitialState) scheduleSnapshot(state);

    logger.debug({ roomId, language, key }, "Y.js doc created for room");
    return state;
}

function scheduleSnapshot(state: RoomYState) {
    if (state.saveTimer) clearTimeout(state.saveTimer);
    state.saveTimer = setTimeout(() => {
        state.saveTimer = null;
        void flushRoomSnapshot(state);
    }, 1_000);
}

async function persistSnapshot(state: RoomYState, code: string) {
    const roomData = await prisma.room.findUnique({
        where: { id: state.roomId },
        select: { status: true },
    });
    if (!roomData || roomData.status !== "ACTIVE") return false;

    const where = {
        roomId: state.roomId,
        questionId: state.questionId ?? null,
        language: state.language as any,
    };
    const yState = Buffer.from(Y.encodeStateAsUpdate(state.doc));
    const existing = await prisma.codeSnapshot.findFirst({
        where,
        orderBy: { savedAt: "desc" },
        select: { id: true },
    });

    if (existing) {
        await prisma.codeSnapshot.update({
            where: { id: existing.id },
            data: { code, yState, savedAt: new Date() },
        });
    } else {
        await prisma.codeSnapshot.create({
            data: {
                ...where,
                code,
                yState,
                savedById: "system",
            },
        });
    }
    return true;
}

async function flushRoomSnapshot(state: RoomYState): Promise<void> {
    if (state.saveTimer) {
        clearTimeout(state.saveTimer);
        state.saveTimer = null;
    }

    if (state.saving) await state.saving;

    const code = state.doc.getText("monaco").toString();
    if (code === state.lastSavedCode && state.hasPersistedState) return;

    const operation = (async () => {
        try {
            if (await persistSnapshot(state, code)) {
                state.lastSavedCode = code;
                state.hasPersistedState = true;
                logger.debug(
                    {
                        roomId: state.roomId,
                        language: state.language,
                        questionId: state.questionId,
                    },
                    "Code snapshot saved",
                );
            }
        } catch (err) {
            logger.error(err, "Failed to save code snapshot");
        }
    })();

    state.saving = operation;
    await operation;
    if (state.saving === operation) state.saving = null;

    if (state.doc.getText("monaco").toString() !== state.lastSavedCode) {
        scheduleSnapshot(state);
    }
}

function destroyRoomDoc(roomId: string) {
    for (const [key, state] of roomYDocs.entries()) {
        if (!key.startsWith(`${roomId}:`)) continue;
        if (state.saveTimer) clearTimeout(state.saveTimer);
        state.doc.destroy();
        roomYDocs.delete(key);
    }
    logger.debug({ roomId }, "Y.js doc destroyed");
}

async function saveAllRoomSnapshots(roomId: string) {
    const saves: Promise<void>[] = [];
    for (const [key, state] of roomYDocs.entries()) {
        if (!key.startsWith(`${roomId}:`)) continue;
        saves.push(flushRoomSnapshot(state));
    }
    await Promise.all(saves);
}

async function saveRoomDocument(
    roomId: string,
    language: string,
    questionId?: string,
) {
    const state = roomYDocs.get(getRoomDocKey(roomId, language, questionId));
    if (state) await flushRoomSnapshot(state);
}

async function saveRoomLanguageSnapshots(roomId: string, language: string) {
    const saves: Promise<void>[] = [];
    for (const state of roomYDocs.values()) {
        if (state.roomId === roomId && state.language === language) {
            saves.push(flushRoomSnapshot(state));
        }
    }
    await Promise.all(saves);
}

// ------ Socket handlers --------------------------------------------

export function registerYjsHandlers(io: TypedServer, socket: TypedSocket) {
    let latestSyncRequest = 0;

    function clearSocketAwareness(documentKey?: string) {
        const tracked = socketAwareness.get(socket.id);
        if (!tracked || (documentKey && tracked.documentKey !== documentKey)) {
            return;
        }

        const state = roomYDocs.get(tracked.documentKey);
        const clientIds = [...tracked.clientIds];
        if (state && clientIds.length) {
            awarenessProtocol.removeAwarenessStates(
                state.awareness,
                clientIds,
                socket,
            );
            const encoder = encoding.createEncoder();
            encoding.writeVarInt(encoder, MSG_AWARENESS);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(
                    state.awareness,
                    clientIds,
                ),
            );
            io.to(`yjs:${tracked.documentKey}`).emit(
                "yjs:message",
                {
                    documentKey: tracked.documentKey,
                    update: encoding.toUint8Array(encoder)
                        .buffer as ArrayBuffer,
                },
            );
        }
        socketAwareness.delete(socket.id);
    }

    // Client sends raw Y.js binary messages
    socket.on("yjs:message", async (payload) => {
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const key = payload?.documentKey;
        const channel = `yjs:${key}`;
        if (
            !key ||
            !key.startsWith(`${roomId}:`) ||
            !socket.rooms.has(channel)
        ) {
            return;
        }

        try {
            const arr = new Uint8Array(payload.update);
            if (arr.byteLength > 1_000_000) return;

            // Route by the server-authorized Yjs channel rather than mutable
            // socket language state. This preserves final keystrokes from the
            // old editor while a language switch acknowledgement is in flight.
            const state = roomYDocs.get(key);
            if (!state || state.roomId !== roomId) return;
            const decoder = decoding.createDecoder(arr);
            const msgType = decoding.readVarInt(decoder);

            if (msgType === MSG_SYNC) {
                const encoder = encoding.createEncoder();
                encoding.writeVarInt(encoder, MSG_SYNC);
                syncProtocol.readSyncMessage(decoder, encoder, state.doc, null);

                const reply = encoding.toUint8Array(encoder);
                if (reply.length > 1) {
                    socket.emit("yjs:message", {
                        documentKey: key,
                        update: reply.buffer as ArrayBuffer,
                    });
                }

                const update = Y.encodeStateAsUpdate(state.doc);
                const broadcastEncoder = encoding.createEncoder();
                encoding.writeVarInt(broadcastEncoder, MSG_SYNC);
                syncProtocol.writeUpdate(broadcastEncoder, update);
                socket.to(channel).emit(
                    "yjs:message",
                    {
                        documentKey: key,
                        update: encoding.toUint8Array(broadcastEncoder)
                            .buffer as ArrayBuffer,
                    },
                );
            } else if (msgType === MSG_AWARENESS) {
                const awarenessUpdate = decoding.readVarUint8Array(decoder);
                const clientIds = readAwarenessClientIds(awarenessUpdate);
                const tracked = socketAwareness.get(socket.id);
                if (tracked && tracked.documentKey !== key) {
                    clearSocketAwareness(tracked.documentKey);
                }
                const current = socketAwareness.get(socket.id) ?? {
                    documentKey: key,
                    clientIds: new Set<number>(),
                };
                clientIds.forEach((clientId) => current.clientIds.add(clientId));
                socketAwareness.set(socket.id, current);
                awarenessProtocol.applyAwarenessUpdate(
                    state.awareness,
                    awarenessUpdate,
                    socket,
                );
                socket.to(channel).emit("yjs:message", {
                    documentKey: key,
                    update: arr.buffer as ArrayBuffer,
                });
            }
        } catch (err) {
            logger.warn(
                { err, userId: socket.data.userId, roomId },
                "Ignored invalid Y.js message",
            );
        }
    });

    // When user joins a room - send them the current document state
    socket.on("yjs:sync-request", async (data?: { questionId?: string }) => {
        const requestNumber = ++latestSyncRequest;
        const roomId = socket.data.roomId;
        if (!roomId) return;

        const language = socket.data.language ?? "JAVASCRIPT";
        const questionId = data?.questionId;

        if (socket.data.questionId !== questionId) {
            await saveRoomDocument(
                roomId,
                language,
                socket.data.questionId,
            );
        }

        const key = getRoomDocKey(roomId, language, questionId);
        const channel = `yjs:${key}`;
        const state = await getOrCreateRoomDoc(roomId, language, questionId);

        // A faster language/question switch superseded this request while the
        // document was loading. Never attach or send the stale document.
        if (
            requestNumber !== latestSyncRequest ||
            socket.data.language !== language ||
            socket.data.roomId !== roomId
        ) {
            return;
        }

        const tracked = socketAwareness.get(socket.id);
        if (tracked && tracked.documentKey !== key) {
            clearSocketAwareness(tracked.documentKey);
        }

        for (const joinedRoom of socket.rooms) {
            if (joinedRoom.startsWith("yjs:") && joinedRoom !== channel) {
                await socket.leave(joinedRoom);
            }
        }
        await socket.join(channel);
        socket.data.questionId = questionId;

        const encoder = encoding.createEncoder();
        encoding.writeVarInt(encoder, MSG_SYNC);
        syncProtocol.writeUpdate(encoder, Y.encodeStateAsUpdate(state.doc));
        socket.emit(
            "yjs:message",
            {
                documentKey: key,
                update: encoding.toUint8Array(encoder).buffer as ArrayBuffer,
            },
        );
    });

    socket.on("disconnect", () => {
        latestSyncRequest += 1;
        clearSocketAwareness();
    });
}

export {
    getOrCreateRoomDoc,
    destroyRoomDoc,
    saveAllRoomSnapshots,
    saveRoomDocument,
    saveRoomLanguageSnapshots,
    roomYDocs,
};
