import express from "express";
import { getMe, register } from "../controllers/authController";
import { authMiddleware } from "../middleware/auth";

const router = express.Router();

router.get("/me", authMiddleware, getMe);
router.post("/register", register);

export default router;
