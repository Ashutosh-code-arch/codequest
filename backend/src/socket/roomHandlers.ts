import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { broadcastSystemMessage, sendChatHistory } from "./chatHandlers";
import { getRoomTimer, startRoomTimer } from "./timerHandlers";
import { TypedServer, TypedSocket } from "./types";

export function registerRoomHandlers(io: TypedServer, socket: TypedSocket) {
    socket.on("room:join", async ({ roomId }) => {
        const userId = socket.data.userId;
        const username = socket.data.username;

        try {
            const room = await prisma.room.findUnique({
                where: { id: roomId },
                include: { participants: { where: { isActive: true } } },
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

            const alreadyIn = room.participants.some(
                (p: any) => p.userId === userId,
            );

            if (!alreadyIn && room.participants.length >= room.maxUsers) {
                socket.emit("room:full", {
                    message: "Room is full (max 4 users",
                });
                return;
            }

            // update DB
            await prisma.roomParticipant.upsert({
                where: { roomId_userId: { roomId, userId } },
                create: { roomId, userId, isActive: true },
                update: { isActive: true, leftAT: null },
            });

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
                startRoomTimer(io, roomId, room.timerSeconds, room.language);
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
        await handleLeave(io, socket, roomId);
    });

    socket.on("timer:sync-request", async ({ roomId }) => {
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

async function handleLeave(
    io: TypedServer,
    socket: TypedSocket,
    roomId: string,
) {
    const userId = socket.data.userId;
    const userName = socket.data.username;

    try {
        await prisma.roomParticipant.updateMany({
            where: { roomId, userId },
            data: { isActive: false, leftAT: new Date() },
        });

        await socket.leave(roomId);
        socket.data.roomId = "";

        // Broadcast leave system message
        broadcastSystemMessage(io, roomId, `${userName} left the room`);

        const remaining = await prisma.roomParticipant.count({
            where: { roomId, isActive: true },
        });

        io.to(roomId).emit("room:user-left", {
            userId,
            userName,
            participantCount: remaining,
        });
        logger.info({ roomId, userId }, "Socket: user left room");
    } catch (err) {
        logger.error(err, "handleLeave failed");
    }
}
