import { Router } from "express";
import rateLimit from "express-rate-limit";
import { authenticate } from "../middleware/auth";
import { prisma } from "../lib/prisma";
import { logger } from "../lib/logger";
import { z } from "zod";
import { judge0Execute } from "../services/executions/judge0";
import { SupportedLanguage } from "../services/executions/types";

const router = Router();
router.use(authenticate);

const SUPPORTED_LANGUAGES = [
    "JAVASCRIPT",
    "PYTHON",
    "JAVA",
    "CPP",
    "C",
] as const;

// ── Rate limiter: 10 executions per minute per user ───────────────────────
const executionLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 10,
    keyGenerator: (req) => req.user?.id ?? req.ip ?? "unknown",
    standardHeaders: true,
    legacyHeaders: false,
    message: {
        success: false,
        error: {
            code: "RATE_LIMITED",
            message: "Too many executions — max 10 per minute",
            statusCode: 429,
        },
    },
});

// ── Validators ────────────────────────────────────────────────────────────
const executeSchema = z.object({
    code: z.string().min(1, "Code is required").max(65536, "Code too long"),
    language: z.enum(SUPPORTED_LANGUAGES),
    stdin: z.string().max(65536).optional(),
});

const submitSchema = z.object({
    code: z.string().min(1).max(65536),
    language: z.enum(SUPPORTED_LANGUAGES),
    questionId: z.string().uuid(),
    roomId: z.string().optional(),
});

// ── POST /api/v1/execute ─────────────────────────────────────────────────
// "Run" button — arbitrary stdin, no test cases
router.post("/execute", executionLimiter, async (req, res) => {
    const result = executeSchema.safeParse(req.body);
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

    const { code, language, stdin } = result.data;

    try {
        const execResult = await judge0Execute({
            code,
            language: language as SupportedLanguage,
            stdin,
        });

        logger.debug({ userId: req.user!.id, language }, "Code executed");

        res.json({ success: true, data: execResult });
    } catch (err) {
        logger.error(err, "POST /execute failed");
        res.status(500).json({
            success: false,
            error: {
                code: "EXECUTION_FAILED",
                message: "Code execution failed",
                statusCode: 500,
            },
        });
    }
});

// ── POST /api/v1/submit ──────────────────────────────────────────────────
// "Submit" button — runs against all test cases
router.post("/submit", executionLimiter, async (req, res) => {
    const result = submitSchema.safeParse(req.body);
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

    const { code, language, questionId, roomId } = result.data;

    try {
        // Fetch all test cases for this question
        const testCases = await prisma.testCase.findMany({
            where: { questionId },
            orderBy: { id: "asc" },
        });

        if (!testCases.length) {
            res.status(400).json({
                success: false,
                error: {
                    code: "NO_TEST_CASES",
                    message: "This question has no test cases",
                    statusCode: 400,
                },
            });
            return;
        }

        // Run all test cases in parallel (max 5 concurrent)
        const CHUNK_SIZE = 5;
        const allResults = [];

        for (let i = 0; i < testCases.length; i += CHUNK_SIZE) {
            const chunk = testCases.slice(i, i + CHUNK_SIZE);
            const chunkResults = await Promise.all(
                chunk.map(async (tc) => {
                    try {
                        const execResult = await judge0Execute({
                            code,
                            language: language as SupportedLanguage,
                            stdin: tc.input,
                            timeLimit: tc.timeLimit,
                            memoryLimit: tc.memoryLimit,
                        });

                        // Trim both sides before comparing — trailing newlines cause false failures
                        const passed =
                            execResult.status === "Accepted" &&
                            execResult.stdout.trim() ===
                                tc.expectedOutput.trim();

                        return {
                            testCaseId: tc.id,
                            passed,
                            // Hide I/O for hidden test cases
                            stdout: tc.isHidden ? null : execResult.stdout,
                            expected: tc.isHidden ? null : tc.expectedOutput,
                            executionMs: execResult.executionMs,
                            status: execResult.status,
                        };
                    } catch {
                        return {
                            testCaseId: tc.id,
                            passed: false,
                            stdout: null,
                            expected: null,
                            executionMs: null,
                            status: "Error",
                        };
                    }
                }),
            );
            allResults.push(...chunkResults);
        }

        const passedCount = allResults.filter((r) => r.passed).length;
        const totalCount = allResults.length;
        const allPassed = passedCount === totalCount;

        // Determine overall status
        const hastle = allResults.some(
            (r) => r.status === "Time Limit Exceeded",
        );
        const hasMle = allResults.some((r) => r.status?.includes("Memory"));
        const hasErr = allResults.some(
            (r) => r.status === "Error" || r.status?.includes("Runtime"),
        );

        let overallStatus:
            | "ACCEPTED"
            | "WRONG_ANSWER"
            | "TLE"
            | "MLE"
            | "ERROR";
        if (allPassed) overallStatus = "ACCEPTED";
        else if (hastle) overallStatus = "TLE";
        else if (hasMle) overallStatus = "MLE";
        else if (hasErr) overallStatus = "ERROR";
        else overallStatus = "WRONG_ANSWER";

        // Save submission to DB
        await prisma.submission.create({
            data: {
                userId: req.user!.id,
                questionId,
                roomId: roomId ?? null,
                code,
                language: language as SupportedLanguage,
                status: overallStatus,
                executionMs: allResults[0]?.executionMs ?? null,
            },
        });

        logger.info(
            {
                userId: req.user!.id,
                questionId,
                overallStatus,
                passedCount,
                totalCount,
            },
            "Submission processed",
        );

        res.json({
            success: true,
            data: {
                status: overallStatus,
                passedCount,
                totalCount,
                results: allResults,
            },
        });
    } catch (err) {
        logger.error(err, "POST /submit failed");
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Submission failed",
                statusCode: 500,
            },
        });
    }
});

export default router;
