import { useEffect, useRef, useState } from "react";
import * as Y from "yjs";
import { MonacoBinding } from "y-monaco";
import * as syncProtocol from "y-protocols/sync";
import * as awarenessProtocol from "y-protocols/awareness";
import * as encoding from "lib0/encoding";
import * as decoding from "lib0/decoding";
import type * as Monaco from "monaco-editor";
import { socket } from "../lib/sockets";

const MSG_SYNC = 0;
const MSG_AWARENESS = 1;

// Cursor colours — one per user slot (max 4 in a room)
export const CURSOR_COLORS = ["#7C3AED", "#0891B2", "#D97706", "#BE185D"];

interface UseCollabEditorOptions {
    roomId: string;
    userId: string;
    username: string;
    language: string;
    questionId?: string;
}

export function useCollabEditor({
    roomId,
    userId,
    username,
    language,
    questionId,
}: UseCollabEditorOptions) {
    const ydocRef = useRef<Y.Doc | null>(null);
    const awarenessRef = useRef<awarenessProtocol.Awareness | null>(null);
    const bindingRef = useRef<MonacoBinding | null>(null);
    const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(null);
    const colorRef = useRef<string>(CURSOR_COLORS[0]);
    const [synced, setSynced] = useState(false);

    // Step 1 — create Y.Doc and awareness, set up socket message handler
    useEffect(() => {
        bindingRef.current?.destroy();
        ydocRef.current?.destroy();

        const ydoc = new Y.Doc();
        const awareness = new awarenessProtocol.Awareness(ydoc);

        ydocRef.current = ydoc;
        awarenessRef.current = awareness;

        if (editorRef.current) {
            bindingRef.current = new MonacoBinding(
                ydoc.getText("monaco"),
                editorRef.current.getModel()!,
                new Set([editorRef.current]),
                awareness,
            );
        }

        // Pick a colour based on userId hash (stable per user)
        const hash = userId
            .split("")
            .reduce((acc, c) => acc + c.charCodeAt(0), 0);
        colorRef.current = CURSOR_COLORS[hash % CURSOR_COLORS.length];

        // Set our own awareness state (name + colour)
        awareness.setLocalStateField("user", {
            name: username,
            color: colorRef.current,
            userId,
        });

        // ── Handle incoming Y.js messages from server ──────────────────────────
        function handleYjsMessage(data: ArrayBuffer) {
            const arr = new Uint8Array(data);
            const decoder = decoding.createDecoder(arr);
            const msgType = decoding.readVarUint(decoder);

            if (msgType === MSG_SYNC) {
                const encoder = encoding.createEncoder();
                encoding.writeVarUint(encoder, MSG_SYNC);
                const syncMessageType = syncProtocol.readSyncMessage(
                    decoder,
                    encoder,
                    ydoc,
                    null,
                );

                if (syncMessageType === syncProtocol.messageYjsSyncStep1) {
                    // Server sent step1 — reply with step2 (our full state)
                    const reply = encoding.toUint8Array(encoder);
                    if (reply.length > 1)
                        socket.emit("yjs:message", reply.buffer as ArrayBuffer);
                }

                setSynced(true);
            } else if (msgType === MSG_AWARENESS) {
                const update = decoding.readVarUint8Array(decoder);
                awarenessProtocol.applyAwarenessUpdate(
                    awareness,
                    update,
                    "server",
                );
            }
        }

        socket.on("yjs:message", handleYjsMessage);

        // ── Push local Y.js updates to server ─────────────────────────────────
        function handleDocUpdate(update: Uint8Array) {
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MSG_SYNC);
            syncProtocol.writeUpdate(encoder, update);
            socket.emit(
                "yjs:message",
                encoding.toUint8Array(encoder).buffer as ArrayBuffer,
            );
        }

        ydoc.on("update", handleDocUpdate);

        // ── Push awareness updates (cursor moves) to server ───────────────────
        function handleAwarenessUpdate({
            added,
            updated,
            removed,
        }: {
            added: number[];
            updated: number[];
            removed: number[];
        }) {
            const changedClients = [...added, ...updated, ...removed];
            const encoder = encoding.createEncoder();
            encoding.writeVarUint(encoder, MSG_AWARENESS);
            encoding.writeVarUint8Array(
                encoder,
                awarenessProtocol.encodeAwarenessUpdate(
                    awareness,
                    changedClients,
                ),
            );
            socket.emit(
                "yjs:message",
                encoding.toUint8Array(encoder).buffer as ArrayBuffer,
            );
        }

        awareness.on("update", handleAwarenessUpdate);

        // ── Request current document state from server ─────────────────────────
        socket.emit("yjs:sync-request", { questionId });

        return () => {
            socket.off("yjs:message", handleYjsMessage);
            ydoc.off("update", handleDocUpdate);
            awareness.off("update", handleAwarenessUpdate);
            awarenessProtocol.removeAwarenessStates(
                awareness,
                [ydoc.clientID],
                "disconnect",
            );
            bindingRef.current?.destroy();
            ydoc.destroy();
        };
    }, [roomId, userId, username, language, questionId]);

    // Step 2 — bind Y.Doc to Monaco editor instance
    function bindEditor(editor: Monaco.editor.IStandaloneCodeEditor) {
        if (!ydocRef.current || !awarenessRef.current) return;

        editorRef.current = editor;
        bindingRef.current?.destroy();
        const yText = ydocRef.current.getText("monaco");

        // MonacoBinding wires the Y.Text to the editor model
        // and renders remote cursors automatically via awareness
        bindingRef.current = new MonacoBinding(
            yText,
            editor.getModel()!,
            new Set([editor]),
            awarenessRef.current,
        );
    }

    function insertStarterCode(code: string) {
        if (!ydocRef.current) return;
        const yText = ydocRef.current.getText("monaco");
        if (yText.toString().trim() !== "") return; // don't overwrite existing code
        ydocRef.current.transact(() => {
            yText.delete(0, yText.length);
            yText.insert(0, code);
        });
    }

    return {
        bindEditor,
        synced,
        color: colorRef,
        getYDoc: () => ydocRef.current,
        insertStarterCode,
    };
}
