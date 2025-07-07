import { Request, Response, NextFunction } from "express";
import admin from "../services/firebase";

export interface AuthRequest extends Request {
    user?: {
        uid: string;
        email: string;
        name?: string;
    };
}

export const authMiddleware = async (
    req: AuthRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers.authorization;

    if (!authHeader?.startsWith("Bearer ")) {
        return res.status(401).json({ message: "Missing token" });
    }

    const token = authHeader.split(" ")[1];

    try {
        const decoded = await admin.auth().verifyIdToken(token);
        req.user = {
            uid: decoded.uid,
            email: decoded.email || "",
            name: decoded.name,
        };
        next();
    } catch (error) {
        console.error("Token Error:", error);
        return res.status(401).json({ message: "Invalid token" });
    }
};
