import { logger } from "../lib/logger";
import { prisma } from "../lib/prisma";
import { TypedServer } from "./types";

const roomTimers = new Map<string, number>();
const roomIntervals = new Map<string, NodeJS.Timeout>();

export function getRoomTimer(roomId: string): number | null {
    const val = roomTimers.get(roomId);
    return val !== undefined ? val : null;
}

export function startRoomTimer(
    io: TypedServer,
    roomId: string,
    durationSeconds: number,
) {
    // Don't start if already running
    if (roomIntervals.has(roomId)) {
        logger.debug(
            { roomId },
            "Timer already running — skipping duplicate start",
        );
        return;
    }

    if (durationSeconds <= 0) {
        void expireRoom(io, roomId);
        return;
    }

    roomTimers.set(roomId, durationSeconds);

    const interval = setInterval(async () => {
        const current = roomTimers.get(roomId);
        if (current === undefined) {
            clearInterval(interval);
            roomIntervals.delete(roomId);
            return;
        }

        const next = current - 1;
        roomTimers.set(roomId, next);
        io.to(roomId).emit("timer:tick", { secondsRemaining: next });

        if (next <= 0) {
            clearInterval(interval);
            roomIntervals.delete(roomId);
            roomTimers.delete(roomId);

            await expireRoom(io, roomId);
        }
    }, 1000);

    roomIntervals.set(roomId, interval);
    logger.info({ roomId, durationSeconds }, "Room timer started");
}

async function expireRoom(io: TypedServer, roomId: string) {
    try {
        const { saveAllRoomSnapshots, destroyRoomDoc } =
            await import("./yjsHandlers");
        await saveAllRoomSnapshots(roomId);

        const result = await prisma.room.updateMany({
            where: { id: roomId, status: "ACTIVE" },
            data: { status: "ENDED", endedAt: new Date() },
        });

        if (result.count === 0) {
            destroyRoomDoc(roomId);
            return;
        }

        io.to(roomId).emit("room:time-up");
        const { evictRoomSockets } = await import("./roomHandlers");
        await evictRoomSockets(io, roomId);
        destroyRoomDoc(roomId);
        logger.info({ roomId }, "Room ended: timer expired");
    } catch (err) {
        logger.error(err, "Failed to end room cleanly");
    }
}

export function stopRoomTimer(roomId: string) {
    const interval = roomIntervals.get(roomId);
    if (interval) {
        clearInterval(interval);
        roomIntervals.delete(roomId);
    }
    roomTimers.delete(roomId);
    logger.debug({ roomId }, "Room timer stopped");
}
