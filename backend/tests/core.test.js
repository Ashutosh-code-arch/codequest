const test = require("node:test");
const assert = require("node:assert/strict");

const { wrapWithDriver } = require("../dist/services/executions/driver.js");
const {
    getRemainingRoomSeconds,
} = require("../dist/services/rooms/timing.js");
const { createRoomSchema } = require("../dist/validators/room.js");

test("restores a room timer from its persisted start time", () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T00:10:00.000Z").getTime();
    assert.equal(getRemainingRoomSeconds(startedAt, 3600, now), 3000);
});

test("never restores a negative room timer", () => {
    const startedAt = new Date("2026-01-01T00:00:00.000Z");
    const now = new Date("2026-01-01T02:00:00.000Z").getTime();
    assert.equal(getRemainingRoomSeconds(startedAt, 3600, now), 0);
});

test("room validation rejects more than five questions", () => {
    const questionIds = Array.from(
        { length: 6 },
        (_, index) => `00000000-0000-4000-8000-${String(index).padStart(12, "0")}`,
    );
    const result = createRoomSchema.safeParse({
        questionIds,
        timerSeconds: 3600,
        language: "JAVASCRIPT",
    });
    assert.equal(result.success, false);
});

test("driver wrapping inserts the submitted code", () => {
    assert.equal(
        wrapWithDriver("function solve() {}", "before\n{{USER_CODE}}\nafter", "JAVASCRIPT"),
        "before\nfunction solve() {}\nafter",
    );
});
