import assert from "node:assert/strict";
import { io } from "socket.io-client";
import * as Y from "yjs";
import * as syncProtocol from "y-protocols/sync";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";

const apiBase = process.env.E2E_API_URL ?? "http://127.0.0.1:4000";
const socketUrl = process.env.E2E_WS_URL ?? apiBase;
const adminEmail = process.env.E2E_ADMIN_EMAIL;
const adminPassword = process.env.E2E_ADMIN_PASSWORD;

if (!adminEmail || !adminPassword) {
    throw new Error("Set E2E_ADMIN_EMAIL and E2E_ADMIN_PASSWORD");
}

const suffix = `${Date.now()}`;
const password = "E2eUser123";

async function request(path, { token, method = "GET", body } = {}) {
    const response = await fetch(`${apiBase}${path}`, {
        method,
        headers: {
            ...(body ? { "Content-Type": "application/json" } : {}),
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        ...(body ? { body: JSON.stringify(body) } : {}),
    });
    const payload = await response.json();
    return { response, payload };
}

async function expectStatus(path, options, status) {
    const result = await request(path, options);
    assert.equal(
        result.response.status,
        status,
        `${options?.method ?? "GET"} ${path}: ${JSON.stringify(result.payload)}`,
    );
    return result.payload;
}

function once(socket, event, predicate = () => true, timeoutMs = 8_000) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timed out waiting for ${event}`));
        }, timeoutMs);
        function handler(value) {
            if (!predicate(value)) return;
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(value);
        }
        socket.on(event, handler);
    });
}

async function waitUntil(check, label, timeoutMs = 8_000) {
    const started = Date.now();
    while (Date.now() - started < timeoutMs) {
        if (check()) return;
        await new Promise((resolve) => setTimeout(resolve, 25));
    }
    throw new Error(`Timed out waiting for ${label}`);
}

function createSocket(token) {
    return io(socketUrl, {
        autoConnect: false,
        transports: ["websocket"],
        auth: { token },
    });
}

async function connectAndJoin(socket, roomId) {
    const connected = once(socket, "connect");
    socket.connect();
    await connected;
    const participants = once(socket, "room:existing-participants");
    socket.emit("room:join", { roomId });
    return participants;
}

function attachYDoc(socket) {
    const doc = new Y.Doc();
    const onMessage = (data) => {
        const decoder = decoding.createDecoder(new Uint8Array(data));
        if (decoding.readVarUint(decoder) !== 0) return;
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.readSyncMessage(decoder, encoder, doc, null);
        const reply = encoding.toUint8Array(encoder);
        if (reply.length > 1) socket.emit("yjs:message", reply.buffer);
    };
    const onUpdate = (update) => {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.writeUpdate(encoder, update);
        socket.emit("yjs:message", encoding.toUint8Array(encoder).buffer);
    };
    socket.on("yjs:message", onMessage);
    doc.on("update", onUpdate);
    return {
        doc,
        dispose() {
            socket.off("yjs:message", onMessage);
            doc.off("update", onUpdate);
            doc.destroy();
        },
    };
}

const sockets = [];
let cleanupAdminToken;
let cleanupQuestionId;
try {
    const health = await expectStatus("/health", {}, 200);
    assert.equal(health.status, "ok");

    async function register(label) {
        const payload = await expectStatus(
            "/api/v1/auth/register",
            {
                method: "POST",
                body: {
                    email: `${label}-${suffix}@example.test`,
                    username: `${label}_${suffix}`.slice(0, 20),
                    password,
                },
            },
            201,
        );
        return payload.data;
    }

    const creator = await register("creator");
    const collaborator = await register("collab");
    const outsider = await register("outsider");
    const admin = (
        await expectStatus(
            "/api/v1/auth/login",
            { method: "POST", body: { email: adminEmail, password: adminPassword } },
            200,
        )
    ).data;
    cleanupAdminToken = admin.token;

    await expectStatus("/api/v1/admin/users", { token: creator.token }, 403);
    const question = (
        await expectStatus(
            "/api/v1/admin/questions",
            {
                token: admin.token,
                method: "POST",
                body: {
                    title: `E2E output test ${suffix}`,
                    description: "Print the number forty two to standard output.",
                    difficulty: "EASY",
                    tags: ["e2e"],
                    starterCode: { JAVASCRIPT: "console.log(42);" },
                },
            },
            201,
        )
    ).data.question;
    cleanupQuestionId = question.id;

    await expectStatus(
        `/api/v1/admin/questions/${question.id}/testcases`,
        {
            token: admin.token,
            method: "POST",
            body: {
                input: "ignored",
                expectedOutput: "42",
                isHidden: false,
                timeLimit: 2000,
                memoryLimit: 256,
            },
        },
        201,
    );

    const room = (
        await expectStatus(
            "/api/v1/rooms",
            {
                token: creator.token,
                method: "POST",
                body: {
                    questionIds: [question.id],
                    timerSeconds: 300,
                    language: "JAVASCRIPT",
                },
            },
            201,
        )
    ).data.room;

    await expectStatus(`/api/v1/rooms/${room.id}`, { token: outsider.token }, 403);
    await expectStatus(
        `/api/v1/rooms/${room.id}/join`,
        { token: collaborator.token, method: "POST" },
        200,
    );
    const details = await expectStatus(
        `/api/v1/rooms/${room.id}`,
        { token: collaborator.token },
        200,
    );
    assert.equal(details.data.room.questions[0].questionId, question.id);

    await expectStatus(
        "/api/v1/submit",
        {
            token: outsider.token,
            method: "POST",
            body: {
                code: "console.log(42);",
                language: "JAVASCRIPT",
                questionId: question.id,
                roomId: room.id,
            },
        },
        403,
    );

    const outsiderSocket = createSocket(outsider.token);
    sockets.push(outsiderSocket);
    const outsiderConnected = once(outsiderSocket, "connect");
    outsiderSocket.connect();
    await outsiderConnected;
    const joinRejected = once(
        outsiderSocket,
        "error",
        (error) => error?.code === "JOIN_REQUIRED",
    );
    outsiderSocket.emit("room:join", { roomId: room.id });
    await joinRejected;

    const creatorSocket = createSocket(creator.token);
    const collaboratorSocket = createSocket(collaborator.token);
    sockets.push(creatorSocket, collaboratorSocket);
    await connectAndJoin(creatorSocket, room.id);
    await connectAndJoin(collaboratorSocket, room.id);

    const chatOnCreator = once(
        creatorSocket,
        "chat:new-message",
        (message) => message?.content === "realtime-e2e",
    );
    const chatOnCollaborator = once(
        collaboratorSocket,
        "chat:new-message",
        (message) => message?.content === "realtime-e2e",
    );
    creatorSocket.emit("chat:message", { roomId: room.id, content: "realtime-e2e" });
    await Promise.all([chatOnCreator, chatOnCollaborator]);

    const creatorY = attachYDoc(creatorSocket);
    const collaboratorY = attachYDoc(collaboratorSocket);
    creatorSocket.emit("yjs:sync-request", { questionId: question.id });
    collaboratorSocket.emit("yjs:sync-request", { questionId: question.id });
    await new Promise((resolve) => setTimeout(resolve, 100));
    creatorY.doc.getText("monaco").insert(0, "console.log(42);");
    await waitUntil(
        () => collaboratorY.doc.getText("monaco").toString() === "console.log(42);",
        "collaborative JavaScript update",
    );

    const languageChangedA = once(
        creatorSocket,
        "language:changed",
        (value) => value?.language === "PYTHON",
    );
    const languageChangedB = once(
        collaboratorSocket,
        "language:changed",
        (value) => value?.language === "PYTHON",
    );
    creatorSocket.emit("language:change", { roomId: room.id, language: "PYTHON" });
    await Promise.all([languageChangedA, languageChangedB]);
    creatorY.dispose();
    collaboratorY.dispose();

    const creatorPython = attachYDoc(creatorSocket);
    const collaboratorPython = attachYDoc(collaboratorSocket);
    creatorSocket.emit("yjs:sync-request", { questionId: question.id });
    collaboratorSocket.emit("yjs:sync-request", { questionId: question.id });
    await new Promise((resolve) => setTimeout(resolve, 100));
    creatorPython.doc.getText("monaco").insert(0, "print(42)");
    await waitUntil(
        () => collaboratorPython.doc.getText("monaco").toString() === "print(42)",
        "collaborative Python update",
    );

    collaboratorSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await connectAndJoin(collaboratorSocket, room.id);

    const execution = await expectStatus(
        "/api/v1/execute",
        {
            token: creator.token,
            method: "POST",
            body: { code: "console.log(7);", language: "JAVASCRIPT" },
        },
        200,
    );
    assert.equal(execution.data.status, "Accepted");
    assert.equal(execution.data.stdout.trim(), "7");

    const submission = await expectStatus(
        "/api/v1/submit",
        {
            token: creator.token,
            method: "POST",
            body: {
                code: "console.log(42);",
                language: "JAVASCRIPT",
                questionId: question.id,
                roomId: room.id,
            },
        },
        200,
    );
    assert.equal(submission.data.status, "ACCEPTED");

    const history = await expectStatus("/api/v1/history", { token: creator.token }, 200);
    assert.ok(history.data.rooms.some((item) => item.id === room.id));

    await expectStatus(
        `/api/v1/rooms/${room.id}/end`,
        { token: collaborator.token, method: "POST" },
        403,
    );
    await expectStatus(
        `/api/v1/rooms/${room.id}/end`,
        { token: creator.token, method: "POST" },
        200,
    );
    await expectStatus(
        `/api/v1/rooms/${room.id}/join`,
        { token: outsider.token, method: "POST" },
        400,
    );

    creatorPython.dispose();
    collaboratorPython.dispose();
    console.log(
        JSON.stringify(
            {
                ok: true,
                roomId: room.id,
                questionId: question.id,
                checks: [
                    "health/auth/admin authorization",
                    "question/testcase creation",
                    "room create/join/access/end",
                    "socket join authorization/reconnect",
                    "chat broadcast",
                    "Yjs JavaScript/Python collaboration",
                    "Judge0 execute/submit",
                    "history",
                ],
            },
            null,
            2,
        ),
    );
} finally {
    for (const socket of sockets) socket.disconnect();
    if (cleanupAdminToken && cleanupQuestionId) {
        await request(`/api/v1/admin/questions/${cleanupQuestionId}`, {
            token: cleanupAdminToken,
            method: "DELETE",
        }).catch(() => undefined);
    }
}
