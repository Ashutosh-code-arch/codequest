import { Request, Response, NextFunction } from "express";
import admin from "../services/firebase";

export async function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        res.status(401).json({ message: "Missing token" });
        return;
    }

    const token = authHeader.split("Bearer ")[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decoded.uid,
            email: decoded.email || "",
        };
        next();
    } catch (err) {
        console.error("Token verification failed", err);
        res.status(401).json({ message: "Invalid or expired token" });
    }
}
