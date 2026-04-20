import { Router } from "express";
import bcrypt from "bcryptjs";
import rateLimit from "express-rate-limit";
import { loginSchema, registerSchema } from "../validators/auth";
import { prisma } from "../lib/prisma";
import { signToken } from "../utils/jwt";
import { logger } from "../lib/logger";
import { authenticate } from "../middleware/auth";

const router = Router();

// Rate limit: max 10 auth attempts per 15 minutes per IP
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 10,
    message: {
        success: false,
        error: {
            code: "RATE_LIMITED",
            message: "Too many attempts. Try Again later",
            statusCode: 429,
        },
    },
    standardHeaders: true,
    legacyHeaders: false,
});

// POST /api/v1/auth/register
router.post("/register", authLimiter, async (req, res) => {
    const result = registerSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: result.error.issues[0].message,
                statusCode: 400,
            },
        });
        return;
    }

    const { email, username, password } = result.data;

    try {
        const existing = await prisma.user.findFirst({
            where: { OR: [{ email }, { username }] },
        });

        if (existing) {
            res.status(409).json({
                success: false,
                error: {
                    code: "USER_EXISTS",
                    message:
                        existing.email === email
                            ? "Email already registered"
                            : "Username taken",
                    statusCode: 409,
                },
            });
            return;
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const user = await prisma.user.create({
            data: { email, username, passwordHash, role: "USER" },
            select: { id: true, email: true, username: true, role: true },
        });

        const token = signToken({
            userId: user.id,
            role: user.role,
            email: user.email,
        });

        logger.info({ userId: user.id }, "New user registered");
        res.status(201).json({ success: true, data: { user, token } });
    } catch (err) {
        logger.error(err, "Register failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Registration failed",
                statusCode: 500,
            },
        });
    }
});

// POST /api/v1/auth/login
router.post("/login", authLimiter, async (req, res) => {
    const result = loginSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            success: false,
            error: {
                code: "VALIDATION_ERROR",
                message: result.error.issues[0].message,
                statusCode: 400,
            },
        });
        return;
    }

    const { email, password } = result.data;

    try {
        const user = await prisma.user.findUnique({ where: { email } });

        // Always run bcrypt even on missing user - prevents timing attacks
        const passwordMatch = user
            ? await bcrypt.compare(password, user.passwordHash)
            : await bcrypt.compare(password, "$2b$12$invalidhashforcomparison");

        if (!user || !passwordMatch) {
            res.status(401).json({
                success: false,
                error: {
                    code: "INVALID_CREDENTIALS",
                    message: "Invalid email or password",
                    statusCode: 401,
                },
            });
            return;
        }

        const token = signToken({
            userId: user.id,
            role: user.role,
            email: user.email,
        });

        logger.info({ userId: user.id }, "User logged in");
        res.json({
            success: true,
            data: {
                user: {
                    id: user.id,
                    email: user.email,
                    username: user.username,
                    role: user.role,
                },
                token,
            },
        });
    } catch (err) {
        logger.error(err, "Login failed");
        res.status(500).json({
            success: false,
            message: {
                code: "SERVER_ERROR",
                message: "Login failed",
                statusCode: 500,
            },
        });
    }
});

// GET /api/v1/auth/me
router.get("/me", authenticate, (req, res) => {
    res.json({ success: true, data: { user: req.user } });
});

export default router;
