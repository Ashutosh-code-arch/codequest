import { Request, Response } from "express";
import prisma from "../services/prisma";

export const getMe = async (req: Request, res: Response) => {
    const { email } = req.user!;
    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
    }

    res.json(user);
};

export const register = async (req: Request, res: Response) => {
    const { email, name, role } = req.body;
    try {
        const user = await prisma.user.upsert({
            where: { email },
            update: { name },
            create: { email, name, role },
        });
        res.status(201).json(user);
    } catch (err) {
        res.status(500).json({ error: "Failed to register user" });
    }
};
