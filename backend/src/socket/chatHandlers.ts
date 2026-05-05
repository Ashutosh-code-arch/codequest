import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import type { TypedServer, TypedSocket, ChatMessagePayload } from "./types";

// ── Simple in-memory rate limiter ─────────────────────────────────────────
// Key: userId:roomId → timestamp of last message
const lastMessageAt = new Map<string, number>();
const RATE_LIMIT_MS = 1000; // 1 message per second per user per room

function isRateLimited(userId: string, roomId: string): boolean {
    const key = `${userId}:${roomId}`;
    const last = lastMessageAt.get(key) ?? 0;
    const now = Date.now();
    if (now - last < RATE_LIMIT_MS) return true;
    lastMessageAt.set(key, now);
    return false;
}

// ── Send chat history to a single socket ─────────────────────────────────
export async function sendChatHistory(socket: TypedSocket, roomId: string) {
    try {
        const messages = await prisma.chatMessage.findMany({
            where: { roomId },
            orderBy: { createdAt: "asc" },
            take: 50,
            include: { user: { select: { username: true } } },
        });

        const payload: ChatMessagePayload[] = messages.map((m: any) => ({
            id: m.id,
            roomId: m.roomId,
            userId: m.userId,
            username: m.user.username,
            content: m.content,
            createdAt: m.createdAt.toISOString(),
            type: "message",
        }));

        socket.emit("chat:history", payload);
    } catch (err) {
        logger.error(err, "sendChatHistory failed");
    }
}

// ── Broadcast a system message (join / leave) ─────────────────────────────
export function broadcastSystemMessage(
    io: TypedServer,
    roomId: string,
    content: string,
) {
    const payload: ChatMessagePayload = {
        id: `sys-${Date.now()}`,
        roomId,
        userId: "system",
        username: "system",
        content,
        createdAt: new Date().toISOString(),
        type: "system",
    };
    io.to(roomId).emit("chat:new-message", payload);
}

// ── Register handlers ────────────────────────────────────────────────────
export function registerChatHandlers(io: TypedServer, socket: TypedSocket) {
    socket.on("chat:message", async ({ roomId, content }) => {
        const userId = socket.data.userId;
        const username = socket.data.username;

        // ── Validation ──────────────────────────────────────────────────────
        const trimmed = content?.trim();

        if (!trimmed) {
            socket.emit("error", {
                code: "EMPTY_MESSAGE",
                message: "Message cannot be empty",
            });
            return;
        }
        if (trimmed.length > 2000) {
            socket.emit("error", {
                code: "MESSAGE_TOO_LONG",
                message: "Message cannot exceed 2000 characters",
            });
            return;
        }
        if (isRateLimited(userId, roomId)) {
            socket.emit("error", {
                code: "RATE_LIMITED",
                message: "Sending too fast — wait a moment",
            });
            return;
        }

        try {
            // ── Persist ────────────────────────────────────────────────────────
            const message = await prisma.chatMessage.create({
                data: { roomId, userId, content: trimmed },
            });

            const payload: ChatMessagePayload = {
                id: message.id,
                roomId: message.roomId,
                userId: message.userId,
                username,
                content: message.content,
                createdAt: message.createdAt.toISOString(),
                type: "message",
            };

            // ── Broadcast to ALL in room including sender ──────────────────────
            // We broadcast to everyone (including sender) and let the
            // frontend replace the optimistic message with the confirmed one
            io.to(roomId).emit("chat:new-message", payload);

            logger.debug(
                { roomId, userId, msgId: message.id },
                "Chat message sent",
            );
        } catch (err) {
            logger.error(err, "chat:message handler failed");
            socket.emit("error", {
                code: "SERVER_ERROR",
                message: "Failed to send message",
            });
        }
    });
}
