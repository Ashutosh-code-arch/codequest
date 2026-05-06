import { useEffect, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import type { Room, SupportedLanguage } from "../types";
import { getRoomApi } from "../api/room";
import { socket } from "../lib/sockets";
import type { LangKey } from "../config/languages";
import CollabEditor from "../components/Editor/CollabEditor";
import QuestionPanel from "../components/Editor/QuestionPanel";
import { useChat } from "../hooks/useChat";
import ChatPanel from "../components/Chat/ChatPanel";
import ExecutionPanel from "../components/Editor/ExecutionPanel";
import { useWebRTC } from "../hooks/useWebRTC";
import VideoGrid from "../components/Video/VideoGrid";

interface RoomUser {
    userId: string;
    username: string;
    isActive: boolean;
}

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
    const [users, setUsers] = useState<RoomUser[]>([]);
    const [timer, setTimer] = useState<number | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [fullToast, setFullToast] = useState(false);
    const [roomLoaded, setRoomLoaded] = useState(false);
    const [language, setLanguage] = useState<LangKey>("JAVASCRIPT");
    const leftRef = useRef(false);
    const currentRoomIdRef = useRef<string | undefined>(undefined);
    const [showQuestions, setShowQuestions] = useState(true);
    const [isChatOpen, setIsChatOpen] = useState(true);
    const [selectedQuestionId, setSelectedQuestionId] = useState<string | null>(
        null,
    );
    const [currentCode, setCurrentCode] = useState("");
    const [isVideoOpen, setIsVideoOpen] = useState(false);
    const [socketDisconnected, setSocketDisconnected] = useState(false);

    const { messages, unreadCount, sendMessage, sendError } = useChat({
        roomId: roomId ?? "",
        userId: user?.id ?? "",
        isPanelOpen: isChatOpen,
    });

    const {
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        permError,
        toggleMute,
        toggleVideo,
    } = useWebRTC({
        roomId: roomId ?? "",
        enabled: isVideoOpen && roomLoaded,
    });

    // ── Step 1: Load room ─────────────────────────────────────────────────
    const hasInvalidRoom = !roomId;

    useEffect(() => {
        if (currentRoomIdRef.current !== roomId) {
            leftRef.current = false;
            currentRoomIdRef.current = roomId;
        }
    }, [roomId]);

    function leaveRoom() {
        if (leftRef.current) return; // already left — don't send twice
        leftRef.current = true;
        socket.emit("room:leave", { roomId: roomId! });
    }

    useEffect(() => {
        if (hasInvalidRoom) return;

        leftRef.current = false;
        let cancelled = false;

        async function fetchRoom() {
            try {
                const r = await getRoomApi(roomId!);
                if (cancelled) return;
                setRoom(r);
                if (r.questions && r.questions.length > 0) {
                    setSelectedQuestionId(r.questions[0].questionId);
                }
                setLanguage(r.language as LangKey);
                setTimer(r.timerSeconds);
                const initialUsers: RoomUser[] = (r.participants ?? []).map(
                    (p) => ({
                        userId: p.userId,
                        username: p.user?.username ?? p.userId,
                        isActive: p.isActive,
                    }),
                );
                setUsers(initialUsers);
                setRoomLoaded(true);
            } catch (err) {
                if (cancelled) return;
                const msg = (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message;
                setError(msg ?? "Room not found or access denied.");
                // setRoom(null);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchRoom();
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    // useEffect(() => {
    //     if (!roomId) {
    //         Promise.resolve().then(() => {
    //             setError("No room ID in URL");
    //             setLoading(false);
    //         });
    //         return;
    //     }
    // }, [roomId]);

    // ── Step 2: Socket — only runs after room is loaded ───────────────────
    useEffect(() => {
        // roomLoaded is false on first render, true after fetchRoom succeeds
        if (!roomLoaded || !roomId) return;

        socket.emit("room:join", { roomId });
        // leaveRoom();
        // Server sends current participant list to this joiner
        function onExistingParticipants(data: {
            participants: Array<{
                userId: string;
                username: string;
                isActive: boolean;
            }>;
        }) {
            // Merge server list with what REST already gave us
            // Server list is authoritative — use it to replace
            setUsers(data.participants);
        }
        // Server sends current participant list to this joiner

        // A different user joined — add them
        function onUserJoined(data: {
            user: { id: string; username: string };
            participantCount: number;
        }) {
            setUsers((prev) => {
                // Don't add if already in list
                if (prev.find((u) => u.userId === data.user.id)) return prev;
                return [
                    ...prev,
                    {
                        userId: data.user.id,
                        username: data.user.username,
                        isActive: true,
                    },
                ];
            });
            void data.participantCount;
        }

        function onUserLeft(data: {
            userId: string;
            username: string;
            participantCount: number;
        }) {
            setUsers((prev) => prev.filter((u) => u.userId !== data.userId));
            void data.participantCount;
        }

        function onRoomFull() {
            setFullToast(true);
            setTimeout(() => setFullToast(false), 4000);
        }

        function onTimerTick(data: { secondsRemaining: number }) {
            setTimer(data.secondsRemaining);
        }

        function onTimerSync(data: { secondsRemaining: number }) {
            setTimer(data.secondsRemaining);
        }

        function onTimeUp() {
            alert("Time is up! The session has ended.");
            navigate("/dashboard");
        }

        function onTerminated() {
            alert("This room was terminated by an admin.");
            navigate("/dashboard");
        }

        function onLanguageChanged(data: { language: string }) {
            setLanguage(data.language as LangKey);
        }

        function onSocketError(data: { code: string; message: string }) {
            if (data.code === "ROOM_ENDED") {
                setError("This room has ended.");
            }
        }

        socket.on("room:existing-participants", onExistingParticipants);
        socket.on("room:user-joined", onUserJoined);
        socket.on("room:user-left", onUserLeft);
        socket.on("room:full", onRoomFull);
        socket.on("timer:tick", onTimerTick);
        socket.on("timer:sync", onTimerSync);
        socket.on("room:time-up", onTimeUp);
        socket.on("room:terminated", onTerminated);
        socket.on("language:changed", onLanguageChanged);
        socket.on("error", onSocketError);
        socket.on("connect", () => setSocketDisconnected(false));
        socket.on("disconnect", () => setSocketDisconnected(true));

        return () => {
            leaveRoom();
            socket.off("room:existing-participants", onExistingParticipants);
            socket.off("room:user-joined", onUserJoined);
            socket.off("room:user-left", onUserLeft);
            socket.off("room:full", onRoomFull);
            socket.off("timer:tick", onTimerTick);
            socket.off("timer:sync", onTimerSync);
            socket.off("room:time-up", onTimeUp);
            socket.off("room:terminated", onTerminated);
            socket.off("language:changed", onLanguageChanged);
            socket.off("error", onSocketError);
            socket.off("connect");
            socket.off("disconnect");
        };
    }, [roomId, roomLoaded, navigate]);

    if (loading) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center">
                <div className="text-center">
                    <div className="w-6 h-6 border-2 border-violet-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                    <p className="text-gray-500 text-sm">Loading room...</p>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="min-h-screen bg-gray-900 flex items-center justify-center flex-col gap-4">
                <p className="text-red-400 text-sm">{error}</p>
                <button
                    onClick={() => navigate("/dashboard")}
                    className="text-sm text-violet-400 hover:text-violet-300"
                >
                    Back to dashboard
                </button>
            </div>
        );
    }
    const timerRed = timer !== null && timer < 300;
    // const timerColor =
    //     timer !== null && timer < 300 ? "text-red-400" : "text-gray-300";

    return (
        <div className="h-screen bg-gray-900 flex flex-col overflow-hidden">
            {/* Top bar */}
            <header className="bg-gray-800 border-b border-gray-700 px-4 py-2.5 flex items-center justify-between shrink-0">
                <div className="flex items-center gap-3">
                    <button
                        onClick={() => {
                            leaveRoom();
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
                            <span className="font-mono text-violet-400 text-xs">
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
                    <button
                        onClick={() => setIsVideoOpen((p) => !p)}
                        className={
                            "text-xs border px-3 py-1.5 rounded-lg transition flex items-center gap-1.5 " +
                            (isVideoOpen
                                ? "border-violet-500 text-violet-400"
                                : "border-gray-600 text-gray-400 hover:text-gray-200")
                        }
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
                                d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                            />
                        </svg>
                        {isVideoOpen ? "Hide video" : "Video"}
                    </button>

                    {timer !== null && (
                        <span
                            className={`font-mono text-sm font-semibold ${timerRed ? "text-red-400 animate-pulse" : "text-gray-300"}`}
                        >
                            {formatTime(timer)}
                        </span>
                    )}

                    <span className="text-xs text-gray-500">
                        {user?.username}
                    </span>
                </div>
            </header>
            {socketDisconnected && (
                <div className="bg-amber-900/80 border-b border-amber-700 px-4 py-2 flex items-center gap-2 shrink-0">
                    <svg
                        className="w-3.5 h-3.5 text-amber-400 animate-spin"
                        viewBox="0 0 24 24"
                        fill="none"
                    >
                        <circle
                            className="opacity-25"
                            cx="12"
                            cy="12"
                            r="10"
                            stroke="currentColor"
                            strokeWidth="4"
                        />
                        <path
                            className="opacity-75"
                            fill="currentColor"
                            d="M4 12a8 8 0 018-8v8H4z"
                        />
                    </svg>
                    <span className="text-amber-200 text-xs font-medium">
                        Connection lost — reconnecting...
                    </span>
                </div>
            )}

            {/* Body */}
            <div className="flex-1 flex overflow-hidden">
                {/* Left — question panel */}
                {showQuestions && room && room.questions.length > 0 && (
                    <div className="w-80 shrink-0 overflow-hidden">
                        <QuestionPanel
                            questions={room.questions}
                            onSelect={setSelectedQuestionId}
                        />
                    </div>
                )}
                {/* Editor placeholder */}
                <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
                    {isVideoOpen && (
                        <div className="h-44 shrink-0 border-b border-gray-700 overflow-hidden">
                            <VideoGrid
                                localStream={localStream}
                                localUsername={user?.username ?? ""}
                                isMuted={isMuted}
                                isVideoOff={isVideoOff}
                                remoteStreams={remoteStreams}
                                permError={permError}
                                onToggleMute={toggleMute}
                                onToggleVideo={toggleVideo}
                            />
                        </div>
                    )}
                    {/* Editor takes 65% of height */}
                    <div
                        className="flex-1 overflow-hidden"
                        style={{ minHeight: 0 }}
                    >
                        {/* Your CollabEditor here — add onCodeChange prop */}
                        <CollabEditor
                            roomId={roomId!}
                            userId={user?.id ?? ""}
                            username={user?.username ?? ""}
                            language={language}
                            onLanguageChange={setLanguage}
                            onCodeChange={setCurrentCode}
                        />
                    </div>

                    {/* Execution panel takes remaining height */}
                    <div className="h-64 shrink-0">
                        <ExecutionPanel
                            code={currentCode}
                            language={
                                (room?.language as SupportedLanguage) ??
                                "JAVASCRIPT"
                            }
                            questionId={selectedQuestionId}
                            roomId={roomId}
                        />
                    </div>
                </div>

                <aside
                    className={`flex flex-col bg-gray-800 border-l border-gray-700 shrink-0 transition-all ${
                        isChatOpen ? "w-64" : "w-10"
                    }`}
                >
                    {isChatOpen ? (
                        <>
                            {/* Participants strip at top of chat */}
                            <div className="px-3 py-2 border-b border-gray-700 shrink-0">
                                <div className="flex items-center justify-between mb-1.5">
                                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                        Participants ({users.length}/
                                        {room?.maxUsers ?? 4})
                                    </p>
                                    {room && room.questions.length > 0 && (
                                        <button
                                            onClick={() =>
                                                setShowQuestions((p) => !p)
                                            }
                                            className="text-xs text-gray-500 hover:text-gray-300 transition"
                                            title={
                                                showQuestions
                                                    ? "Hide questions"
                                                    : "Show questions"
                                            }
                                        >
                                            {showQuestions ? "◂" : "▸"}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => setIsChatOpen(false)}
                                        className="text-gray-600 hover:text-gray-400 transition"
                                        title="Collapse chat"
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
                                                d="M9 5l7 7-7 7"
                                            />
                                        </svg>
                                    </button>
                                </div>
                                <div className="flex-1 py-2 overflow-y-auto">
                                    {users.map((u) => (
                                        <ParticipantAvatar
                                            key={u.userId}
                                            username={u.username}
                                            isOnline={u.isActive}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Chat panel */}
                            <div className="flex-1 overflow-hidden">
                                <ChatPanel
                                    messages={messages}
                                    userId={user?.id ?? ""}
                                    sendError={sendError}
                                    onSend={sendMessage}
                                />
                            </div>
                        </>
                    ) : (
                        // Collapsed state — show toggle button + unread badge
                        <div className="flex flex-col items-center pt-3 gap-3">
                            <button
                                onClick={() => setIsChatOpen(true)}
                                className="text-gray-500 hover:text-gray-300 transition"
                                title="Open chat"
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
                                        d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                                    />
                                </svg>
                            </button>
                            {unreadCount > 0 && (
                                <div className="w-5 h-5 rounded-full bg-violet-600 flex items-center justify-center">
                                    <span className="text-white text-xs font-bold leading-none">
                                        {unreadCount > 9 ? "9+" : unreadCount}
                                    </span>
                                </div>
                            )}
                            {/* Rotated label */}
                            <span
                                className="text-xs text-gray-600 font-medium tracking-wider"
                                style={{
                                    writingMode: "vertical-rl",
                                    transform: "rotate(180deg)",
                                }}
                            >
                                CHAT
                            </span>
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
