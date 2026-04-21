import z from "zod";

const difficulties = ["EASY", "MEDIUM", "HARD"] as const;

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
});

export const updateQuestionSchema = createQuestionSchema.partial();

export const createTestCaseSchema = z.object({
    input: z.string().min(1, "Input is required"),
    expectedOutput: z.string().min(1, "Expected output is required"),
    isHidden: z.boolean().default(false),
    timeLimit: z.number().int().min(500).max(10000).default(2000),
    memoryLimit: z.number().int().min(64).max(512).default(256),
});

export const updateTestCaseSchema = createTestCaseSchema.partial();

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>;
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>;
export type CreateTestCaseInput = z.infer<typeof createTestCaseSchema>;
export type UpdateTestCaseInput = z.infer<typeof updateTestCaseSchema>;
