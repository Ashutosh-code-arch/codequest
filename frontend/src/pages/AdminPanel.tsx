import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import type { Question } from "../types";
import {
    createQuestionApi,
    createTestCaseApi,
    deleteQuestionApi,
    deleteTestCaseApi,
    getAdminRoomsApi,
    getQuestionApi,
    getQuestionsApi,
    terminateRoomApi,
    updateQuestionApi,
    type CreateQuestionPayload,
    type CreateTestCasePayload,
    type QuestionWithCount,
    type QuestionWithTestCases,
} from "../api/admin";
import { useAuthStore } from "../store/authStore";

// ── Difficulty badge ───────────────────────────────────────────────────────
function DiffBadge({ d }: { d: string }) {
    const map: Record<string, string> = {
        EASY: "bg-green-50 text-green-700 border-green-200",
        MEDIUM: "bg-amber-50 text-amber-700 border-amber-200",
        HARD: "bg-red-50   text-red-700   border-red-200",
    };
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${map[d] ?? "bg-gray-50 text-gray-600 border-gray-200"}`}
        >
            {d}
        </span>
    );
}

// ── Modal wrapper ──────────────────────────────────────────────────────────
function Modal({
    title,
    onClose,
    children,
}: {
    title: string;
    onClose: () => void;
    children: React.ReactNode;
}) {
    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
            <div className="w-full max-w-2xl bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
                    <h2 className="text-base font-semibold text-gray-900">
                        {title}
                    </h2>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition"
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
                <div className="px-6 py-5 max-h-[80vh] overflow-y-auto">
                    {children}
                </div>
            </div>
        </div>
    );
}

// ── Question form (create + edit) ─────────────────────────────────────────
function QuestionForm({
    initial,
    onSave,
    onClose,
}: {
    initial?: Question;
    onSave: (q: Question) => void;
    onClose: () => void;
}) {
    const [form, setForm] = useState<CreateQuestionPayload>({
        title: initial?.title ?? "",
        description: initial?.description ?? "",
        difficulty: initial?.difficulty ?? "EASY",
        tags: initial?.tags ?? [],
    });
    const [tagInput, setTagInput] = useState("");
    const [error, setError] = useState("");
    const [saving, setSaving] = useState(false);

    function addTag() {
        const t = tagInput.trim().toLowerCase();
        if (!t || form.tags.includes(t) || form.tags.length >= 10) return;
        setForm((p) => ({ ...p, tags: [...p.tags, t] }));
        setTagInput("");
    }

    function removeTag(t: string) {
        setForm((p) => ({ ...p, tags: p.tags.filter((x) => x !== t) }));
    }

    async function handleSave() {
        if (!form.title || !form.description || !form.tags.length) {
            setError("Title, description and at least one tag are required");
            return;
        }
        setSaving(true);
        setError("");
        try {
            const saved = initial
                ? await updateQuestionApi(initial.id, form)
                : await createQuestionApi(form);
            onSave(saved);
        } catch (err: unknown) {
            setError(
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ?? "Save failed",
            );
        } finally {
            setSaving(false);
        }
    }

    return (
        <div className="space-y-4">
            {/* Title */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Title
                </label>
                <input
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                    value={form.title}
                    onChange={(e) =>
                        setForm((p) => ({ ...p, title: e.target.value }))
                    }
                    placeholder="e.g. Two Sum"
                />
            </div>

            {/* Difficulty */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Difficulty
                </label>
                <select
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 bg-white"
                    value={form.difficulty}
                    onChange={(e) =>
                        setForm((p) => ({
                            ...p,
                            difficulty: e.target.value as
                                | "EASY"
                                | "MEDIUM"
                                | "HARD",
                        }))
                    }
                >
                    <option>EASY</option>
                    <option>MEDIUM</option>
                    <option>HARD</option>
                </select>
            </div>

            {/* Description */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description (markdown supported)
                </label>
                <textarea
                    rows={6}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 font-mono resize-y"
                    value={form.description}
                    onChange={(e) =>
                        setForm((p) => ({ ...p, description: e.target.value }))
                    }
                    placeholder="Describe the problem..."
                />
            </div>

            {/* Tags */}
            <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tags
                </label>
                <div className="flex gap-2 mb-2 flex-wrap">
                    {form.tags.map((t) => (
                        <span
                            key={t}
                            className="inline-flex items-center gap-1 text-xs bg-violet-50 text-violet-700 border border-violet-200 rounded-full px-2 py-0.5"
                        >
                            {t}
                            <button
                                onClick={() => removeTag(t)}
                                className="hover:text-red-500"
                            >
                                ×
                            </button>
                        </span>
                    ))}
                </div>
                <div className="flex gap-2">
                    <input
                        className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500"
                        value={tagInput}
                        onChange={(e) => setTagInput(e.target.value)}
                        onKeyDown={(e) =>
                            e.key === "Enter" && (e.preventDefault(), addTag())
                        }
                        placeholder="Type tag and press Enter"
                    />
                    <button
                        onClick={addTag}
                        className="px-3 py-2 text-sm bg-gray-100 hover:bg-gray-200 rounded-lg transition"
                    >
                        Add
                    </button>
                </div>
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
                    onClick={handleSave}
                    disabled={saving}
                    className="px-5 py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                >
                    {saving
                        ? "Saving..."
                        : initial
                          ? "Update question"
                          : "Create question"}
                </button>
            </div>
        </div>
    );
}

// ── Test case manager panel ────────────────────────────────────────────────
function TestCaseManager({
    questionId,
    onClose,
}: {
    questionId: string;
    onClose: () => void;
}) {
    const [question, setQuestion] = useState<QuestionWithTestCases | null>(
        null,
    );
    const [loading, setLoading] = useState(true);
    const [form, setForm] = useState<CreateTestCasePayload>({
        input: "",
        expectedOutput: "",
        isHidden: false,
        timeLimit: 2000,
        memoryLimit: 256,
    });
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");

    // const load = useCallback(async () => {
    //     try {
    //         const q = await getQuestionApi(questionId);
    //         setQuestion(q);
    //     } finally {
    //         setLoading(false);
    //     }
    // }, [questionId]);

    // useEffect(() => {
    //     load();
    // }, [load]);

    useEffect(() => {
        let cancelled = false;

        async function fetchQuestion() {
            try {
                const q = await getQuestionApi(questionId);
                if (cancelled) return;
                setQuestion(q);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchQuestion();
        return () => {
            cancelled = true;
        };
    }, [questionId]);

    async function handleAdd() {
        if (!form.input || !form.expectedOutput) {
            setError("Input and expected output are required");
            return;
        }
        setSaving(true);
        setError("");
        try {
            await createTestCaseApi(questionId, form);
            setForm({
                input: "",
                expectedOutput: "",
                isHidden: false,
                timeLimit: 2000,
                memoryLimit: 256,
            });
            // await load();
            const q = await getQuestionApi(questionId);
            setQuestion(q);
        } catch {
            setError("Failed to add test case");
        } finally {
            setSaving(false);
        }
    }

    async function handleDelete(id: string) {
        if (!window.confirm("Delete this test case?")) return;
        try {
            await deleteTestCaseApi(id);
            // await load();
        } catch {
            alert("Failed to delete test case");
        }
    }

    return (
        <Modal
            title={`Test cases — ${question?.title ?? "..."}`}
            onClose={onClose}
        >
            {loading ? (
                <p className="text-sm text-gray-400 text-center py-8">
                    Loading...
                </p>
            ) : (
                <div className="space-y-5">
                    {/* Existing test cases */}
                    {question?.testCases.length === 0 && (
                        <p className="text-sm text-gray-400 text-center py-4">
                            No test cases yet
                        </p>
                    )}
                    {question?.testCases.map((tc, i) => (
                        <div
                            key={tc.id}
                            className="border border-gray-100 rounded-xl p-4"
                        >
                            <div className="flex items-center justify-between mb-3">
                                <span className="text-xs font-medium text-gray-500">
                                    Case #{i + 1}
                                </span>
                                <div className="flex items-center gap-2">
                                    {tc.isHidden && (
                                        <span className="text-xs bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                                            Hidden
                                        </span>
                                    )}
                                    <button
                                        onClick={() => handleDelete(tc.id)}
                                        className="text-xs text-red-400 hover:text-red-600 transition"
                                    >
                                        Delete
                                    </button>
                                </div>
                            </div>
                            <div className="grid grid-cols-2 gap-3">
                                <div>
                                    <p className="text-xs font-medium text-gray-400 mb-1">
                                        Input
                                    </p>
                                    <pre className="text-xs bg-gray-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                                        {tc.input}
                                    </pre>
                                </div>
                                <div>
                                    <p className="text-xs font-medium text-gray-400 mb-1">
                                        Expected output
                                    </p>
                                    <pre className="text-xs bg-gray-50 rounded-lg p-2 overflow-x-auto whitespace-pre-wrap">
                                        {tc.expectedOutput}
                                    </pre>
                                </div>
                            </div>
                            <p className="text-xs text-gray-400 mt-2">
                                Time limit: {tc.timeLimit}ms · Memory:{" "}
                                {tc.memoryLimit}MB
                            </p>
                        </div>
                    ))}

                    {/* Add new test case */}
                    <div className="border-t border-gray-100 pt-5">
                        <h3 className="text-sm font-semibold text-gray-800 mb-3">
                            Add test case
                        </h3>
                        <div className="grid grid-cols-2 gap-3 mb-3">
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Input
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-violet-500 resize-y"
                                    value={form.input}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            input: e.target.value,
                                        }))
                                    }
                                    placeholder="[2,7,11,15]&#10;9"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-medium text-gray-600 mb-1">
                                    Expected output
                                </label>
                                <textarea
                                    rows={3}
                                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-xs font-mono outline-none focus:border-violet-500 resize-y"
                                    value={form.expectedOutput}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            expectedOutput: e.target.value,
                                        }))
                                    }
                                    placeholder="[0,1]"
                                />
                            </div>
                        </div>
                        <div className="flex items-center gap-4 mb-3">
                            <label className="flex items-center gap-2 text-xs text-gray-600 cursor-pointer">
                                <input
                                    type="checkbox"
                                    checked={form.isHidden}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            isHidden: e.target.checked,
                                        }))
                                    }
                                    className="rounded border-gray-300"
                                />
                                Hidden test case
                            </label>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-gray-600">
                                    Time limit (ms)
                                </label>
                                <input
                                    type="number"
                                    min={500}
                                    max={10000}
                                    step={500}
                                    className="w-20 border border-gray-200 rounded px-2 py-1 text-xs outline-none focus:border-violet-500"
                                    value={form.timeLimit}
                                    onChange={(e) =>
                                        setForm((p) => ({
                                            ...p,
                                            timeLimit: Number(e.target.value),
                                        }))
                                    }
                                />
                            </div>
                        </div>
                        {error && (
                            <p className="text-xs text-red-500 mb-3">{error}</p>
                        )}
                        <button
                            onClick={handleAdd}
                            disabled={saving}
                            className="w-full py-2 text-sm bg-violet-600 text-white rounded-lg hover:bg-violet-700 disabled:opacity-50 transition"
                        >
                            {saving ? "Adding..." : "Add test case"}
                        </button>
                    </div>
                </div>
            )}
        </Modal>
    );
}

interface RoomRow {
    id: string;
    status: string;
    language: string;
    startedAt: string;
    endedAt: string | null;
    creator: { id: string; username: string; email: string };
    _count: { participants: number };
}

// ── Main AdminPanel page ───────────────────────────────────────────────────
export default function AdminPanel() {
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuthStore();

    const [questions, setQuestions] = useState<QuestionWithCount[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    // Rooms
    const [rooms, setRooms] = useState<RoomRow[]>([]);
    const [roomsLoading, setRoomsLoading] = useState(false);

    // Modal states
    const [showCreate, setShowCreate] = useState(false);
    const [editQuestion, setEditQuestion] = useState<Question | null>(null);
    const [testCasesFor, setTestCasesFor] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<"questions" | "rooms">(
        "questions",
    );

    // const loadQuestions = useCallback(async () => {
    //     setLoading(true);
    //     try {
    //         const data = await getQuestionsApi(page);
    //         setQuestions(data.questions);
    //         setTotalPages(data.totalPages);
    //     } finally {
    //         setLoading(false);
    //     }
    // }, [page]);

    useEffect(() => {
        let cancelled = false;

        async function fetchQuestions() {
            setLoading(true);
            try {
                const data = await getQuestionsApi(page);
                if (cancelled) return;
                setQuestions(data.questions);
                setTotalPages(data.totalPages);
            } finally {
                if (!cancelled) setLoading(false);
            }
        }

        fetchQuestions();
        return () => {
            cancelled = true;
        };
    }, [page]);

    // const loadRooms = useCallback(async () => {
    //     setRoomsLoading(true);
    //     try {
    //         const data = await getAdminRoomsApi();
    //         setRooms(data.rooms);
    //     } finally {
    //         setRoomsLoading(false);
    //     }
    // }, []);

    // useEffect(() => {
    //     Promise.resolve().then(() => {
    //         if (activeTab === "rooms") loadRooms();
    //     });
    // }, [activeTab, loadRooms]);

    useEffect(() => {
        if (activeTab !== "rooms") return;
        let cancelled = false;

        async function fetchRooms() {
            setRoomsLoading(true);
            try {
                const data = await getAdminRoomsApi();
                if (cancelled) return;
                setRooms(data.rooms);
            } finally {
                if (!cancelled) setRoomsLoading(false);
            }
        }

        fetchRooms();
        return () => {
            cancelled = true;
        };
    }, [activeTab]);

    // useEffect(() => {
    //     Promise.resolve().then(() => {
    //         loadQuestions();
    //     });
    // }, [page]);

    // Guard — redirect non-admins
    useEffect(() => {
        if (!isAdmin()) navigate("/dashboard");
    }, [isAdmin, navigate]);

    async function handleDelete(id: string) {
        try {
            await deleteQuestionApi(id);
            setConfirmDelete(null);
            // await loadQuestions();
        } catch {
            alert("Failed to delete question");
        }
    }

    function handleSaved(q: Question) {
        setShowCreate(false);
        setEditQuestion(null);
        // loadQuestions();
        void q; // suppress unused warning
    }

    async function handleTerminate(id: string) {
        if (
            !window.confirm(
                "Terminate this room? All users will be disconnected.",
            )
        )
            return;
        try {
            await terminateRoomApi(id);
            // await loadRooms();
        } catch {
            alert("Failed to terminate room");
        }
    }

    const initials = user?.username?.slice(0, 2).toUpperCase() ?? "??";

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
                    <button
                        onClick={() => navigate("/dashboard")}
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
                                d="M10 19l-7-7m0 0l7-7m-7 7h18"
                            />
                        </svg>
                        Back to dashboard
                    </button>
                    <div className="mt-4 mb-1 px-3">
                        <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                            Admin
                        </p>
                    </div>
                    {(["questions", "rooms"] as const).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition text-left capitalize ${
                                activeTab === tab
                                    ? "bg-violet-50 text-violet-700 font-medium"
                                    : "text-gray-600 hover:bg-gray-100"
                            }`}
                        >
                            {tab}
                        </button>
                    ))}
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
                        <p className="text-xs text-gray-400">Admin</p>
                    </div>
                    <button
                        onClick={() => {
                            logout();
                            navigate("/login");
                        }}
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
                        <h1 className="text-base font-semibold text-gray-900 capitalize">
                            {activeTab}
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Admin panel
                        </p>
                    </div>
                    {activeTab === "questions" && (
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
                            New question
                        </button>
                    )}
                </header>

                <div className="flex-1 p-6">
                    {activeTab === "questions" && (
                        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Title
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Difficulty
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Tags
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Test cases
                                        </th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="text-center py-12 text-gray-400 text-sm"
                                            >
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : questions.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={5}
                                                className="text-center py-12 text-gray-400 text-sm"
                                            >
                                                No questions yet. Create one
                                                above.
                                            </td>
                                        </tr>
                                    ) : (
                                        questions.map((q) => (
                                            <tr
                                                key={q.id}
                                                className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                                            >
                                                <td className="px-5 py-3.5 font-medium text-gray-800">
                                                    {q.title}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <DiffBadge
                                                        d={q.difficulty}
                                                    />
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex flex-wrap gap-1">
                                                        {q.tags
                                                            .slice(0, 3)
                                                            .map((t) => (
                                                                <span
                                                                    key={t}
                                                                    className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full"
                                                                >
                                                                    {t}
                                                                </span>
                                                            ))}
                                                        {q.tags.length > 3 && (
                                                            <span className="text-xs text-gray-400">
                                                                +
                                                                {q.tags.length -
                                                                    3}
                                                            </span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="px-5 py-3.5 text-gray-500">
                                                    {q._count.testCases}
                                                </td>
                                                <td className="px-5 py-3.5">
                                                    <div className="flex items-center justify-end gap-3">
                                                        <button
                                                            onClick={() =>
                                                                setTestCasesFor(
                                                                    q.id,
                                                                )
                                                            }
                                                            className="text-xs text-violet-600 hover:text-violet-800 font-medium transition"
                                                        >
                                                            Test cases
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setEditQuestion(
                                                                    q,
                                                                )
                                                            }
                                                            className="text-xs text-gray-500 hover:text-gray-800 transition"
                                                        >
                                                            Edit
                                                        </button>
                                                        <button
                                                            onClick={() =>
                                                                setConfirmDelete(
                                                                    q.id,
                                                                )
                                                            }
                                                            className="text-xs text-red-400 hover:text-red-600 transition"
                                                        >
                                                            Delete
                                                        </button>
                                                    </div>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between px-5 py-3 border-t border-gray-100">
                                    <p className="text-xs text-gray-400">
                                        Page {page} of {totalPages}
                                    </p>
                                    <div className="flex gap-2">
                                        <button
                                            disabled={page === 1}
                                            onClick={() =>
                                                setPage((p) => p - 1)
                                            }
                                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
                                        >
                                            Prev
                                        </button>
                                        <button
                                            disabled={page === totalPages}
                                            onClick={() =>
                                                setPage((p) => p + 1)
                                            }
                                            className="text-xs px-3 py-1.5 border border-gray-200 rounded-lg hover:bg-gray-50 disabled:opacity-40 transition"
                                        >
                                            Next
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === "rooms" && (
                        <div className="bg-white border border-gray-100 rounded-xl overflow-hidden">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-gray-100 bg-gray-50">
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Room ID
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Creator
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Status
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Users
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Language
                                        </th>
                                        <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                                            Started
                                        </th>
                                        <th className="px-5 py-3"></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {roomsLoading ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="text-center py-12 text-gray-400 text-sm"
                                            >
                                                Loading...
                                            </td>
                                        </tr>
                                    ) : rooms.length === 0 ? (
                                        <tr>
                                            <td
                                                colSpan={7}
                                                className="text-center py-12 text-gray-400 text-sm"
                                            >
                                                No rooms yet. They appear here
                                                once users create sessions.
                                            </td>
                                        </tr>
                                    ) : (
                                        rooms.map((r) => {
                                            const statusColors: Record<
                                                string,
                                                string
                                            > = {
                                                ACTIVE: "bg-green-50 text-green-700 border-green-200",
                                                ENDED: "bg-gray-50  text-gray-500  border-gray-200",
                                                TERMINATED:
                                                    "bg-red-50   text-red-600   border-red-200",
                                            };
                                            return (
                                                <tr
                                                    key={r.id}
                                                    className="border-b border-gray-50 hover:bg-gray-50/50 transition"
                                                >
                                                    <td className="px-5 py-3.5 font-mono text-xs text-gray-500">
                                                        {r.id.slice(0, 10)}...
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-700">
                                                        {r.creator.username}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        <span
                                                            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${statusColors[r.status]}`}
                                                        >
                                                            {r.status}
                                                        </span>
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-500">
                                                        {r._count.participants}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-500 text-xs">
                                                        {r.language}
                                                    </td>
                                                    <td className="px-5 py-3.5 text-gray-400 text-xs">
                                                        {new Date(
                                                            r.startedAt,
                                                        ).toLocaleString()}
                                                    </td>
                                                    <td className="px-5 py-3.5">
                                                        {r.status ===
                                                            "ACTIVE" && (
                                                            <button
                                                                onClick={() =>
                                                                    handleTerminate(
                                                                        r.id,
                                                                    )
                                                                }
                                                                className="text-xs text-red-400 hover:text-red-600 font-medium transition"
                                                            >
                                                                Terminate
                                                            </button>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </main>

            {/* Modals */}
            {showCreate && (
                <Modal
                    title="New question"
                    onClose={() => setShowCreate(false)}
                >
                    <QuestionForm
                        onSave={handleSaved}
                        onClose={() => setShowCreate(false)}
                    />
                </Modal>
            )}
            {editQuestion && (
                <Modal
                    title="Edit question"
                    onClose={() => setEditQuestion(null)}
                >
                    <QuestionForm
                        initial={editQuestion}
                        onSave={handleSaved}
                        onClose={() => setEditQuestion(null)}
                    />
                </Modal>
            )}
            {testCasesFor && (
                <TestCaseManager
                    questionId={testCasesFor}
                    onClose={() => setTestCasesFor(null)}
                />
            )}
            {confirmDelete && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-4">
                    <div className="bg-white rounded-2xl p-6 w-full max-w-sm shadow-xl">
                        <h3 className="text-base font-semibold text-gray-900 mb-2">
                            Delete question?
                        </h3>
                        <p className="text-sm text-gray-500 mb-5">
                            This will soft-delete the question. It won't appear
                            to users but submission history is preserved.
                        </p>
                        <div className="flex justify-end gap-3">
                            <button
                                onClick={() => setConfirmDelete(null)}
                                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={() => handleDelete(confirmDelete)}
                                className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition"
                            >
                                Delete
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
