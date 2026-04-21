import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import {
    createQuestionSchema,
    updateQuestionSchema,
} from "../validators/question";

const router = Router();

//All admin routes require authenticate + requireAdmin
router.use(authenticate, requireAdmin);

//Get /api/v1/admin/users
router.get("/users", async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(100, Math.max(1, Number(req.query.limit ?? 20)));
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                    createdAt: true,
                },
            }),
            prisma.user.count(),
        ]);

        res.json({
            success: true,
            data: {
                users,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        logger.error(err, "GET /admin/users failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch users",
                statusCode: 500,
            },
        });
    }
});

// ---- Questions -------------

// GET /api/v1/admin/questions?page=1&limit=20&difficulty=EASY

router.get("/questions", async (req, res) => {
    try {
        const page = Math.max(1, Number(req.query.page ?? 1));
        const limit = Math.min(100, Number(req.query.limit ?? 20));
        const skip = (page - 1) * limit;
        const difficulty = req.query.difficulty as string | undefined;
        const search = req.query.search as string | undefined;

        const where = {
            isActive: true,
            ...(difficulty ? { difficulty } : {}),
            ...(search
                ? { title: { contains: search, node: "insensitive" as const } }
                : {}),
        };

        const [questions, total] = await Promise.all([
            prisma.question.findMany({
                where,
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                include: { _count: { select: { testCases: true } } },
            }),
            prisma.question.count({ where }),
        ]);

        res.json({
            success: true,
            data: {
                questions,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        logger.error(err, "GET /admin/questions failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch questions",
                statusCode: 500,
            },
        });
    }
});

// GET /api/v1/admin/questions/:id (include test cases)
router.get("/questions/:id", async (req, res) => {
    try {
        const question = await prisma.question.findUnique({
            where: { id: req.params.id },
            include: { testCases: { orderBy: { id: "asc" } } },
        });
        if (!question) {
            res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Question not found",
                    statusCode: 404,
                },
            });
            return;
        }
        return res.json({ success: true, data: { question } });
    } catch (err) {
        logger.error(err, "GET /admin/questions/:id failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch question",
                statusCode: 500,
            },
        });
    }
});

// POST /api/v1/admin/questions
router.post("/questions", async (req, res) => {
    const result = createQuestionSchema.safeParse(req.body);
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
    try {
        const question = await prisma.question.create({
            data: { ...result.data, createdById: req.user!.id },
        });
        logger.info(
            { questionId: question.id, adminId: req.user!.id },
            "Question created",
        );
        res.status(201).json({ success: true, data: { question } });
    } catch (err) {
        logger.error(err, "POST /admin/questions failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to create question",
                statusCode: 500,
            },
        });
    }
});

// PUT /api/v1/admin/questions/:id

router.put("/questions/:id", async (req, res) => {
    const result = updateQuestionSchema.safeParse(req.body);
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

    try {
        const question = await prisma.question.update({
            where: { id: req.params.id },
            data: result.data,
        });
        logger.info({ questionId: question.id }, "Question updated");
        res.json({ success: true, data: { question } });
    } catch (err: unknown) {
        const isNotFound = (err as { code?: string }).code === "P2025";
        if (isNotFound) {
            res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Question not found",
                    statusCode: 404,
                },
            });
            return;
        }
        logger.error(err, "PUT /admin/questions/:id failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to update question",
                statusCode: 500,
            },
        });
    }
});

// DELETE /api/v1/admin/questions/:id (soft delete - sets isActive=false)
router.delete("/questions/:id", async (req, res) => {
    try {
        await prisma.question.update({
            where: { id: req.params.id },
            data: { isActive: false },
        });
        logger.info(
            { questionId: req.params.id, adminId: req.user!.id },
            "Question soft-delted",
        );
        res.json({ success: true, data: { message: "Question deleted" } });
    } catch (err: unknown) {
        const isNotFound = (err as { code?: string }).code === "P2025";
        if (isNotFound) {
            res.status(404).json({
                success: false,
                error: { code: "NOT_FOUND", message: "Question not found" },
            });
            return;
        }
        logger.error(err, "DELETE /admin/questions/:id failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to delete question",
                statusCode: 500,
            },
        });
    }
});

// -------------------- Test Cases -------------------------------
import {
    createTestCaseSchema,
    updateTestCaseSchema,
} from "../validators/question";

// POST /api/v1/admin/questions/:id/testCases
router.post("/questions/:id/testcases", async (req, res) => {
    const result = createTestCaseSchema.safeParse(req.body);
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

    try {
        // verify question exists first
        const question = await prisma.question.findUnique({
            where: { id: req.params.id },
        });
        if (!question) {
            res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Question not found",
                    statusCode: 404,
                },
            });
            return;
        }

        const testCase = await prisma.testCase.create({
            data: { ...result.data, questionId: req.params.id },
        });
        logger.info(
            { testCaseId: testCase.id, questionId: req.params.id },
            "Test case created",
        );
        res.status(201).json({ success: true, data: { testCase } });
    } catch (err) {
        logger.error(err, "POST /admin/question/:id/testcases failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to create test case",
                statusCode: 500,
            },
        });
    }
});

// PUT /api/v1/admin/testCases/:id
router.put("/testcases/:id", async (req, res) => {
    const result = updateTestCaseSchema.safeParse(req.body);
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

    try {
        const testCase = await prisma.testCase.update({
            where: { id: req.params.id },
            data: result.data,
        });
        res.json({ success: true, data: { testCase } });
    } catch (err: unknown) {
        const isNotFound = (err as { code?: string }).code === "P2025";
        if (isNotFound) {
            res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Test case not found",
                    statusCode: 404,
                },
            });
            return;
        }
        logger.error(err, "PUT /admin/testcases/:id failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to update test case",
            },
        });
    }
});

// DELETE /api/v1/admin/testcases/:id
router.delete("/testcases/:id", async (req, res) => {
    try {
        await prisma.testCase.delete({ where: { id: req.params.id } });
        logger.info({ testCaseId: req.params.id }, "Test case deleted");
        res.json({ success: true, data: { message: "Test case deleted" } });
    } catch (err: unknown) {
        const isNotFound = (err as { code?: string }).code === "P2025";
        if (isNotFound) {
            res.status(404).json({
                success: false,
                error: {
                    code: "NOT_FOUND",
                    message: "Test case not found",
                    statusCode: 404,
                },
            });
            return;
        }
        logger.error(err, "DELETE /admin/testcases/:id failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch test case",
                statusCode: 500,
            },
        });
    }
});

export default router;
