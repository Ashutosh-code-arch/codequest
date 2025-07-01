import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import authRoutes from "./routes/authRoutes";
dotenv.config();
import prisma from "./services/prisma";

const app = express();
app.use(cors());
app.use(express.json());
app.use("/api/auth", authRoutes);

app.get("/", (_, res) => {
    res.send("API Running");
});
app.get("/users", async (_, res) => {
    const users = await prisma.user.findMany();
    res.json(users);
});
app.post("/ping", (req, res) => {
    console.log("Body received:", req.body);
    res.json({ success: true, message: "You reached the server!" });
});

app.listen(8000, () => {
    console.log("Server running on http://localhost:8000");
});
