import z from "zod";

export const createRoomSchema = z.object({
    questionIds: z
        .array(z.string().uuid())
        .min(1, "Select at least one question")
        .max(5, "Maximum 5 questions per room"),
    timerSeconds: z
        .number()
        .int()
        .min(300, "Minimum 5 minutes")
        .max(14400, "Maximum 4 hours")
        .default(3600),
    language: z
        .enum(["JAVASCRIPT", "PYTHON", "JAVA", "CPP", "C"])
        .default("JAVASCRIPT"),
});

export type CreateRoomInput = z.infer<typeof createRoomSchema>;
