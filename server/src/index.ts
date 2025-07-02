import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
import roomRoutes from "./routes/roomRoutes";
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);
app.use("/api/rooms", roomRoutes);

app.get("/", (_, res) => {
    res.send("API Running");
});

app.listen(8000, () => {
    console.log("Server running on http://localhost:8000");
});
