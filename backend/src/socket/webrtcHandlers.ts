import { logger } from "../lib/logger";
import { PeerInfo, TypedServer, TypedSocket } from "./types";

// roomId => active peers in that room
const roomPeers = new Map<string, PeerInfo[]>();

export function registerWebRTCHandlers(io: TypedServer, socket: TypedSocket) {
    socket.on("webrtc:join", ({ roomId }: { roomId: string }) => {
        const userId = socket.data.userId;
        const username = socket.data.username;
        const existing = roomPeers.get(roomId) ?? [];

        // Tell new joiner who is already here - they will send offers
        socket.emit("webrtc:existing-peers", { peers: existing });

        // Register self in the peer list
        const updated = [
            ...existing.filter((p) => p.socketId !== socket.id),
            { socketId: socket.id, userId, username },
        ];
        roomPeers.set(roomId, updated);
        logger.debug(
            { roomId, userId, peerCount: existing.length },
            "WebRTC peer joined",
        );
    });

    // Pure passthrough - forward signal to target socket only
    socket.on("webrtc:signal", ({ to, signal }) => {
        const target = io.sockets.sockets.get(to);
        if (!target) {
            logger.debug({ to }, "WebRTC signal: target socket not found");
            return;
        }
        target.emit("webrtc:signal", {
            from: socket.id,
            userId: socket.data.userId,
            signal,
        });
    });

    function cleanup(roomId?: string) {
        if (!roomId) {
            roomPeers.forEach((peers, rId) => {
                const filtered = peers.filter((p) => p.socketId !== socket.id);
                if (filtered.length !== peers.length) {
                    roomPeers.set(rId, filtered);
                    io.to(rId).emit("webrtc:peer-left", {
                        userId: socket.data.userId,
                        socketId: socket.id,
                    });
                }
            });
        } else {
            const filtered = (roomPeers.get(roomId) ?? []).filter(
                (p) => p.socketId !== socket.id,
            );
            roomPeers.set(roomId, filtered);
            io.to(roomId).emit("webrtc:peer-left", {
                userId: socket.data.userId,
                socketId: socket.id,
            });
        }
    }

    socket.on("webrtc:leave", ({ roomId }: { roomId: string }) =>
        cleanup(roomId),
    );
    socket.on("disconnect", () => cleanup());
}
