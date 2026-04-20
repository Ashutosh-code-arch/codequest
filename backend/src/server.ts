import express from "express";
import { createServer } from "http";
import helmet from "helmet";
import cors from "cors";
import { prisma } from "./lib/prisma";
import { logger } from "./lib/logger";
import authRoutes from "./routes/auth";

const app = express();
const httpServer = createServer(app);

app.use(helmet());
app.use(
    cors({
        origin: process.env.FRONTEND_URL ?? "http://localhost:5173",
        credentials: true,
    }),
);
app.use(express.json());

// Routes
app.use("/api/v1/auth", authRoutes);

app.get("/health", async (_req, res) => {
    try {
        await prisma.$queryRaw`SELECT 1`;
        res.json({ status: "ok", timestamp: Date.now() });
    } catch (err) {
        logger.error(err, "Health check failed");
        res.status(503).json({ status: "error" });
    }
});

const PORT = Number(process.env.PORT ?? 4000);

httpServer.listen(PORT, () => {
    logger.info(`Server running on port ${PORT}`);
});

export { httpServer };
