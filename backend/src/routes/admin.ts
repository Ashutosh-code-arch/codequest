import { Router } from "express";
import { authenticate, requireAdmin } from "../middleware/auth";
import { prisma } from "../lib/prisma";

const router = Router();

//All admin routes require authenticate + requireAdmin
router.use(authenticate, requireAdmin);

//Get /api/v1/admin/users
router.get("/users", async (req, res) => {
    try {
        const page = Number(req.query.page ?? 1);
        const limit = Number(req.query.limit ?? 20);
        const skip = (page - 1) * limit;

        const [users, total] = await Promise.all([
            prisma.user.findMany({
                skip,
                take: limit,
                orderBy: { createdAt: "desc" },
                select: {
                    id: true,
                    email: true,
                    username: true,
                    role: true,
                    createdAt: true,
                },
            }),
            prisma.user.count(),
        ]);

        res.json({
            success: true,
            data: {
                users,
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit),
            },
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: {
                code: "SERVER_ERROR",
                message: "Failed to fetch users",
                statusCode: 500,
            },
        });
    }
});

export default router;
