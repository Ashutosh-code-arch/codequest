import type { Server } from "socket.io";
import { TypedServer } from "./types";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { registerRoomHandlers } from "./roomHandlers";

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

        socket.on("disconnect", (reason) => {
            logger.debug(
                { userId: socket.data.userId, reason },
                "Socket disconnected",
            );
        });
    });

    return io;
}
