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
        logger.warn(
            { roomId, durationSeconds },
            "Invalid timer duration — not starting",
        );
        return;
    }

    roomTimers.set(roomId, durationSeconds);
    logger.info({ roomId, durationSeconds }, "Room timer started");

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

            io.to(roomId).emit("room:time-up");

            try {
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

            try {
                const { getOrCreateRoomDoc, saveSnapshot } =
                    await import("./yjsHandlers");
                const state = getOrCreateRoomDoc(roomId);
                await saveSnapshot(roomId, state.doc);
                logger.info({ roomId }, "Final snapshot saved");
            } catch (err) {
                // yjsHandlers may not exist yet (pre-F4) — safe to ignore
                logger.debug(
                    { roomId, err },
                    "Snapshot skipped — yjsHandlers not available",
                );
            }
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
    }
    roomTimers.delete(roomId);
    logger.debug({ roomId }, "Room timer stopped");
}
