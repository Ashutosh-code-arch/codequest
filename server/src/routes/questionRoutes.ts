import express from "express";
import { getQuestions } from "../controllers/questionController";

const router = express.Router();
router.get("/", getQuestions);
export default router;
