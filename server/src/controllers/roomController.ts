import { Request, Response } from "express";
import prisma from "../services/prisma";
import { AuthRequest } from "../middleware/auth";

// export const createRoom = async (req: Request, res: Response) => {
//     const { title, language } = req.body;
//     const userId = req.user?.uid;

//     try {
//         const user = await prisma.user.findUnique({
//             where: { email: req.user?.email! },
//         });
//         if (!user) {
//             res.status(404).json({ message: "User not found" });
//             return;
//         }

//         const room = await prisma.codingRoom.create({
//             data: {
//                 title,
//                 language,
//                 hostId: user.id,
//                 participants: {
//                     create: {
//                         userId: user.id,
//                         role: user.role,
//                     },
//                 },
//             },
//             include: { participants: true },
//         });

//         res.status(201).json(room);
//     } catch (error) {
//         console.error(error);
//         res.status(500).json({ message: "Failed to create room" });
//     }
// };

export const createRoom = async (req: AuthRequest, res: Response) => {
    try {
        const { title, language = "javascript" } = req.body;

        if (!title) {
            return res.status(400).json({ message: "Title is required" });
        }

        const user = await prisma.user.findUnique({
            where: { email: req.user?.email! },
        });
        if (!user) {
            res.status(404).json({ message: "User not found" });
            return;
        }

        const roomId = crypto.randomUUID().slice(0, 8);

        const room = await prisma.codingRoom.create({
            data: {
                id: roomId,
                title,
                language,
                hostId: user.id,
                participants: {
                    create: {
                        userId: user.id,
                        role: "CANDIDATE",
                    },
                },
            },
            include: {
                participants: true,
            },
        });

        res.status(201).json(room);
    } catch (err) {
        console.error("Create Room Error:", err);
        res.status(500).json({ message: "Failed to create room" });
    }
};

export const joinRoom = async (req: Request, res: Response) => {
    const { roomId } = req.params;
    const user = await prisma.user.findUnique({
        where: { email: req.user?.email! },
    });

    try {
        const room = await prisma.codingRoom.findUnique({
            where: { id: roomId },
        });
        if (!room) {
            res.status(404).json({ message: "Room not found" });
            return;
        }

        const participant = await prisma.roomParticipant.upsert({
            where: { userId_roomId: { userId: user!.id, roomId } },
            update: {},
            create: {
                userId: user!.id,
                roomId,
                role: user!.role,
            },
        });
        res.status(201).json({ room, participant });
    } catch (error) {
        console.error(error);
        res.status(500).json({ message: "Failed to join room" });
    }
};

export const getRoom = async (req: Request, res: Response) => {
    const { roomId } = req.params;
    try {
        const room = await prisma.codingRoom.findUnique({
            where: { id: roomId },
            include: { participants: { include: { user: true } } },
        });
        if (!room) {
            res.status(404).json({ message: "Room not found" });
            return;
        }
        res.status(202).json({ room });
    } catch (error) {
        res.status(500).json({ message: "Failed to fetch room" });
    }
};
