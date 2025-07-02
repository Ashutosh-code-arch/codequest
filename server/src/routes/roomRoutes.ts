import express from "express";
import { authMiddleware } from "../middleware/auth";
import { createRoom, getRoom, joinRoom } from "../controllers/roomController";

const router = express.Router();

router.post("/", authMiddleware, createRoom);
router.post("/:roomId/join", authMiddleware, joinRoom);
router.get("/:roomId", authMiddleware, getRoom);

export default router;
