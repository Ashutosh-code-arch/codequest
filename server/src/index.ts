import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import http from "http";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";
import { initSocketServer } from "./socket";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 8000;

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);
const io = initSocketServer(server);

server.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
});
