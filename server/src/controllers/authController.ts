import { Request, Response } from "express";
import prisma from "../services/prisma";

export const getMe = async (req: Request, res: Response) => {
    const { email } = req.user!;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.json(user); // ✅ No return statement
};

export const register = async (req: Request, res: Response) => {
    console.log("Register Request:", req.body);
    const { email, name, role } = req.body;
    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { name },
            create: { email, name, role },
        });
        console.log("User created:", user);
        res.status(201).json(user);
    } catch (err) {
        console.error("Register Error:", err);
        res.status(500).json({ error: "Failed to register user" });
    }
};
