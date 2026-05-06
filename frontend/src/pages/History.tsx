import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { getHistoryApi, getSessionDetailApi } from "../api/history";
import type { HistoryRoom, SessionDetail } from "../api/history";
import { Editor } from "@monaco-editor/react";
import { formatDistanceToNow } from "date-fns";

function StatusBadge({ status }: { status: string | null }) {
    if (!status) return <span className="text-xs text-gray-500">—</span>;
    const map: Record<string, string> = {
        ACCEPTED: "bg-green-900/60 text-green-400",
        WRONG_ANSWER: "bg-red-900/60 text-red-400",
        TLE: "bg-amber-900/60 text-amber-400",
        MLE: "bg-amber-900/60 text-amber-400",
        ERROR: "bg-red-900/60 text-red-400",
        ACTIVE: "bg-green-900/60 text-green-400",
        ENDED: "bg-gray-800 text-gray-400",
        TERMINATED: "bg-red-900/60 text-red-400",
    };
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-gray-800 text-gray-400"}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

function SkeletonRow() {
    return (
        <div className="flex gap-3 p-4 animate-pulse">
            <div className="w-10 h-10 bg-gray-800 rounded-lg shrink-0" />
            <div className="flex-1 space-y-2">
                <div className="h-3 bg-gray-800 rounded w-1/3" />
                <div className="h-2 bg-gray-800 rounded w-1/2" />
            </div>
        </div>
    );
}

// ── Session detail panel ────────────────────────────────────────────────────
function SessionDetail({
    roomId,
    onBack,
}: {
    roomId: string;
    onBack: () => void;
}) {
    const [detail, setDetail] = useState<SessionDetail | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        getSessionDetailApi(roomId)
            .then((d) => {
                if (!cancelled) setDetail(d);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, [roomId]);

    if (loading) {
        return (
            <div className="flex-1 flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!detail)
        return (
            <div className="flex-1 flex items-center justify-center">
                <p className="text-gray-500 text-sm">Failed to load session.</p>
            </div>
        );

    const monacoLang: Record<string, string> = {
        JAVASCRIPT: "javascript",
        PYTHON: "python",
        JAVA: "java",
        CPP: "cpp",
        C: "c",
    };

    return (
        <div className="flex-1 overflow-y-auto">
            {/* Back button */}
            <div className="px-6 py-4 border-b border-gray-700 flex items-center gap-3">
                <button
                    onClick={onBack}
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
                    <p className="text-sm font-semibold text-gray-100">
                        Session detail
                    </p>
                    <p className="text-xs text-gray-500 font-mono">
                        {detail.room.id.slice(0, 16)}...
                    </p>
                </div>
                <div className="ml-auto flex items-center gap-2">
                    <StatusBadge status={detail.room.status} />
                    <span className="text-xs text-gray-500">
                        {detail.room.language}
                    </span>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Participants */}
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Participants
                    </p>
                    <div className="flex gap-2 flex-wrap">
                        {detail.room.participants.map((p) => (
                            <div
                                key={p.userId}
                                className="flex items-center gap-1.5 bg-gray-800 px-3 py-1.5 rounded-full"
                            >
                                <div className="w-5 h-5 rounded-full bg-violet-700 flex items-center justify-center">
                                    <span className="text-white text-xs font-medium">
                                        {p.user.username[0].toUpperCase()}
                                    </span>
                                </div>
                                <span className="text-xs text-gray-300">
                                    {p.user.username}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Questions + submission status */}
                <div>
                    <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                        Questions
                    </p>
                    <div className="space-y-2">
                        {detail.room.questions.map((rq) => {
                            const mySubmissions = detail.submissions.filter(
                                (s) => s.questionId === rq.questionId,
                            );
                            const bestStatus =
                                mySubmissions.find(
                                    (s) => s.status === "ACCEPTED",
                                )?.status ??
                                mySubmissions[0]?.status ??
                                null;
                            return (
                                <div
                                    key={rq.questionId}
                                    className="flex items-center justify-between p-3 bg-gray-800 rounded-xl"
                                >
                                    <div>
                                        <p className="text-sm text-gray-100 font-medium">
                                            {rq.question.title}
                                        </p>
                                        <p className="text-xs text-gray-500 mt-0.5">
                                            {mySubmissions.length} submission
                                            {mySubmissions.length !== 1
                                                ? "s"
                                                : ""}
                                        </p>
                                    </div>
                                    <StatusBadge status={bestStatus} />
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Latest code snapshot */}
                {detail.latestSnapshot && (
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                            Final code snapshot
                            <span className="ml-2 text-gray-600 normal-case font-normal">
                                saved{" "}
                                {formatDistanceToNow(
                                    new Date(detail.latestSnapshot.savedAt),
                                    { addSuffix: true },
                                )}
                            </span>
                        </p>
                        <div
                            className="rounded-xl overflow-hidden border border-gray-700"
                            style={{ height: 320 }}
                        >
                            <Editor
                                height="100%"
                                language={
                                    monacoLang[
                                        detail.latestSnapshot.language
                                    ] ?? "javascript"
                                }
                                value={detail.latestSnapshot.code}
                                theme="vs-dark"
                                options={{
                                    readOnly: true,
                                    minimap: { enabled: false },
                                    scrollBeyondLastLine: false,
                                    fontSize: 13,
                                    padding: { top: 12 },
                                }}
                            />
                        </div>
                    </div>
                )}

                {/* Submission history */}
                {detail.submissions.length > 0 && (
                    <div>
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider mb-3">
                            All submissions
                        </p>
                        <div className="space-y-2">
                            {detail.submissions.map((s) => (
                                <div
                                    key={s.id}
                                    className="p-3 bg-gray-800 rounded-xl"
                                >
                                    <div className="flex items-center justify-between mb-2">
                                        <p className="text-xs text-gray-300">
                                            {s.question.title}
                                        </p>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">
                                                {s.language}
                                            </span>
                                            <StatusBadge status={s.status} />
                                        </div>
                                    </div>
                                    <p className="text-xs text-gray-600">
                                        {formatDistanceToNow(
                                            new Date(s.submittedAt),
                                            { addSuffix: true },
                                        )}
                                    </p>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

// ── Main History page ────────────────────────────────────────────────────────
export default function History() {
    const navigate = useNavigate();
    const { user, logout } = useAuthStore();

    const [rooms, setRooms] = useState<HistoryRoom[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedRoom, setSelectedRoom] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        getHistoryApi()
            .then((r) => {
                if (!cancelled) setRooms(r);
            })
            .catch(() => {})
            .finally(() => {
                if (!cancelled) setLoading(false);
            });
        return () => {
            cancelled = true;
        };
    }, []);

    const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";

    return (
        <div className="min-h-screen bg-gray-950 flex">
            {/* Sidebar */}
            <aside className="hidden md:flex md:w-56 bg-gray-900 border-r border-gray-800 flex-col p-4 shrink-0">
                <div className="flex items-center gap-2 px-1 mb-8">
                    <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">CC</span>
                    </div>
                    <span className="font-semibold text-gray-100 text-sm">
                        Collab Code
                    </span>
                </div>
                <nav className="flex flex-col gap-1 flex-1">
                    <button
                        onClick={() => navigate("/dashboard")}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-400 hover:bg-gray-800 transition text-left"
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
                                d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                            />
                        </svg>
                        Dashboard
                    </button>
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-violet-900/30 text-violet-400 font-medium">
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        History
                    </div>
                </nav>
                <div className="border-t border-gray-800 pt-4 mt-4 flex items-center gap-3 px-1">
                    <div className="w-8 h-8 rounded-full bg-violet-700 flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-semibold">
                            {initials}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-200 truncate">
                            {user?.username}
                        </p>
                        <p className="text-xs text-gray-500 truncate">
                            {user?.email}
                        </p>
                    </div>
                    <button
                        onClick={() => {
                            logout();
                            navigate("/login");
                        }}
                        className="text-gray-600 hover:text-gray-400 transition"
                        title="Sign out"
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
                                d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                            />
                        </svg>
                    </button>
                </div>
            </aside>

            {/* Main */}
            <main className="flex-1 flex flex-col min-w-0 min-h-screen">
                {selectedRoom ? (
                    <SessionDetail
                        roomId={selectedRoom}
                        onBack={() => setSelectedRoom(null)}
                    />
                ) : (
                    <>
                        <header className="bg-gray-900 border-b border-gray-800 px-6 py-4">
                            <h1 className="text-base font-semibold text-gray-100">
                                Session history
                            </h1>
                            <p className="text-xs text-gray-500 mt-0.5">
                                Your past collaborative coding sessions
                            </p>
                        </header>

                        <div className="flex-1 p-6">
                            {loading ? (
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                    {[1, 2, 3].map((i) => (
                                        <SkeletonRow key={i} />
                                    ))}
                                </div>
                            ) : rooms.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-24">
                                    <div className="w-14 h-14 bg-gray-800 rounded-2xl flex items-center justify-center mb-4">
                                        <svg
                                            className="w-7 h-7 text-gray-600"
                                            fill="none"
                                            stroke="currentColor"
                                            viewBox="0 0 24 24"
                                        >
                                            <path
                                                strokeLinecap="round"
                                                strokeLinejoin="round"
                                                strokeWidth={1.5}
                                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                            />
                                        </svg>
                                    </div>
                                    <p className="text-gray-400 font-medium mb-1">
                                        No sessions yet
                                    </p>
                                    <p className="text-gray-600 text-sm mb-5">
                                        Create a room to start collaborating
                                    </p>
                                    <button
                                        onClick={() => navigate("/dashboard")}
                                        className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition"
                                    >
                                        Go to dashboard
                                    </button>
                                </div>
                            ) : (
                                <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
                                    {rooms.map((room, idx) => (
                                        <button
                                            key={room.id}
                                            onClick={() =>
                                                setSelectedRoom(room.id)
                                            }
                                            className={
                                                "w-full text-left flex items-start gap-4 px-5 py-4 hover:bg-gray-800/50 transition " +
                                                (idx < rooms.length - 1
                                                    ? "border-b border-gray-800"
                                                    : "")
                                            }
                                        >
                                            {/* Language icon */}
                                            <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center shrink-0 mt-0.5">
                                                <span className="text-xs font-bold text-gray-400">
                                                    {room.language ===
                                                    "JAVASCRIPT"
                                                        ? "JS"
                                                        : room.language ===
                                                            "PYTHON"
                                                          ? "PY"
                                                          : room.language ===
                                                              "JAVA"
                                                            ? "JV"
                                                            : room.language ===
                                                                "CPP"
                                                              ? "C++"
                                                              : "C"}
                                                </span>
                                            </div>

                                            <div className="flex-1 min-w-0">
                                                <div className="flex items-center gap-2 mb-1">
                                                    <p className="text-sm font-medium text-gray-100 truncate font-mono">
                                                        {room.id.slice(0, 16)}
                                                        ...
                                                    </p>
                                                    <StatusBadge
                                                        status={room.status}
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mb-2">
                                                    {formatDistanceToNow(
                                                        new Date(
                                                            room.startedAt,
                                                        ),
                                                        { addSuffix: true },
                                                    )}
                                                    {" · "}
                                                    {room.participantCount}{" "}
                                                    participant
                                                    {room.participantCount !== 1
                                                        ? "s"
                                                        : ""}
                                                    {" · "}
                                                    created by{" "}
                                                    {room.creator.username}
                                                </p>
                                                <div className="flex gap-2 flex-wrap">
                                                    {room.questions.map((q) => (
                                                        <div
                                                            key={q.questionId}
                                                            className="flex items-center gap-1.5"
                                                        >
                                                            <span className="text-xs text-gray-400">
                                                                {q.title}
                                                            </span>
                                                            <StatusBadge
                                                                status={
                                                                    q.myBestStatus
                                                                }
                                                            />
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>

                                            <svg
                                                className="w-4 h-4 text-gray-600 shrink-0 mt-1"
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
                                    ))}
                                </div>
                            )}
                        </div>
                    </>
                )}
            </main>
        </div>
    );
}
