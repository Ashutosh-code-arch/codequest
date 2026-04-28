import { useState, useEffect, useCallback } from "react";
import type { ChatMessage } from "../types";
import { socket } from "../lib/sockets";

interface UseChatOptions {
    roomId: string;
    userId: string;
    isPanelOpen: boolean;
}

export function useChat({ roomId, userId, isPanelOpen }: UseChatOptions) {
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [unreadCount, setUnread] = useState(0);
    const [sendError, setSendError] = useState("");

    // ── Handle incoming messages ──────────────────────────────────────────
    useEffect(() => {
        function handleHistory(history: ChatMessage[]) {
            setMessages(history);
        }

        function handleNewMessage(msg: ChatMessage) {
            setMessages((prev) => {
                // Replace optimistic message if IDs match
                const optimisticIdx = prev.findIndex(
                    (m) =>
                        m.id.startsWith("optimistic-") &&
                        m.userId === msg.userId &&
                        m.content === msg.content,
                );
                if (optimisticIdx !== -1) {
                    const updated = [...prev];
                    updated[optimisticIdx] = msg;
                    return updated;
                }
                return [...prev, msg];
            });

            // Increment unread if panel is closed and message is from someone else
            if (
                !isPanelOpen &&
                msg.userId !== userId &&
                msg.type === "message"
            ) {
                setUnread((n) => n + 1);
            }
        }

        socket.on("chat:history", handleHistory);
        socket.on("chat:new-message", handleNewMessage);

        return () => {
            socket.off("chat:history", handleHistory);
            socket.off("chat:new-message", handleNewMessage);
        };
    }, [roomId, userId, isPanelOpen]);

    // Reset unread when panel opens
    // useEffect(() => {
    //     if (isPanelOpen) setUnread(0);
    // }, [isPanelOpen]);

    // ── Send message with optimistic update ───────────────────────────────
    const sendMessage = useCallback(
        (content: string) => {
            const trimmed = content.trim();
            if (!trimmed || trimmed.length > 2000) return;

            setSendError("");

            // Add optimistic message immediately
            const optimistic: ChatMessage = {
                id: `optimistic-${Date.now()}`,
                roomId,
                userId,
                username: "you", // replaced by real message from server
                content: trimmed,
                createdAt: new Date().toISOString(),
                type: "message",
            };
            setMessages((prev) => [...prev, optimistic]);

            socket.emit("chat:message", { roomId, content: trimmed });
        },
        [roomId, userId],
    );

    // Handle send errors
    useEffect(() => {
        function handleError({
            code,
            message,
        }: {
            code: string;
            message: string;
        }) {
            if (
                ["EMPTY_MESSAGE", "MESSAGE_TOO_LONG", "RATE_LIMITED"].includes(
                    code,
                )
            ) {
                setSendError(message);
                // Remove the optimistic message on error
                setMessages((prev) =>
                    prev.filter((m) => !m.id.startsWith("optimistic-")),
                );
                setTimeout(() => setSendError(""), 3000);
            }
        }
        socket.on("error", handleError);
        return () => {
            socket.off("error", handleError);
        };
    }, []);

    return { messages, unreadCount, sendMessage, sendError };
}
