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
    if (roomIntervals.has(roomId)) return;

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

        // if (next <= 0) {
        //     clearInterval(interval);
        //     roomIntervals.delete(roomId);
        //     roomTimers.delete(roomId);

        //     io.to(roomId).emit("room:time-up");
        // }
        if (next <= 0) {
            clearInterval(interval);
            roomIntervals.delete(roomId);
            roomTimers.delete(roomId);

            io.to(roomId).emit("room:time-up");

            try {
                // Save final snapshot before marking room ended
                const { getOrCreateRoomDoc, saveSnapshot } =
                    await import("./yjsHandlers");
                const state = getOrCreateRoomDoc(roomId);
                await saveSnapshot(roomId, state.doc);

                await prisma.room.update({
                    where: { id: roomId },
                    data: { status: "ENDED", endedAt: new Date() },
                });
                logger.info(
                    { roomId },
                    "Room ended: timer expired, snapshot saved",
                );
            } catch (err) {
                logger.error(err, "Failed to end room cleanly");
            }
        }

        try {
            await prisma.room.update({
                where: { id: roomId },
                data: { status: "ENDED", endedAt: new Date() },
            });
            logger.info({ roomId }, "Room ended: timer expired");
        } catch (err) {
            logger.error(err, "Failed to mark room as ended");
        }
    }, 1000);

    roomIntervals.set(roomId, interval);
    logger.info({ roomId, durationSeconds }, "Room timer started");
}

export function stopRoomTimer(roomId: string) {
    const interval = roomIntervals.get(roomId);
    if (interval) {
        clearInterval(interval);
        roomIntervals.delete(roomId);
        roomTimers.delete(roomId);
    }
}
