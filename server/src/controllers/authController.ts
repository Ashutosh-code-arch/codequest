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
    const { email, name } = req.body;
    const role = "CANDIDATE";
    try {
        // const existingUser = await prisma.user.findUnique({ where: { email } });
        // if (existingUser)
        //     return res.status(200).json({ message: "User already existes." });

        const newUser = await prisma.user.upsert({
            where: { email },
            update: { name },
            create: { email, name, role },
        });
        res.status(201).json(newUser);
    } catch (err) {
        console.error("Register error: ", err);
        res.status(500).json({ error: "Failed to register user" });
    }
};
