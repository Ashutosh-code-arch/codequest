import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
    const email = process.env.ADMIN_EMAIL;
    const password = process.env.ADMIN_PASSWORD;

    if (!email || !password) {
        throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD must be set in .env");
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
        console.log("Admin user already exists - skipping seed");
        return;
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const admin = await prisma.user.create({
        data: {
            email,
            username: "admin",
            passwordHash,
            role: "ADMIN",
        },
    });

    console.log(`Admin user created: ${admin.email}`);
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(() => prisma.$disconnect());
