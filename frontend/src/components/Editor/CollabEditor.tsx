import { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import MonacoEditor, { type OnMount } from "@monaco-editor/react";
import type * as Monaco from "monaco-editor";
import {
    LANGUAGE_CONFIG,
    LANGUAGE_KEYS,
    type LangKey,
} from "../../config/languages";
import { useCollabEditor } from "../../hooks/useCollabEditor";
import { socket } from "../../lib/sockets";

interface CollabEditorProps {
    roomId: string;
    userId: string;
    username: string;
    language: LangKey;
    onLanguageChange: (lang: LangKey) => void;
    onCodeChange?: (code: string) => void;
    codeRef: { current: string };
    questionId?: string | null;
}
export interface CollabEditorHandle {
    insertStarterCode: (code: string) => void;
    getCode: () => string;
}

const CollabEditor = forwardRef<CollabEditorHandle, CollabEditorProps>(
    (props, ref) => {
        const editorRef = useRef<Monaco.editor.IStandaloneCodeEditor | null>(
            null,
        );
        const { bindEditor, synced, insertStarterCode, getYDoc } =
            useCollabEditor({
                roomId: props.roomId,
                userId: props.userId,
                username: props.username,
                language: props.language,
                questionId: props.questionId ?? undefined,
            });

        useImperativeHandle(ref, () => ({
            insertStarterCode,
            getCode: () => getYDoc()?.getText("monaco").toString() ?? "",
        }));

        const handleMount: OnMount = (editor) => {
            editorRef.current = editor;
            bindEditor(editor);

            if (props.codeRef) props.codeRef.current = editor.getValue();
            // Listen for model content changes to expose current code
            editor.onDidChangeModelContent(() => {
                const latest = editor.getValue();
                if (props.codeRef) props.codeRef.current = latest;
                props.onCodeChange?.(latest);
            });

            // Also expose initial code on mount:
            props.onCodeChange?.(editor.getValue());

            // Auto-focus editor on mount
            editor.focus();
        };

        useEffect(() => {
            const ydoc = getYDoc();
            if (!ydoc || !props.codeRef) return;

            const yText = ydoc.getText("monaco");

            function updateRef() {
                if (props.codeRef) props.codeRef.current = yText.toString();
            }

            // Set immediately
            updateRef();

            // Keep updated as Y.js syncs
            yText.observe(updateRef);

            return () => {
                yText.unobserve(updateRef);
            };
        }, [getYDoc, props.codeRef]);

        function handleLanguageChange(newLang: LangKey) {
            socket.emit("language:change", {
                roomId: props.roomId,
                language: newLang,
            });
            props.onLanguageChange(newLang);
        }

        const monacoLang =
            LANGUAGE_CONFIG[props.language]?.monacoLang ?? "javascript";

        return (
            <div className="flex flex-col h-full">
                {/* Toolbar */}
                <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700 shrink-0">
                    <div className="flex items-center gap-2">
                        {/* Language selector */}
                        <div className="flex gap-1">
                            {LANGUAGE_KEYS.map((l) => (
                                <button
                                    key={l}
                                    onClick={() => handleLanguageChange(l)}
                                    className={`text-xs px-2.5 py-1 rounded font-medium transition ${
                                        props.language === l
                                            ? "bg-violet-600 text-white"
                                            : "text-gray-400 hover:text-gray-200 hover:bg-gray-700"
                                    }`}
                                >
                                    {LANGUAGE_CONFIG[l].label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Sync indicator */}
                    <div className="flex items-center gap-1.5">
                        <div
                            className={`w-1.5 h-1.5 rounded-full ${synced ? "bg-green-400" : "bg-amber-400 animate-pulse"}`}
                        />
                        <span className="text-xs text-gray-500">
                            {synced ? "Synced" : "Connecting..."}
                        </span>
                    </div>
                </div>

                {/* Monaco */}
                <div className="flex-1 overflow-hidden">
                    <MonacoEditor
                        height="100%"
                        language={monacoLang}
                        theme="vs-dark"
                        onMount={handleMount}
                        options={{
                            fontSize: 14,
                            fontFamily:
                                "'JetBrains Mono', 'Fira Code', monospace",
                            fontLigatures: true,
                            lineHeight: 22,
                            minimap: { enabled: false },
                            scrollBeyondLastLine: false,
                            renderWhitespace: "selection",
                            cursorBlinking: "smooth",
                            smoothScrolling: true,
                            padding: { top: 16, bottom: 16 },
                            automaticLayout: true, // resizes when panel resizes
                            tabSize: 2,
                            wordWrap: "on",
                            bracketPairColorization: { enabled: true },
                            suggest: { showKeywords: true },
                        }}
                    />
                </div>
            </div>
        );
    },
);

export default CollabEditor;
