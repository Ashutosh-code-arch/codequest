export function getRemainingRoomSeconds(
    startedAt: Date,
    durationSeconds: number,
    nowMs = Date.now(),
): number {
    const elapsedSeconds = Math.max(
        0,
        Math.floor((nowMs - startedAt.getTime()) / 1000),
    );
    return Math.max(0, durationSeconds - elapsedSeconds);
}
