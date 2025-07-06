import { Server } from "socket.io";
import { Server as HTTPServer } from "http";

export const initSocketServer = (httpServer: HTTPServer) => {
    const io = new Server(httpServer, {
        cors: {
            origin: "http://localhost:5173",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("🟢 Client connected:", socket.id);

        socket.on("join-room", (data) => {
            const roomId = data?.roomId;
            const user = data?.user;

            if (!roomId || !user?.name) {
                console.warn("⚠️ Invalid join-room payload:", data);
                socket.emit("error", { message: "Invalid room or user data" });
                return;
            }

            socket.join(roomId);
            console.log(`✅ ${user.name} (${socket.id}) joined room ${roomId}`);
        });

        socket.on("leave-room", (roomId) => {
            socket.leave(roomId);
            console.log(`👋 ${socket.id} left room ${roomId}`);
        });

        socket.on("code-change", (data) => {
            const { roomId, code } = data || {};
            if (!roomId || typeof code !== "string") {
                console.warn("⚠️ Invalid code-change payload:", data);
                return;
            }
            socket.to(roomId).emit("code-change", code);
        });

        socket.on("disconnect", () => {
            console.log("🔴 Client disconnected:", socket.id);
        });
    });

    return io;
};
