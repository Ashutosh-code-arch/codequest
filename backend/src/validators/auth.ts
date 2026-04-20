import { z } from "zod";
export const registerSchema = z.object({
    email: z.string().email("Invalid email address"),
    username: z
        .string()
        .min(3, "Username must be at least 3 characters")
        .max(20, "Username must be at most 20 characters")
        .regex(
            /^[a-zA-Z0-9_]+$/,
            "Username can only contain letters, numbers, underscores",
        ),
    password: z
        .string()
        .min(8, "Password must be at least 8 characters")
        .max(100, "Password too long"),
});

export const loginSchema = z.object({
    email: z.string().email("Invalid email address"),
    password: z.string().min(1, "Password is required"),
});

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
