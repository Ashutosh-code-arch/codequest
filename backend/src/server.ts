import "dotenv/config";
import express from "express";
import { createServer } from "http";
import { Server } from "socket.io";
import helmet from "helmet";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import authRoutes from "./routes/auth";
import adminRoutes from "./routes/admin";
import roomRoutes from "./routes/room";
import executionRoutes from "./routes/execution";
import { initSocket } from "./socket";
import historyRoutes from "./routes/history";

const app = express();
const httpServer = createServer(app);

// ------- Socket.IO ---------------
const io = new Server(httpServer, {
    cors: {
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true,
    },
    pingTimeout: 20000,
    pingInterval: 25000,
});

initSocket(io);

// ------------- Express middleware ----------------

app.use(helmet({ contentSecurityPolicy: false }));
app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());

// ------------------------ Routes ----------------------
app.use("/api/v1/auth", authRoutes);
app.use("/api/v1/admin", adminRoutes);
app.use("/api/v1/rooms", roomRoutes);
app.use("/api/v1", executionRoutes);
app.use("/api/v1/history", historyRoutes);

// ------------------------ Health -----------------------
app.get("/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", timestamp: Date.now() });
    } catch (err) {
        logger.error(err, "Health check failed");
        res.status(503).json({ status: "error" });
    }
});

// ---------------- Start -------------------------
const PORT = Number(process.env.PORT ?? 4000);

httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

export { httpServer, io };
