import { Request, Response } from "express";
import { User } from "@prisma/client";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { PrismaClient } from "@prisma/client";

declare global {
    namespace Express {
        interface Request {
            user: User;
        }
    }
}

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET;
const COOKIE_OPTIONS: {
    httpOnly: boolean;
    secure: boolean;
    sameSite: "lax" | "strict" | "none";
    maxAge: number;
} = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
};

export const register = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const hashed = await bcrypt.hash(password, 10);
        const user = await prisma.user.create({
            data: { email, password: hashed },
        });
        const token = jwt.sign({ id: user.id }, JWT_SECRET!, {
            expiresIn: "7d",
        });
        res.cookie("token", token, COOKIE_OPTIONS);
        res.status(201).json({ user });
    } catch (error) {
        res.status(500).json({ error: "Registartion failed" });
    }
};

export const login = async (req: Request, res: Response) => {
    try {
        const { email, password } = req.body;
        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !(await bcrypt.compare(password, user.password))) {
            return res.status(401).json({ error: "Invalid credentials" });
        }
        const token = jwt.sign({ id: user.id }, JWT_SECRET!, {
            expiresIn: "7d",
        });
        res.cookie("token", token, COOKIE_OPTIONS);
        res.status(200).json({ user });
    } catch (error) {
        res.status(500).json({ error: "Login failed" });
    }
};

export const getMe = async (req: Request, res: Response) => {
    try {
        const user = await prisma.user.findUnique({
            where: { id: req.user.id },
            select: { id: true, email: true },
        });
        if (!user) {
            return res.status(404).json({ error: "User not found" });
        }
        res.json({ user });
    } catch (error) {
        res.status(500).json({ errot: "Internal server error" });
    }
};
