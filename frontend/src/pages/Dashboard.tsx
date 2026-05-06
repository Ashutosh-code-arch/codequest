import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
// import { getPublicQuestionsApi } from "../api/room";
import type { Room } from "../types";
import {
    createRoomApi,
    getPublicQuestionsApi,
    getUserRoomsApi,
    joinRoomApi,
} from "../api/room";

function StatCard({ label, value }: { label: string; value: string | number }) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
        </div>
    );
}

function RoomStatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        ACTIVE: "bg-green-50 text-green-700",
        ENDED: "bg-gray-50 text-gray-500",
        TERMINATED: "bg-red-50 text-red-600",
    };
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] ?? "bg-gray-50 text-gray-500"}`}
        >
            {status}
        </span>
    );
}

// ── Create Room Modal ─────────────────────────────────────────────────────
function CreateRoomModal({
    onClose,
    onCreate,
}: {
    onClose: () => void;
    onCreate: (roomId: string) => void;
}) {
    // const [questions, setQuestions] = useState<QuestionWithCount[]>([]);
    const [questions, setQuestions] = useState<
        Array<{
            id: string;
            title: string;
            difficulty: string;
            tags: string[];
            _count: { testCases: number };
        }>
    >([]);
    const [selectedIds, setSelectedIds] = useState<string[]>([]);
    const [language, setLanguage] = useState("JAVASCRIPT");
    const [timerHours, setTimerHours] = useState(1);
    const [loading, setLoading] = useState(true);
    const [creating, setCreating] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getPublicQuestionsApi()
            .then(setQuestions)
            .finally(() => setLoading(false));
    }, []);

    function toggleQuestion(id: string) {
        setSelectedIds((prev) =>
            prev.includes(id)
                ? prev.filter((x) => x !== id)
                : prev.length < 5
                  ? [...prev, id]
                  : prev,
        );
    }

    async function handleCreate() {
        if (!selectedIds.length) {
            setError("Select at least one question");
            return;
        }
        setCreating(true);
        setError("");
        try {
            console.log("Creating room with timerSeconds:", timerHours * 3600);
            const { id } = await createRoomApi({
                questionIds: selectedIds,
                timerSeconds: timerHours * 3600,
                language,
            });
            onCreate(id);
        } catch (err: unknown) {
            setError(
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ?? "Failed to create room",
            );
        } finally {
            setCreating(false);
        }
    }

    const LANGUAGES = ["JAVASCRIPT", "PYTHON", "JAVA", "CPP", "C"];
    const diffColor: Record<string, string> = {
        EASY: "text-green-600",
        MEDIUM: "text-amber-600",
        HARD: "text-red-600",
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-lg bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">
                        Create a room
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600"
                    >
                        <svg
                            className="w-5 h-5"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M6 18L18 6M6 6l12 12"
                            />
                        </svg>
                    </button>
                </div>
                <div className="px-6 py-5 max-h-[75vh] overflow-y-auto space-y-5">
                    {/* Language */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Language
                        </label>
                        <div className="flex gap-2 flex-wrap">
                            {LANGUAGES.map((l) => (
                                <button
                                    key={l}
                                    onClick={() => setLanguage(l)}
                                    className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition ${
                                        language === l
                                            ? "bg-violet-600 text-white border-violet-600"
                                            : "border-gray-200 text-gray-600 hover:border-violet-300"
                                    }`}
                                >
                                    {l}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Timer */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Session duration:{" "}
                            <span className="text-violet-600">
                                {timerHours}h
                            </span>
                        </label>
                        <input
                            type="range"
                            min={1}
                            max={4}
                            step={1}
                            value={timerHours}
                            onChange={(e) =>
                                setTimerHours(Number(e.target.value))
                            }
                            className="w-full accent-violet-600"
                        />
                        <div className="flex justify-between text-xs text-gray-400 mt-1">
                            <span>1h</span>
                            <span>2h</span>
                            <span>3h</span>
                            <span>4h</span>
                        </div>
                    </div>

                    {/* Questions */}
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                            Questions{" "}
                            <span className="text-gray-400 font-normal">
                                ({selectedIds.length}/5 selected)
                            </span>
                        </label>
                        {loading ? (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                Loading questions...
                            </p>
                        ) : questions.length === 0 ? (
                            <p className="text-sm text-gray-400 py-4 text-center">
                                No questions yet. Ask admin to add some.
                            </p>
                        ) : (
                            <div className="space-y-2">
                                {questions.map((q) => {
                                    const sel = selectedIds.includes(q.id);
                                    return (
                                        <div
                                            key={q.id}
                                            onClick={() => toggleQuestion(q.id)}
                                            className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${
                                                sel
                                                    ? "border-violet-400 bg-violet-50"
                                                    : "border-gray-100 hover:border-gray-200"
                                            }`}
                                        >
                                            <div
                                                className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                                                    sel
                                                        ? "bg-violet-600 border-violet-600"
                                                        : "border-gray-300"
                                                }`}
                                            >
                                                {sel && (
                                                    <svg
                                                        className="w-2.5 h-2.5 text-white"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        viewBox="0 0 24 24"
                                                    >
                                                        <path
                                                            strokeLinecap="round"
                                                            strokeLinejoin="round"
                                                            strokeWidth={3}
                                                            d="M5 13l4 4L19 7"
                                                        />
                                                    </svg>
                                                )}
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className="text-sm font-medium text-gray-800 truncate">
                                                    {q.title}
                                                </p>
                                                <p
                                                    className={`text-xs font-medium ${diffColor[q.difficulty]}`}
                                                >
                                                    {q.difficulty}
                                                </p>
                                            </div>
                                            <span className="text-xs text-gray-400">
                                                {q._count.testCases} cases
                                            </span>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>

                    {error && (
                        <p className="text-sm text-red-500 bg-red-50 rounded-lg px-3 py-2">
                            {error}
                        </p>
                    )}

                    <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
                        <button
                            onClick={onClose}
                            className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleCreate}
                            disabled={creating || !selectedIds.length}
                            className="px-5 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                        >
                            {creating ? "Creating..." : "Create room"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ── Dashboard ─────────────────────────────────────────────────────────────
export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuthStore();

    const [rooms, setRooms] = useState<Room[]>([]);
    const [roomsLoading, setRoomsLoading] = useState(true);
    const [joinId, setJoinId] = useState("");
    const [joining, setJoining] = useState(false);
    const [joinError, setJoinError] = useState("");
    const [showCreate, setShowCreate] = useState(false);

    useEffect(() => {
        getUserRoomsApi()
            .then(setRooms)
            .finally(() => setRoomsLoading(false));
    }, []);

    async function handleJoin() {
        const id = joinId.trim();
        if (!id) return;
        setJoining(true);
        setJoinError("");
        try {
            await joinRoomApi(id);
            navigate(`/room/${id}`);
        } catch (err: unknown) {
            setJoinError(
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ?? "Failed to join room",
            );
        } finally {
            setJoining(false);
        }
    }

    function handleCreated(roomId: string) {
        setShowCreate(false);
        navigate(`/room/${roomId}`);
    }

    function handleLogout() {
        logout();
        navigate("/login");
    }

    const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";
    const activeRooms = rooms.filter((r) => r.status === "ACTIVE").length;

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="hidden md:flex md:w-56 lg:w-60 bg-white border-r border-gray-100 flex-col p-4 shrink-0">
                <div className="flex items-center gap-2 px-1 mb-8">
                    <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">CC</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                        Collab Code
                    </span>
                </div>
                <nav className="flex flex-col gap-1 flex-1">
                    <div className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm bg-violet-50 text-violet-700 font-medium">
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
                    </div>
                    <button
                        onClick={() => navigate("/history")}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition text-left"
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
                                d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                            />
                        </svg>
                        History
                    </button>
                    {isAdmin() && (
                        <>
                            <div className="mt-4 mb-1 px-3">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Admin
                                </p>
                            </div>
                            <button
                                onClick={() => navigate("/admin")}
                                className="flex items-center gap-3 px-3 py-2 rounded-lg text-sm text-gray-600 hover:bg-gray-100 transition text-left"
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
                                        d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                    />
                                </svg>
                                Admin panel
                            </button>
                        </>
                    )}
                </nav>
                <div className="border-t border-gray-100 pt-4 mt-4 flex items-center gap-3 px-1">
                    <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                        <span className="text-violet-700 text-xs font-semibold">
                            {initials}
                        </span>
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-800 truncate">
                            {user?.username}
                        </p>
                        <p className="text-xs text-gray-400 truncate">
                            {user?.email}
                        </p>
                    </div>
                    <button
                        onClick={handleLogout}
                        className="text-gray-400 hover:text-gray-600 transition"
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
            <main className="flex-1 flex flex-col min-w-0">
                <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-semibold text-gray-900">
                            Dashboard
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Welcome back,{" "}
                            <span className="text-gray-600">
                                {user?.username}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={() => setShowCreate(true)}
                        className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition"
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
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New room
                    </button>
                </header>

                <div className="flex-1 p-6">
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard label="Active rooms" value={activeRooms} />
                        <StatCard label="Total sessions" value={rooms.length} />
                        <StatCard label="Problems solved" value={0} />
                        <StatCard label="Role" value={user?.role ?? "—"} />
                    </div>

                    {/* Join by ID */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-3">
                            Join a room
                        </h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Paste room ID..."
                                value={joinId}
                                onChange={(e) => {
                                    setJoinId(e.target.value);
                                    setJoinError("");
                                }}
                                onKeyDown={(e) =>
                                    e.key === "Enter" && handleJoin()
                                }
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                            />
                            <button
                                onClick={handleJoin}
                                disabled={joining || !joinId.trim()}
                                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 disabled:opacity-50 transition"
                            >
                                {joining ? "Joining..." : "Join"}
                            </button>
                        </div>
                        {joinError && (
                            <p className="text-xs text-red-500 mt-2">
                                {joinError}
                            </p>
                        )}
                    </div>

                    {/* Rooms list */}
                    <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-800">
                                My rooms
                            </h2>
                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                {rooms.length}
                            </span>
                        </div>
                        {roomsLoading ? (
                            <div className="divide-y divide-gray-50">
                                {[1, 2, 3].map((i) => (
                                    <div
                                        key={i}
                                        className="flex items-center gap-4 px-5 py-4 animate-pulse"
                                    >
                                        <div className="w-10 h-10 bg-gray-100 rounded-xl shrink-0" />
                                        <div className="flex-1 space-y-2">
                                            <div className="h-3 bg-gray-100 rounded w-1/4" />
                                            <div className="h-2 bg-gray-100 rounded w-1/3" />
                                        </div>
                                        <div className="h-5 w-16 bg-gray-100 rounded-full" />
                                    </div>
                                ))}
                            </div>
                        ) : rooms.length === 0 ? (
                            <div className="flex flex-col items-center justify-center py-16 text-center px-6">
                                <div className="w-12 h-12 bg-violet-50 rounded-xl flex items-center justify-center mb-3">
                                    <svg
                                        className="w-6 h-6 text-violet-400"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={1.5}
                                            d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                </div>
                                <p className="text-gray-500 text-sm font-medium mb-1">
                                    No rooms yet
                                </p>
                                <p className="text-gray-400 text-xs">
                                    Create a room to start collaborating
                                </p>
                            </div>
                        ) : (
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-50 bg-gray-50">
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                                            Room ID
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                                            Language
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                                            Status
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-400 uppercase tracking-wide">
                                            Started
                                        </th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {rooms.map((r) => (
                                        <tr
                                            key={r.id}
                                            className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                                        >
                                            <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                                                {r.id}
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-600 text-xs">
                                                {r.language}
                                            </td>
                                            <td className="px-5 py-3.5">
                                                <RoomStatusBadge
                                                    status={r.status}
                                                />
                                            </td>
                                            <td className="px-5 py-3.5 text-gray-400 text-xs">
                                                {new Date(
                                                    r.startedAt,
                                                ).toLocaleString()}
                                            </td>
                                            <td className="px-5 py-3.5 text-right">
                                                {r.status === "ACTIVE" && (
                                                    <button
                                                        onClick={() =>
                                                            navigate(
                                                                `/room/${r.id}`,
                                                            )
                                                        }
                                                        className="text-xs text-violet-600 hover:text-violet-800 font-medium transition"
                                                    >
                                                        Rejoin
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        )}
                    </div>
                </div>
            </main>

            {showCreate && (
                <CreateRoomModal
                    onClose={() => setShowCreate(false)}
                    onCreate={handleCreated}
                />
            )}
        </div>
    );
}
