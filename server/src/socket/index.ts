import { Server as HttpServer } from "http";
import { Server } from "socket.io";

export const initSocketServer = (server: HttpServer) => {
    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("New client connected:", socket.id);

        socket.on("join-room", ({ roomId, user }) => {
            socket.join(roomId);
            socket.to(roomId).emit("user-joined", { user });
            console.log(`${user.name} joined room ${roomId}`);
        });

        socket.on("code-change", ({ roomId, code }) => {
            socket.to(roomId).emit("code-update", { code });
        });

        socket.on("leave-room", ({ roomId, user }) => {
            socket.leave(roomId);
            socket.to(roomId).emit("user-left", { user });
        });

        socket.on("disconnect", () => {
            console.log("❌ Client disconnected: ", socket.id);
        });
    });

    return io;
};
