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

function collect(socket, event, count, onValue, timeoutMs = 8_000) {
    return new Promise((resolve, reject) => {
        const values = [];
        const timer = setTimeout(() => {
            socket.off(event, handler);
            reject(new Error(`Timed out collecting ${event}`));
        }, timeoutMs);
        function handler(value) {
            values.push(value);
            onValue?.(value);
            if (values.length !== count) return;
            clearTimeout(timer);
            socket.off(event, handler);
            resolve(values);
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

function attachYDoc(socket, documentKey) {
    const doc = new Y.Doc();
    const onMessage = (payload) => {
        if (payload?.documentKey !== documentKey) return;
        const decoder = decoding.createDecoder(new Uint8Array(payload.update));
        if (decoding.readVarUint(decoder) !== 0) return;
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.readSyncMessage(decoder, encoder, doc, null);
        const reply = encoding.toUint8Array(encoder);
        if (reply.length > 1) {
            socket.emit("yjs:message", {
                documentKey,
                update: reply.buffer,
            });
        }
    };
    const onUpdate = (update) => {
        const encoder = encoding.createEncoder();
        encoding.writeVarUint(encoder, 0);
        syncProtocol.writeUpdate(encoder, update);
        socket.emit("yjs:message", {
            documentKey,
            update: encoding.toUint8Array(encoder).buffer,
        });
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

function replaceCode(doc, code) {
    const text = doc.getText("monaco");
    doc.transact(() => {
        text.delete(0, text.length);
        text.insert(0, code);
    });
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
    assert.deepEqual(
        Object.keys(question.starterCode).sort(),
        ["C", "CPP", "JAVA", "JAVASCRIPT", "PYTHON"].sort(),
    );
    assert.deepEqual(
        Object.keys(question.driverCode).sort(),
        ["C", "CPP", "JAVA", "JAVASCRIPT", "PYTHON"].sort(),
    );

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

    const creatorVideoPeers = once(creatorSocket, "webrtc:existing-peers");
    creatorSocket.emit("webrtc:join", { roomId: room.id });
    assert.equal((await creatorVideoPeers).peers.length, 0);

    const collaboratorVideoPeers = once(
        collaboratorSocket,
        "webrtc:existing-peers",
    );
    collaboratorSocket.emit("webrtc:join", { roomId: room.id });
    const peerList = (await collaboratorVideoPeers).peers;
    assert.equal(peerList.length, 1);
    assert.equal(peerList[0].socketId, creatorSocket.id);
    assert.equal(peerList[0].username, creator.user.username);

    const forwardedSignal = once(
        creatorSocket,
        "webrtc:signal",
        (value) => value?.from === collaboratorSocket.id,
    );
    collaboratorSocket.emit("webrtc:signal", {
        to: creatorSocket.id,
        signal: { type: "offer", sdp: "e2e-offer" },
    });
    const signal = await forwardedSignal;
    assert.equal(signal.username, collaborator.user.username);

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

    const javaScriptDocumentKey = `${room.id}:JAVASCRIPT:${question.id}`;
    const pythonDocumentKey = `${room.id}:PYTHON:${question.id}`;
    const creatorY = attachYDoc(creatorSocket, javaScriptDocumentKey);
    const collaboratorY = attachYDoc(collaboratorSocket, javaScriptDocumentKey);
    creatorSocket.emit("yjs:sync-request", { questionId: question.id });
    collaboratorSocket.emit("yjs:sync-request", { questionId: question.id });
    await waitUntil(
        () => creatorY.doc.getText("monaco").toString() === "console.log(42);",
        "initial JavaScript starter code",
    );
    replaceCode(creatorY.doc, "console.log(41 + 1);");
    await waitUntil(
        () =>
            collaboratorY.doc.getText("monaco").toString() ===
            "console.log(41 + 1);",
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
    replaceCode(creatorY.doc, "console.log(40 + 2);");
    await Promise.all([languageChangedA, languageChangedB]);
    creatorY.dispose();
    collaboratorY.dispose();

    const creatorPython = attachYDoc(creatorSocket, pythonDocumentKey);
    const collaboratorPython = attachYDoc(collaboratorSocket, pythonDocumentKey);
    creatorSocket.emit("yjs:sync-request", { questionId: question.id });
    collaboratorSocket.emit("yjs:sync-request", { questionId: question.id });
    await waitUntil(
        () => creatorPython.doc.getText("monaco").toString().includes("def solve"),
        "default Python starter code",
    );
    replaceCode(creatorPython.doc, "print(42)");
    await waitUntil(
        () => collaboratorPython.doc.getText("monaco").toString() === "print(42)",
        "collaborative Python update",
    );

    const changedBackA = once(
        creatorSocket,
        "language:changed",
        (value) => value?.language === "JAVASCRIPT",
    );
    const changedBackB = once(
        collaboratorSocket,
        "language:changed",
        (value) => value?.language === "JAVASCRIPT",
    );
    creatorSocket.emit("language:change", {
        roomId: room.id,
        language: "JAVASCRIPT",
    });
    await Promise.all([changedBackA, changedBackB]);
    creatorPython.dispose();
    collaboratorPython.dispose();

    const creatorJavaScriptAgain = attachYDoc(
        creatorSocket,
        javaScriptDocumentKey,
    );
    const collaboratorJavaScriptAgain = attachYDoc(
        collaboratorSocket,
        javaScriptDocumentKey,
    );
    creatorSocket.emit("yjs:sync-request", { questionId: question.id });
    collaboratorSocket.emit("yjs:sync-request", { questionId: question.id });
    await waitUntil(
        () =>
            collaboratorJavaScriptAgain.doc.getText("monaco").toString() ===
            "console.log(40 + 2);",
        "JavaScript code after switching languages",
    );

    collaboratorJavaScriptAgain.dispose();
    collaboratorSocket.disconnect();
    await new Promise((resolve) => setTimeout(resolve, 150));
    await connectAndJoin(collaboratorSocket, room.id);
    const collaboratorAfterRejoin = attachYDoc(
        collaboratorSocket,
        javaScriptDocumentKey,
    );
    collaboratorSocket.emit("yjs:sync-request", { questionId: question.id });
    await waitUntil(
        () =>
            collaboratorAfterRejoin.doc.getText("monaco").toString() ===
            "console.log(40 + 2);",
        "JavaScript code after leaving and rejoining",
    );

    await new Promise((resolve) => setTimeout(resolve, 1_200));
    const snapshots = await expectStatus(
        `/api/v1/rooms/${room.id}/snapshots`,
        { token: creator.token },
        200,
    );
    assert.ok(
        snapshots.data.snapshots.some(
            (snapshot) =>
                snapshot.language === "JAVASCRIPT" &&
                snapshot.code === "console.log(40 + 2);",
        ),
    );

    creatorJavaScriptAgain.dispose();
    collaboratorAfterRejoin.dispose();

    const rapidLanguages = ["PYTHON", "JAVA", "CPP", "C", "JAVASCRIPT"];
    const rapidChanges = collect(
        creatorSocket,
        "language:changed",
        rapidLanguages.length,
        () =>
            creatorSocket.emit("yjs:sync-request", {
                questionId: question.id,
            }),
    );
    for (const rapidLanguage of rapidLanguages) {
        creatorSocket.emit("language:change", {
            roomId: room.id,
            language: rapidLanguage,
        });
    }
    assert.deepEqual(
        (await rapidChanges).map((change) => change.language),
        rapidLanguages,
    );

    const javaScriptAfterRapidSwitches = attachYDoc(
        creatorSocket,
        javaScriptDocumentKey,
    );
    creatorSocket.emit("yjs:sync-request", { questionId: question.id });
    await waitUntil(
        () =>
            javaScriptAfterRapidSwitches.doc
                .getText("monaco")
                .toString() === "console.log(40 + 2);",
        "JavaScript code after rapid language switches",
    );
    javaScriptAfterRapidSwitches.dispose();
    assert.ok(
        snapshots.data.snapshots.some(
            (snapshot) =>
                snapshot.language === "PYTHON" && snapshot.code === "print(42)",
        ),
    );

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

    const solutions = {
        JAVASCRIPT: "console.log(42);",
        PYTHON: "print(42)",
        JAVA: "public class Main { public static void main(String[] args) { System.out.println(42); } }",
        CPP: "#include <iostream>\nint main() { std::cout << 42 << '\\n'; }",
        C: "#include <stdio.h>\nint main(void) { printf(\"42\\n\"); return 0; }",
    };
    for (const [submissionLanguage, code] of Object.entries(solutions)) {
        const submission = await expectStatus(
            "/api/v1/submit",
            {
                token: creator.token,
                method: "POST",
                body: {
                    code,
                    language: submissionLanguage,
                    questionId: question.id,
                    roomId: room.id,
                },
            },
            200,
        );
        assert.equal(
            submission.data.status,
            "ACCEPTED",
            `${submissionLanguage} submission failed`,
        );
    }

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
                    "WebRTC peer discovery and signaling",
                    "chat broadcast",
                    "Yjs JavaScript/Python collaboration",
                    "per-language starter code and persistence after rejoin",
                    "rapid language switching without cross-language code",
                    "Judge0 execute and five-language submission",
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
