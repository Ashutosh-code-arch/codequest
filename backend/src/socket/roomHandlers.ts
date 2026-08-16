import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { broadcastSystemMessage, sendChatHistory } from "./chatHandlers";
import { getRoomTimer, startRoomTimer } from "./timerHandlers";
import { TypedServer, TypedSocket } from "./types";
import { getRemainingRoomSeconds } from "../services/rooms/timing";
import type { Server } from "socket.io";

export function registerRoomHandlers(io: TypedServer, socket: TypedSocket) {
    socket.on("room:join", async ({ roomId }) => {
        const userId = socket.data.userId;
        const username = socket.data.username;

        try {
            const room = await prisma.$transaction(async (tx) => {
                await tx.$queryRaw`SELECT "id" FROM "Room" WHERE "id" = ${roomId} FOR UPDATE`;
                const lockedRoom = await tx.room.findUnique({
                    where: { id: roomId },
                    include: { participants: true },
                });

                if (!lockedRoom || lockedRoom.status !== "ACTIVE") {
                    return lockedRoom;
                }

                const participation = lockedRoom.participants.find(
                    (p) => p.userId === userId,
                );
                if (!participation) {
                    return { ...lockedRoom, joinRequired: true };
                }

                const activeCount = lockedRoom.participants.filter(
                    (p) => p.isActive,
                ).length;
                if (!participation.isActive && activeCount >= lockedRoom.maxUsers) {
                    return { ...lockedRoom, isFull: true };
                }

                await tx.roomParticipant.upsert({
                    where: { roomId_userId: { roomId, userId } },
                    create: { roomId, userId, isActive: true },
                    update: { isActive: true, leftAT: null },
                });
                return lockedRoom;
            });

            if (!room) {
                socket.emit("error", {
                    code: "ROOM_NOT_FOUND",
                    message: "Room not found",
                });
                return;
            }
            if (room?.status !== "ACTIVE") {
                socket.emit("error", {
                    code: "ROOM_ENDED",
                    message: "Room has ended",
                });
                return;
            }

            if ("joinRequired" in room && room.joinRequired) {
                socket.emit("error", {
                    code: "JOIN_REQUIRED",
                    message: "Join the room before opening a live connection",
                });
                return;
            }

            if ("isFull" in room && room.isFull) {
                socket.emit("room:full", {
                    message: "Room is full (max 4 users)",
                });
                return;
            }

            // Join socket room
            await socket.join(roomId);
            socket.data.roomId = roomId; // store for disconnect handler
            socket.data.language = room.language; // ← store current language
            const activeParticipants = await prisma.roomParticipant.findMany({
                where: { roomId, isActive: true },
                include: { user: { select: { id: true, username: true } } },
            });

            const activeCount = activeParticipants.length;

            socket.emit("room:existing-participants", {
                participants: activeParticipants.map((p: any) => ({
                    userId: p.userId,
                    username: p.user.username,
                    isActive: true,
                })),
            });

            socket.to(roomId).emit("room:user-joined", {
                user: { id: userId, username },
                participantCount: activeCount,
            });

            // Send chat history to the joining user
            await sendChatHistory(socket, roomId);

            // Broadcast join system message to everyone in the room
            broadcastSystemMessage(io, roomId, `${username} joined the room`);

            // Send current timer to joiner
            const remaining = getRoomTimer(roomId);
            if (remaining !== null) {
                // Timer already running — sync current value to joining user
                socket.emit("timer:sync", { secondsRemaining: remaining });
            } else {
                // No timer running — this is the first join ever for this room
                // Use timerSeconds from DB (the original duration)
                const remainingSeconds = getRemainingRoomSeconds(
                    room.startedAt,
                    room.timerSeconds,
                );
                startRoomTimer(io, roomId, remainingSeconds);
            }

            logger.info(
                { roomId, userId, username },
                "Socket: user joined room",
            );
        } catch (err) {
            logger.error(err, "room:join hadler failed");
            socket.emit("error", {
                code: "SERVER_ERROR",
                message: "Failed to join room",
            });
        }
    });

    socket.on("room:leave", async ({ roomId }) => {
        if (socket.data.roomId !== roomId) return;
        await handleLeave(io, socket, roomId);
    });

    socket.on("timer:sync-request", async ({ roomId }) => {
        if (socket.data.roomId !== roomId || !socket.rooms.has(roomId)) return;
        const remaining = getRoomTimer(roomId);
        if (remaining !== null) {
            socket.emit("timer:sync", { secondsRemaining: remaining });
        }
    });

    socket.on("disconnect", async () => {
        const roomId = socket.data.roomId;
        if (roomId) await handleLeave(io, socket, roomId);
    });
}

export async function evictRoomSockets(
    server: Server | TypedServer,
    roomId: string,
) {
    const io = server as TypedServer;
    await prisma.roomParticipant.updateMany({
        where: { roomId, isActive: true },
        data: { isActive: false, leftAT: new Date() },
    });

    for (const client of io.sockets.sockets.values()) {
        if (!client.rooms.has(roomId)) continue;
        client.data.roomId = "";
        client.data.questionId = undefined;
        for (const joinedRoom of client.rooms) {
            if (joinedRoom === roomId || joinedRoom.startsWith("yjs:")) {
                await client.leave(joinedRoom);
            }
        }
    }
}

async function handleLeave(
    io: TypedServer,
    socket: TypedSocket,
    roomId: string,
) {
    const userId = socket.data.userId;
    const userName = socket.data.username;

    try {
        await socket.leave(roomId);
        socket.data.roomId = "";

        const hasAnotherConnection = Array.from(
            io.sockets.sockets.values(),
        ).some(
            (candidate) =>
                candidate.id !== socket.id &&
                candidate.connected &&
                candidate.data.userId === userId &&
                candidate.data.roomId === roomId,
        );

        if (hasAnotherConnection) return;

        await prisma.roomParticipant.updateMany({
            where: { roomId, userId },
            data: { isActive: false, leftAT: new Date() },
        });

        // Broadcast leave system message
        broadcastSystemMessage(io, roomId, `${userName} left the room`);

        const remaining = await prisma.roomParticipant.count({
            where: { roomId, isActive: true },
        });

        io.to(roomId).emit("room:user-left", {
            userId,
            username: userName,
            participantCount: remaining,
        });
        logger.info({ roomId, userId }, "Socket: user left room");
    } catch (err) {
        logger.error(err, "handleLeave failed");
    }
}
