import { Router } from "express";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";

const router = Router();
router.use(authenticate);

// GET /api/v1/history
// Returns user's room history, newest first

router.get("/", async (req, res) => {
    try {
        const userId = req.user!.id;

        const participations = await prisma.roomParticipant.findMany({
            where: { userId },
            orderBy: { joinedAt: "desc" },
            take: 50,
            include: {
                room: {
                    include: {
                        creator: { select: { id: true, username: true } },
                        questions: {
                            include: {
                                question: {
                                    select: {
                                        id: true,
                                        title: true,
                                        difficulty: true,
                                    },
                                },
                            },
                        },
                        _count: {
                            select: { participants: true },
                        },
                    },
                },
            },
        });
        // For each room, get the user's best submission per question
        const rooms = await Promise.all(
            participations.map(async (p) => {
                const roomQuestionIds = p.room.questions.map(
                    (rq) => rq.questionId,
                );
                const submissions = await prisma.submission.findMany({
                    where: {
                        userId,
                        roomId: p.room.id,
                        questionId: { in: roomQuestionIds },
                    },
                    orderBy: { submittedAt: "desc" },
                });

                // Best status per question: ACCEPTED beats WRONG_ANSWER beats ERROR
                const statusPriority: Record<string, number> = {
                    ACCEPTED: 3,
                    WRONG_ANSWER: 2,
                    TLE: 1,
                    MLE: 1,
                    ERROR: 0,
                };

                const bestPerQuestion: Record<string, string> = {};
                submissions.forEach((s) => {
                    const current = bestPerQuestion[s.questionId];
                    if (
                        !current ||
                        (statusPriority[s.status] ?? 0) >
                            (statusPriority[current] ?? 0)
                    ) {
                        bestPerQuestion[s.questionId] = s.status;
                    }
                });

                return {
                    id: p.room.id,
                    status: p.room.status,
                    language: p.room.language,
                    startedAt: p.room.startedAt,
                    endedAt: p.room.endedAt,
                    timerSeconds: p.room.timerSeconds,
                    participantCount: p.room._count.participants,
                    creator: p.room.creator,
                    joinedAt: p.joinedAt,
                    questions: p.room.questions.map((rq) => ({
                        questionId: rq.questionId,
                        title: rq.question.title,
                        difficulty: rq.question.difficulty,
                        myBestStatus: bestPerQuestion[rq.questionId] ?? null,
                    })),
                };
            }),
        );
        res.json({ success: true, data: { rooms } });
    } catch (err) {
        logger.error(err, "GET /history failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch history",
                statusCode: 500,
            },
        });
    }
});

// GET /api/v1/history/:roomId
// Full session detail — submissions, latest snapshot, participants
router.get("/:roomId", async (req, res) => {
    try {
        const userId = req.user!.id;
        const roomId = req.params.roomId;

        // Verify user was in this room
        const participation = await prisma.roomParticipant.findUnique({
            where: { roomId_userId: { roomId, userId } },
        });

        if (!participation) {
            res.status(403).json({
                success: false,
                error: {
                    code: "FORBIDDEN",
                    message: "You were not in this room",
                    statusCode: 403,
                },
            });
            return;
        }

        const [room, submissions, latestSnapshot] = await Promise.all([
            prisma.room.findUnique({
                where: { id: roomId },
                include: {
                    creator: { select: { id: true, username: true } },
                    participants: {
                        include: {
                            user: { select: { id: true, username: true } },
                        },
                    },
                    questions: { include: { question: true } },
                },
            }),
            prisma.submission.findMany({
                where: { roomId, userId },
                orderBy: { submittedAt: "desc" },
                include: { question: { select: { id: true, title: true } } },
            }),
            prisma.codeSnapshot.findFirst({
                where: { roomId },
                orderBy: { savedAt: "desc" },
            }),
        ]);

        if (!room) {
            res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Room not found",
                    statusCode: 404,
                },
            });
            return;
        }

        res.json({
            success: true,
            data: { room, submissions, latestSnapshot },
        });
    } catch (err) {
        logger.error(err, "GET /history/:roomId failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch session detail",
                statusCode: 500,
            },
        });
    }
});

export default router;
