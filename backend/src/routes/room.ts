import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { createRoomSchema } from "../validators/room";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const router = Router();
router.use(authenticate);

// POST /api/v1/rooms - create a new room
router.post("/", async (req, res) => {
    const result = createRoomSchema.safeParse(req.body);
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

    const { questionIds, timerSeconds, language } = result.data;

    try {
        // Verify all questions exist and are active
        const questions = await prisma.question.findMany({
            where: { id: { in: questionIds }, isActive: true },
        });

        if (questions.length !== questionIds.length) {
            res.status(400).json({
                success: false,
                error: {
                    code: "INVALID_QUESTIONS",
                    message: "One or more questions not found",
                    statusCode: 400,
                },
            });
            return;
        }

        // Create room + creator as first participant in one transaction
        const room = await prisma.$transaction(async (tx) => {
            const r = await tx.room.create({
                data: {
                    creatorId: req.user!.id,
                    timerSeconds,
                    language,
                    questions: {
                        create: questionIds.map((qId) => ({ questionId: qId })),
                    },
                },
            });

            await tx.roomParticipant.create({
                data: { roomId: r.id, userId: req.user!.id, isActive: true },
            });

            return r;
        });

        logger.info(
            { roomId: room.id, creatorId: req.user!.id },
            "Room Created",
        );
        res.status(201).json({
            success: true,
            data: {
                room: {
                    id: room.id,
                    language: room.language,
                    timerSeconds: room.timerSeconds,
                },
            },
        });
    } catch (err) {
        logger.error(err, "POST /rooms failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to create room",
                statusCode: 500,
            },
        });
    }
});

// POST /api/v1/rooms/:id/join

router.post("/:id/join", async (req, res) => {
    const roomId = req.params.id;
    const userId = req.user!.id;

    try {
        const result = await prisma.$transaction(async (tx) => {
            const room = await tx.room.findUnique({
                where: { id: roomId },
                include: { participants: { where: { isActive: true } } },
            });

            if (!room) {
                return {
                    error: {
                        code: "ROOM_NOT_FOUND",
                        message: "Room not found",
                        statusCode: 404,
                    },
                };
            }
            if (room.status !== "ACTIVE") {
                return {
                    error: {
                        code: "ROOM_ENDED",
                        message: "Room has ended",
                        statusCode: 400,
                    },
                };
            }

            const alreadyIn = room.participants.some(
                (p) => p.userId === userId,
            );
            if (!alreadyIn && room.participants.length >= room.maxUsers) {
                return {
                    error: {
                        code: "ROOM_FULL",
                        message: "Room is full (max 4 users)",
                        statusCode: 409,
                    },
                };
            }

            // upsert - handles re-joins after disconnect
            await tx.roomParticipant.upsert({
                where: { roomId_userId: { roomId, userId } },
                create: { roomId, userId, isActive: true },
                update: { isActive: true, leftAT: null },
            });

            return { room };
        });
        if ("error" in result) {
            res.status(result.error?.statusCode as number).json({
                success: false,
                error: result.error,
            });
            return;
        }

        // Return full room with participants + questions
        const fullRoom = await prisma.room.findUnique({
            where: { id: roomId },
            include: {
                participants: {
                    where: { isActive: true },
                    include: { user: { select: { id: true, username: true } } },
                },
                questions: {
                    include: { question: true },
                },
                creator: {
                    select: { id: true, username: true },
                },
            },
        });

        res.json({ success: true, data: { room: fullRoom } });
    } catch (err) {
        logger.error(err, "POST /rooms/:id/join failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to join room",
                statusCode: 500,
            },
        });
    }
});

// GET /api/v1/rooms/:id - room details
router.get("/:id", async (req, res) => {
    try {
        const room = await prisma.room.findUnique({
            where: { id: req.params.id },
            include: {
                participants: {
                    where: { isActive: true },
                    include: { user: { select: { id: true, username: true } } },
                },
                questions: { include: { question: true } },
                creator: { select: { id: true, username: true } },
            },
        });

        if (!room) {
            res.status(404).json({
                success: true,
                error: {
                    code: "NOT_FOUND",
                    message: "Room not found",
                    statusCode: 404,
                },
            });
            return;
        }

        res.json({ success: true, data: { room } });
    } catch (err) {
        logger.error(err, "GET /rooms/:id failed");
        res.status(500).json({
            success: true,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch room",
                statusCode: 500,
            },
        });
    }
});

// GET /api/v1/rooms - user's rooms
router.get("/", async (req, res) => {
    try {
        const participations = await prisma.roomParticipant.findMany({
            where: { userId: req.user!.id },
            include: {
                room: {
                    include: {
                        creator: { select: { id: true, username: true } },
                        _count: { select: { participants: true } },
                    },
                },
            },
            orderBy: {
                joinedAt: "desc",
            },
            take: 20,
        });
        const rooms = participations.map((p) => p.room);
        res.json({ success: true, data: { rooms } });
    } catch (err) {
        logger.error(err, "GET /rooms failed");
        res.status(500).json({
            success: false,
            error: {
                code: "NETWORK_ERROR",
                message: "Failed to fetch rooms",
                statusCode: 500,
            },
        });
    }
});

export default router;
