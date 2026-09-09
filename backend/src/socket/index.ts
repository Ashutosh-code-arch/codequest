import type { Server } from "socket.io";
import { TypedServer } from "./types";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { registerRoomHandlers } from "./roomHandlers";
import { registerYjsHandlers } from "./yjsHandlers";
import { registerChatHandlers } from "./chatHandlers";
import { registerWebRTCHandlers } from "./webrtcHandlers";
import { saveRoomLanguageSnapshots } from "./yjsHandlers";

const roomLanguageChangeQueues = new Map<string, Promise<void>>();

export function initSocket(server: Server) {
    const io = server as TypedServer;

    // --------Auth middleware----------------------
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token as string | undefined;

        if (!token) {
            next(new Error("AUTH_REQUIRED"));
            return;
        }

        try {
            const payload = verifyToken(token);
            const user = await prisma.user.findUnique({
                where: { id: payload.userId },
                select: { id: true, username: true, role: true },
            });

            if (!user) {
                next(new Error("USER_NOT_FOUND"));
                return;
            }

            // Attach to socket.data -- available in all handlers
            socket.data.userId = user.id;
            socket.data.username = user.username;
            socket.data.role = user.role;

            next();
        } catch (err) {
            next(new Error("INVALID_TOKEN"));
        }
    });

    // -------- Per-connection handlers
    io.on("connection", (socket) => {
        logger.debug({ userId: socket.data.userId }, "Socket connected");

        registerRoomHandlers(io, socket);
        registerYjsHandlers(io, socket);
        registerChatHandlers(io, socket);
        registerWebRTCHandlers(io, socket);

        // Language change — persist to DB + broadcast to room
        socket.on("language:change", ({ roomId, language }) => {
            const allowed = ["JAVASCRIPT", "PYTHON", "JAVA", "CPP", "C"];
            if (!allowed.includes(language)) return;
            if (
                socket.data.roomId !== roomId ||
                !socket.rooms.has(roomId)
            ) {
                socket.emit("error", {
                    code: "FORBIDDEN",
                    message: "Join the room before changing its language",
                });
                return;
            }

            const previousChange =
                roomLanguageChangeQueues.get(roomId) ?? Promise.resolve();
            const change = previousChange
                .catch(() => undefined)
                .then(async () => {
                    try {
                        const previousLanguage =
                            socket.data.language ?? "JAVASCRIPT";
                        if (previousLanguage === language) return;

                        await saveRoomLanguageSnapshots(
                            roomId,
                            previousLanguage,
                        );
                        const result = await prisma.room.updateMany({
                            where: { id: roomId, status: "ACTIVE" },
                            data: {
                                language: language as
                                    | "JAVASCRIPT"
                                    | "PYTHON"
                                    | "JAVA"
                                    | "CPP"
                                    | "C",
                            },
                        });
                        if (result.count === 0) {
                            socket.emit("error", {
                                code: "ROOM_NOT_ACTIVE",
                                message: "Room is not active",
                            });
                            return;
                        }
                        for (const client of io.sockets.sockets.values()) {
                            if (client.rooms.has(roomId)) {
                                client.data.language = language;
                            }
                        }
                        io.to(roomId).emit("language:changed", {
                            language,
                        });
                        logger.debug({ roomId, language }, "Language changed");
                    } catch (err) {
                        logger.error(err, "language:change failed");
                        socket.emit("error", {
                            code: "LANGUAGE_CHANGE_FAILED",
                            message: "Failed to change language",
                        });
                    }
                });

            roomLanguageChangeQueues.set(roomId, change);
            void change.finally(() => {
                if (roomLanguageChangeQueues.get(roomId) === change) {
                    roomLanguageChangeQueues.delete(roomId);
                }
            });
        });

        socket.on("disconnect", (reason) => {
            logger.debug(
                { userId: socket.data.userId, reason },
                "Socket disconnected",
            );
        });
    });

    return io;
}
