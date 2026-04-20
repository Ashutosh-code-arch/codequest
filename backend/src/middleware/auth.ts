import { Request, Response, NextFunction } from "express";
import { verifyToken } from "../utils/jwt";
import { prisma } from "../lib/prisma";

export async function authenticate(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    const authHeader = req.headers.authorization;
    const token = authHeader?.startsWith("Bearer ")
        ? authHeader.split(" ")[1]
        : null;

    if (!token) {
        res.status(401).json({
            success: false,
            error: {
                code: "NO_TOKEN",
                message: "Authorization token required",
                statusCode: 401,
            },
        });
        return;
    }

    try {
        const payload = verifyToken(token);
        const user = await prisma.user.findUnique({
            where: { id: payload.userId },
            select: { id: true, email: true, username: true, role: true },
        });

        if (!user) {
            res.status(401).json({
                success: false,
                error: {
                    code: "USER_NOT_FOUND",
                    message: "User no longer exists",
                    statusCode: 401,
                },
            });
            return;
        }

        req.user = user;
        next();
    } catch {
        res.status(401).json({
            success: false,
            error: {
                code: "INVALID_TOKEN",
                message: "Token is invalid or expired",
                statusCode: 401,
            },
        });
    }
}

export function requireAdmin(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (req.user?.role !== "ADMIN") {
        res.status(403).json({
            success: false,
            error: {
                code: "FORBIDDEN",
                message: "Admin access required",
                status: 403,
            },
        });
        return;
    }
    next();
}
