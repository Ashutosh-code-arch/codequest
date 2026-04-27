import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import type { Room, Participant } from "../types";
import { getRoomApi } from "../api/room";
import { socket } from "../lib/sockets";
import type { LangKey } from "../config/languages";
import CollabEditor from "../components/Editor/CollabEditor";

function formatTime(seconds: number): string {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

function ParticipantAvatar({
    username,
    isOnline,
}: {
    username: string;
    isOnline: boolean;
}) {
    return (
        <div className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-white/5 transition">
            <div className="relative">
                <div className="w-7 h-7 rounded-full bg-violet-500 flex items-center justify-center">
                    <span className="text-white text-xs font-medium">
                        {username.slice(0, 2).toUpperCase()}
                    </span>
                </div>
                <div
                    className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-gray-900 ${
                        isOnline ? "bg-green-400" : "bg-gray-500"
                    }`}
                />
            </div>
            <span className="text-sm text-gray-300">{username}</span>
        </div>
    );
}

export default function Room() {
    const { id: roomId } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user } = useAuthStore();

    const [room, setRoom] = useState<Room | null>(null);
    const [participants, setParticipants] = useState<Participant[]>([]);
    const [timer, setTimer] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [fullToast, setFullToast] = useState(false);
    const [roomLoaded, setRoomLoaded] = useState(false);
    const [language, setLanguage] = useState<LangKey>("JAVASCRIPT");
    const leftRef = useRef(false);

    // ── Step 1: Load room ─────────────────────────────────────────────────
    const hasInvalidRoom = !roomId;

    function leaveRoom() {
        if (leftRef.current) return; // already left — don't send twice
        leftRef.current = true;
        socket.emit("room:leave", { roomId: roomId! });
    }

    useEffect(() => {
        if (hasInvalidRoom) return;
        // handleResetBeforeFetch();
        let cancelled = false;

        async function fetchRoom() {
            try {
                const r = await getRoomApi(roomId!);
                if (cancelled) return;
                setRoom(r);
                setLanguage(r.language as LangKey);
                setParticipants(r.participants ?? []);
                setTimer(r.timerSeconds);
                setRoomLoaded(true);
            } catch {
                if (cancelled) return;
                setError("Room not found or you do not have access.");
                setRoom(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchRoom();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    useEffect(() => {
        if (!roomId) {
            Promise.resolve().then(() => {
                setError("No room ID in URL");
                setLoading(false);
            });
            return;
        }
    }, [roomId]);

    // ── Step 2: Socket — only runs after room is loaded ───────────────────
    useEffect(() => {
        // roomLoaded is false on first render, true after fetchRoom succeeds
        if (!roomLoaded || !roomId) return;

        console.log("✅ Socket effect running — room is loaded");

        socket.emit("room:join", { roomId });
        leaveRoom();

        socket.on("room:user-joined", ({ user: u, participantCount }) => {
            void participantCount;
            setParticipants((prev) => {
                if (prev.find((p) => p.userId === u.id)) return prev;
                return [
                    ...prev,
                    {
                        id: u.id,
                        roomId: roomId,
                        userId: u.id,
                        isActive: true,
                        joinedAt: new Date().toISOString(),
                        leftAt: null,
                        user: { id: u.id, username: u.username },
                    },
                ];
            });
        });

        socket.on("room:user-left", ({ userId }) => {
            setParticipants((prev) => prev.filter((p) => p.userId !== userId));
        });

        socket.on("room:full", () => {
            setFullToast(true);
            setTimeout(() => setFullToast(false), 4000);
        });

        socket.on("timer:tick", ({ secondsRemaining }) =>
            setTimer(secondsRemaining),
        );
        socket.on("timer:sync", ({ secondsRemaining }) =>
            setTimer(secondsRemaining),
        );

        socket.on("language:changed", ({ language: lang }) => {
            setLanguage(lang as LangKey);
        });

        socket.on("room:time-up", () => {
            alert("Time is up! The session has ended.");
            navigate("/dashboard");
        });

        socket.on("room:terminated", () => {
            alert("This room was terminated by an admin.");
            navigate("/dashboard");
        });

        socket.on("error", ({ message }) => setError(message));

        return () => {
            socket.emit("room:leave", { roomId });
            socket.off("room:user-joined");
            socket.off("room:user-left");
            socket.off("room:full");
            socket.off("timer:tick");
            socket.off("timer:sync");
            socket.off("language:changed");
            socket.off("room:time-up");
            socket.off("room:terminated");
            socket.off("error");
        };
    }, [roomId, roomLoaded, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <p className="text-gray-400 text-sm">Loading room...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center flex-col gap-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                    onClick={() => {
                        leaveRoom();
                        navigate("/dashboard");
                    }}
                    className="text-sm text-violet-400 hover:text-violet-300"
                >
                    Back to dashboard
                </button>
            </div>
        );
    }

    const timerColor =
        timer !== null && timer < 300 ? "text-red-400" : "text-gray-300";

    return (
        <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
            {/* Top bar */}
            <header className="bg-gray-800 border-b border-gray-700 px-4 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            socket.emit("room:leave", { roomId: roomId! });
                            navigate("/dashboard");
                        }}
                        className="text-gray-400 hover:text-gray-200 transition"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                    </button>
                    <div>
                        <p className="text-sm font-medium text-gray-200">
                            Room{" "}
                            <span className="font-mono text-violet-400">
                                {roomId?.slice(0, 10)}...
                            </span>
                        </p>
                        <p className="text-xs text-gray-500">
                            {room?.language}
                        </p>
                    </div>
                </div>

                <div className="flex items-center gap-4">
                    <button
                        onClick={() =>
                            navigator.clipboard.writeText(roomId ?? "")
                        }
                        className="text-xs text-gray-400 hover:text-gray-200 border border-gray-600 px-3 py-1.5 rounded-lg transition flex items-center gap-1.5"
                    >
                        <svg
                            className="w-3.5 h-3.5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                        Copy ID
                    </button>

                    {timer !== null && (
                        <div
                            className={`font-mono text-sm font-medium ${timerColor}`}
                        >
                            {formatTime(timer)}
                        </div>
                    )}

                    <span className="text-xs text-gray-500">
                        {user?.username}
                    </span>
                </div>
            </header>

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Editor placeholder */}
                <div className="flex-1 flex overflow-hidden">
                    <CollabEditor
                        roomId={roomId!}
                        userId={user?.id ?? ""}
                        username={user?.username ?? ""}
                        language={language}
                        onLanguageChange={setLanguage}
                    />
                </div>

                {/* Participants sidebar */}
                <aside className="w-52 bg-gray-800 border-l border-gray-700 flex flex-col">
                    <div className="px-3 py-3 border-b border-gray-700">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Participants ({participants.length}/
                            {room?.maxUsers ?? 4})
                        </p>
                    </div>
                    <div className="flex-1 py-2 overflow-y-auto">
                        {participants.map((p) => (
                            <ParticipantAvatar
                                key={p.userId}
                                username={p.user.username}
                                isOnline={p.isActive}
                            />
                        ))}
                    </div>

                    {/* Questions list */}
                    {room && room.questions.length > 0 && (
                        <div className="border-t border-gray-700 p-3">
                            <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-2">
                                Questions
                            </p>
                            <div className="space-y-1.5">
                                {room.questions.map((rq) => (
                                    <div
                                        key={rq.id}
                                        className="text-xs text-gray-400 hover:text-gray-200 cursor-pointer truncate transition"
                                    >
                                        {rq.title}
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </aside>
            </div>

            {fullToast && (
                <div className="fixed bottom-4 right-4 bg-red-900 border border-red-700 text-red-200 text-sm px-4 py-2.5 rounded-xl shadow-lg">
                    Room is full — max 4 users
                </div>
            )}
        </div>
    );
}
