import { useState, useRef } from "react";
import { runCodeApi, submitCodeApi } from "../../api/execution";
import type {
    ExecuteResult,
    SubmitResult,
    TestCaseResult,
} from "../../api/execution";
import type { SupportedLanguage } from "../../types";

type PanelTab = "run" | "submit";

interface ExecutionPanelProps {
    code: string;
    language: SupportedLanguage;
    questionId: string | null; // null if no question selected
    roomId?: string;
}

// ── Status badge ──────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
    const map: Record<string, string> = {
        ACCEPTED: "bg-green-900/60 text-green-400 border-green-800",
        WRONG_ANSWER: "bg-red-900/60   text-red-400   border-red-800",
        TLE: "bg-amber-900/60 text-amber-400  border-amber-800",
        MLE: "bg-amber-900/60 text-amber-400  border-amber-800",
        ERROR: "bg-red-900/60   text-red-400    border-red-800",
    };
    const cls = map[status] ?? "bg-gray-800 text-gray-400 border-gray-700";
    return (
        <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full border ${cls}`}
        >
            {status.replace("_", " ")}
        </span>
    );
}

// ── Test case result row ──────────────────────────────────────────────────
function TestCaseRow({
    result,
    index,
}: {
    result: TestCaseResult;
    index: number;
}) {
    const [expanded, setExpanded] = useState(false);

    return (
        <div
            className={`border rounded-lg overflow-hidden ${
                result.passed ? "border-green-800/50" : "border-red-800/50"
            }`}
        >
            <button
                onClick={() => setExpanded((p) => !p)}
                className={`w-full flex items-center justify-between px-3 py-2 text-left transition ${
                    result.passed
                        ? "bg-green-900/20 hover:bg-green-900/30"
                        : "bg-red-900/20 hover:bg-red-900/30"
                }`}
            >
                <div className="flex items-center gap-2">
                    <span
                        className={`text-xs font-medium ${result.passed ? "text-green-400" : "text-red-400"}`}
                    >
                        {result.passed ? "✓" : "✗"} Case #{index + 1}
                    </span>
                    {result.executionMs !== null && (
                        <span className="text-xs text-gray-600">
                            {result.executionMs}ms
                        </span>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500">
                        {result.status}
                    </span>
                    <span className="text-gray-600 text-xs">
                        {expanded ? "▲" : "▼"}
                    </span>
                </div>
            </button>

            {expanded && (
                <div className="px-3 py-2 bg-gray-900/50 space-y-2">
                    {result.stdout !== null ? (
                        <>
                            <div>
                                <p className="text-xs text-gray-500 mb-1">
                                    Your output
                                </p>
                                <pre className="text-xs text-gray-300 bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                    {result.stdout || "(empty)"}
                                </pre>
                            </div>
                            {!result.passed && result.expected !== null && (
                                <div>
                                    <p className="text-xs text-gray-500 mb-1">
                                        Expected
                                    </p>
                                    <pre className="text-xs text-green-400 bg-gray-800 rounded p-2 overflow-x-auto whitespace-pre-wrap">
                                        {result.expected}
                                    </pre>
                                </div>
                            )}
                        </>
                    ) : (
                        <p className="text-xs text-gray-600 italic">
                            Hidden test case — I/O not shown
                        </p>
                    )}
                </div>
            )}
        </div>
    );
}

// ── Main panel ────────────────────────────────────────────────────────────
export default function ExecutionPanel({
    code,
    language,
    questionId,
    roomId,
}: ExecutionPanelProps) {
    const [activeTab, setActiveTab] = useState<PanelTab>("run");
    const [stdin, setStdin] = useState("");
    const [running, setRunning] = useState(false);
    const [submitting, setSubmitting] = useState(false);
    const [runResult, setRunResult] = useState<ExecuteResult | null>(null);
    const [submitResult, setSubmitResult] = useState<SubmitResult | null>(null);
    const [runError, setRunError] = useState("");
    const [submitError, setSubmitError] = useState("");
    const abortRef = useRef<AbortController | null>(null);

    async function handleRun() {
        if (!code.trim()) {
            setRunError("Editor is empty");
            return;
        }
        setRunning(true);
        setRunResult(null);
        setRunError("");
        try {
            const result = await runCodeApi({ code, language, stdin });
            setRunResult(result);
        } catch (err: unknown) {
            setRunError(
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ?? "Execution failed",
            );
        } finally {
            setRunning(false);
        }
    }

    async function handleSubmit() {
        if (!code.trim()) {
            setSubmitError("Editor is empty");
            return;
        }
        if (!questionId) {
            setSubmitError("No question selected");
            return;
        }
        setSubmitting(true);
        setSubmitResult(null);
        setSubmitError("");
        try {
            const result = await submitCodeApi({
                code,
                language,
                questionId,
                roomId,
            });
            setSubmitResult(result);
            setActiveTab("submit");
        } catch (err: unknown) {
            setSubmitError(
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ?? "Submission failed",
            );
        } finally {
            setSubmitting(false);
        }
    }

    void abortRef;

    return (
        <div className="flex flex-col h-full bg-gray-900 border-t border-gray-700">
            {/* Toolbar */}
            <div className="flex items-center justify-between px-3 py-2 border-b border-gray-700 shrink-0">
                <div className="flex gap-1">
                    {(["run", "submit"] as PanelTab[]).map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`text-xs px-3 py-1.5 rounded-lg capitalize font-medium transition ${
                                activeTab === tab
                                    ? "bg-gray-700 text-gray-100"
                                    : "text-gray-500 hover:text-gray-300"
                            }`}
                        >
                            {tab}
                            {tab === "submit" && submitResult && (
                                <span
                                    className={`ml-1.5 ${
                                        submitResult.status === "ACCEPTED"
                                            ? "text-green-400"
                                            : "text-red-400"
                                    }`}
                                >
                                    {submitResult.passedCount}/
                                    {submitResult.totalCount}
                                </span>
                            )}
                        </button>
                    ))}
                </div>

                <div className="flex gap-2">
                    <button
                        onClick={handleRun}
                        disabled={running || submitting}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-gray-700
                       hover:bg-gray-600 text-gray-200 rounded-lg disabled:opacity-40
                       disabled:cursor-not-allowed transition font-medium"
                    >
                        {running ? (
                            <>
                                <svg
                                    className="w-3 h-3 animate-spin"
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
                                Running...
                            </>
                        ) : (
                            <>
                                <svg
                                    className="w-3 h-3"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                                    />
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                Run
                            </>
                        )}
                    </button>

                    <button
                        onClick={handleSubmit}
                        disabled={running || submitting || !questionId}
                        className="flex items-center gap-1.5 text-xs px-3 py-1.5 bg-violet-600
                       hover:bg-violet-700 text-white rounded-lg disabled:opacity-40
                       disabled:cursor-not-allowed transition font-medium"
                        title={
                            !questionId ? "Select a question first" : undefined
                        }
                    >
                        {submitting ? (
                            <>
                                <svg
                                    className="w-3 h-3 animate-spin"
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
                                Submitting...
                            </>
                        ) : (
                            "Submit"
                        )}
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto">
                {activeTab === "run" && (
                    <div className="p-3 space-y-3">
                        {/* Custom stdin */}
                        <div>
                            <label className="block text-xs text-gray-500 mb-1 font-medium uppercase tracking-wide">
                                Custom input (stdin)
                            </label>
                            <textarea
                                rows={3}
                                value={stdin}
                                onChange={(e) => setStdin(e.target.value)}
                                placeholder="Optional — leave empty for no input"
                                className="w-full bg-gray-800 border border-gray-700 text-gray-300 text-xs
                           font-mono rounded-lg px-3 py-2 outline-none resize-y
                           focus:border-violet-500 placeholder-gray-600"
                            />
                        </div>

                        {/* Run error */}
                        {runError && (
                            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                                {runError}
                            </p>
                        )}

                        {/* Run result */}
                        {runResult && (
                            <div className="space-y-2">
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-gray-500">
                                        Status:
                                    </span>
                                    <span
                                        className={`text-xs font-medium ${
                                            runResult.status === "Accepted"
                                                ? "text-green-400"
                                                : "text-amber-400"
                                        }`}
                                    >
                                        {runResult.status}
                                    </span>
                                    {runResult.executionMs !== null && (
                                        <span className="text-xs text-gray-600">
                                            {runResult.executionMs}ms
                                        </span>
                                    )}
                                </div>

                                {runResult.stdout && (
                                    <div>
                                        <p className="text-xs text-gray-500 mb-1 uppercase tracking-wide font-medium">
                                            Output
                                        </p>
                                        <pre
                                            className="text-xs text-gray-200 bg-gray-800 border border-gray-700
                                    rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono"
                                        >
                                            {runResult.stdout}
                                        </pre>
                                    </div>
                                )}

                                {runResult.stderr && (
                                    <div>
                                        <p className="text-xs text-red-400 mb-1 uppercase tracking-wide font-medium">
                                            Error
                                        </p>
                                        <pre
                                            className="text-xs text-red-300 bg-red-900/20 border border-red-800/50
                                    rounded-lg p-3 overflow-x-auto whitespace-pre-wrap font-mono"
                                        >
                                            {runResult.stderr}
                                        </pre>
                                    </div>
                                )}
                            </div>
                        )}

                        {!runResult && !runError && !running && (
                            <p className="text-xs text-gray-600 text-center py-4">
                                Click Run to execute your code
                            </p>
                        )}
                    </div>
                )}

                {activeTab === "submit" && (
                    <div className="p-3 space-y-3">
                        {submitError && (
                            <p className="text-xs text-red-400 bg-red-900/20 border border-red-800/50 rounded-lg px-3 py-2">
                                {submitError}
                            </p>
                        )}

                        {!questionId && (
                            <p className="text-xs text-gray-600 text-center py-4">
                                Select a question from the panel on the left to
                                submit
                            </p>
                        )}

                        {submitResult && (
                            <div className="space-y-3">
                                {/* Overall result banner */}
                                <div
                                    className={`flex items-center justify-between px-4 py-3 rounded-xl border ${
                                        submitResult.status === "ACCEPTED"
                                            ? "bg-green-900/30 border-green-800/50"
                                            : "bg-red-900/30 border-red-800/50"
                                    }`}
                                >
                                    <div>
                                        <StatusBadge
                                            status={submitResult.status}
                                        />
                                        <p
                                            className={`text-sm font-semibold mt-1 ${
                                                submitResult.status ===
                                                "ACCEPTED"
                                                    ? "text-green-300"
                                                    : "text-red-300"
                                            }`}
                                        >
                                            {submitResult.status === "ACCEPTED"
                                                ? "🎉 All test cases passed!"
                                                : "Some test cases failed"}
                                        </p>
                                    </div>
                                    <div className="text-right">
                                        <p
                                            className={`text-2xl font-bold ${
                                                submitResult.status ===
                                                "ACCEPTED"
                                                    ? "text-green-400"
                                                    : "text-red-400"
                                            }`}
                                        >
                                            {submitResult.passedCount}/
                                            {submitResult.totalCount}
                                        </p>
                                        <p className="text-xs text-gray-500">
                                            tests passed
                                        </p>
                                    </div>
                                </div>

                                {/* Per test case results */}
                                <div className="space-y-2">
                                    {submitResult.results.map((r, i) => (
                                        <TestCaseRow
                                            key={r.testCaseId}
                                            result={r}
                                            index={i}
                                        />
                                    ))}
                                </div>
                            </div>
                        )}

                        {!submitResult && !submitError && questionId && (
                            <p className="text-xs text-gray-600 text-center py-4">
                                Click Submit to run against all test cases
                            </p>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
