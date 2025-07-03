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

app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

const server = http.createServer(app);
const io = initSocketServer(server);

app.listen(8000, () => {
    console.log("Server running on http://localhost:8000");
});
