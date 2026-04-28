import { useEffect, useRef, useState, useCallback } from "react";
import type { ChatMessage } from "../../types";
import { formatDistanceToNow, isToday } from "date-fns";

// ── Format timestamp ──────────────────────────────────────────────────────
function formatTime(iso: string): string {
    const d = new Date(iso);
    if (isToday(d)) {
        const dist = formatDistanceToNow(d, { addSuffix: false });
        // "less than a minute" → "just now"
        if (dist.includes("less than")) return "just now";
        return dist + " ago";
    }
    // Yesterday or older — show date
    return d.toLocaleDateString([], { month: "short", day: "numeric" });
}

// ── Single message bubble ─────────────────────────────────────────────────
function MessageBubble({ msg, isOwn }: { msg: ChatMessage; isOwn: boolean }) {
    if (msg.type === "system") {
        return (
            <div className="flex justify-center my-1">
                <span className="text-xs text-gray-600 italic px-2">
                    {msg.content}
                </span>
            </div>
        );
    }

    return (
        <div
            className={`flex flex-col ${isOwn ? "items-end" : "items-start"} mb-2`}
        >
            {/* Username + time */}
            <div
                className={`flex items-baseline gap-1.5 mb-0.5 ${isOwn ? "flex-row-reverse" : ""}`}
            >
                <span className="text-xs font-medium text-gray-400">
                    {isOwn ? "You" : msg.username}
                </span>
                <span className="text-xs text-gray-600">
                    {formatTime(msg.createdAt)}
                </span>
            </div>

            {/* Bubble */}
            <div
                className={`max-w-[85%] px-3 py-2 rounded-2xl text-sm leading-relaxed break-words ${
                    isOwn
                        ? "bg-violet-600 text-white rounded-tr-sm"
                        : "bg-gray-700 text-gray-100 rounded-tl-sm"
                } ${msg.id.startsWith("optimistic-") ? "opacity-60" : ""}`}
            >
                {msg.content}
            </div>
        </div>
    );
}

// ── Chat panel ────────────────────────────────────────────────────────────
interface ChatPanelProps {
    messages: ChatMessage[];
    userId: string;
    sendError: string;
    onSend: (content: string) => void;
}

export default function ChatPanel({
    messages,
    userId,
    sendError,
    onSend,
}: ChatPanelProps) {
    const listRef = useRef<HTMLDivElement>(null);
    const inputRef = useRef<HTMLTextAreaElement>(null);
    const [input, setInput] = useState("");
    const atBottomRef = useRef(true);

    // Track whether user is scrolled to bottom
    function handleScroll() {
        const el = listRef.current;
        if (!el) return;
        const distFromBottom = el.scrollHeight - el.scrollTop - el.clientHeight;
        atBottomRef.current = distFromBottom < 40;
    }

    // Auto-scroll only when already at bottom
    useEffect(() => {
        if (atBottomRef.current && listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, [messages]);

    // Scroll to bottom on first load
    useEffect(() => {
        if (listRef.current) {
            listRef.current.scrollTop = listRef.current.scrollHeight;
        }
    }, []);

    const handleSend = useCallback(() => {
        const trimmed = input.trim();
        if (!trimmed) return;
        onSend(trimmed);
        setInput("");
        // Re-focus input after send
        inputRef.current?.focus();
        // Force scroll to bottom on own send
        atBottomRef.current = true;
    }, [input, onSend]);

    function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            handleSend();
        }
    }

    const charCount = input.length;

    return (
        <div className="flex flex-col h-full bg-gray-800">
            {/* Header */}
            <div className="px-3 py-2.5 border-b border-gray-700 shrink-0">
                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                    Chat
                </p>
            </div>

            {/* Messages list */}
            <div
                ref={listRef}
                onScroll={handleScroll}
                className="flex-1 overflow-y-auto px-3 py-3 space-y-0.5"
            >
                {messages.length === 0 ? (
                    <div className="flex items-center justify-center h-full">
                        <p className="text-xs text-gray-600 text-center">
                            No messages yet.
                            <br />
                            Say hello!
                        </p>
                    </div>
                ) : (
                    messages.map((msg) => (
                        <MessageBubble
                            key={msg.id}
                            msg={msg}
                            isOwn={msg.userId === userId}
                        />
                    ))
                )}
            </div>

            {/* Input area */}
            <div className="shrink-0 border-t border-gray-700 p-2">
                {sendError && (
                    <p className="text-xs text-red-400 mb-1.5 px-1">
                        {sendError}
                    </p>
                )}
                <div className="flex gap-2 items-end">
                    <div className="flex-1 relative">
                        <textarea
                            ref={inputRef}
                            rows={1}
                            maxLength={2000}
                            placeholder="Message... (Enter to send)"
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={handleKeyDown}
                            className="w-full resize-none bg-gray-700 text-gray-100 text-sm
                         placeholder-gray-500 rounded-xl px-3 py-2 outline-none
                         focus:ring-1 focus:ring-violet-500
                         max-h-28 overflow-y-auto leading-5"
                            style={{ height: "auto" }}
                            onInput={(e) => {
                                const t = e.currentTarget;
                                t.style.height = "auto";
                                t.style.height =
                                    Math.min(t.scrollHeight, 112) + "px";
                            }}
                        />
                        {charCount > 1800 && (
                            <span
                                className={`absolute bottom-1.5 right-2 text-xs ${charCount > 1950 ? "text-red-400" : "text-gray-500"}`}
                            >
                                {charCount}/2000
                            </span>
                        )}
                    </div>
                    <button
                        onClick={handleSend}
                        disabled={!input.trim()}
                        className="shrink-0 w-8 h-8 rounded-xl bg-violet-600 hover:bg-violet-700
                       disabled:opacity-40 disabled:cursor-not-allowed
                       flex items-center justify-center transition"
                    >
                        <svg
                            className="w-3.5 h-3.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2.5}
                                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                            />
                        </svg>
                    </button>
                </div>
                <p className="text-xs text-gray-600 mt-1 px-1">
                    Shift+Enter for new line
                </p>
            </div>
        </div>
    );
}
