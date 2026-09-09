import z from "zod";

const difficulties = ["EASY", "MEDIUM", "HARD"] as const;
const codeValueSchema = z.string().max(100000);
const codeMapSchema = z
    .object({
        JAVASCRIPT: codeValueSchema.optional(),
        PYTHON: codeValueSchema.optional(),
        JAVA: codeValueSchema.optional(),
        CPP: codeValueSchema.optional(),
        C: codeValueSchema.optional(),
    })
    .strict();
const driverCodeMapSchema = codeMapSchema.superRefine((drivers, ctx) => {
    for (const [language, driver] of Object.entries(drivers)) {
        if (!driver?.trim()) continue;
        const placeholders = driver.match(/{{USER_CODE}}/g)?.length ?? 0;
        if (placeholders !== 1) {
            ctx.addIssue({
                code: "custom",
                path: [language],
                message:
                    "Driver code must contain exactly one {{USER_CODE}} placeholder",
            });
        }
    }
});

export const createQuestionSchema = z.object({
    title: z.string().min(5, "Title must be at least 5 characters").max(200),
    description: z
        .string()
        .min(20, "Description must be at least 20 characters"),
    difficulty: z.enum(difficulties, {
        message: "Difficulty must be EASY, MEDIUM or HARD",
    }),
    tags: z
        .array(z.string().min(1).max(30))
        .min(1, "At least one tag required")
        .max(10, "Maximum 10 tags"),
    starterCode: codeMapSchema.optional(),
    driverCode: driverCodeMapSchema.optional(),
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const createTestCaseSchema = z.object({
    input: z.string().max(65536, "Input is too long"),
    expectedOutput: z.string().max(65536, "Expected output is too long"),
    isHidden: z.boolean().default(false),
    timeLimit: z.number().int().min(500).max(10000).default(2000),
    memoryLimit: z.number().int().min(64).max(512).default(256),
});

export const updateTestCaseSchema = createTestCaseSchema.partial();

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
