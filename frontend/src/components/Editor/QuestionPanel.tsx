import ReactMarkdown from "react-markdown";
import type { RoomQuestion } from "../../types";
import { useState } from "react";

interface QuestionPanelProps {
    questions: RoomQuestion[];
}

export default function QuestionPanel({ questions }: QuestionPanelProps) {
    const [activeIdx, setActiveIdx] = useState(0);

    if (!questions.length) return null;

    const activeRQ = questions[activeIdx];
    const active = activeRQ?.question;
    return (
        <div className="flex flex-col h-full bg-gray-900 border-r border-gray-700">
            {/* Question tabs */}
            {questions.length > 1 && (
                <div className="flex border-b border-gray-700 overflow-x-auto shrink-0">
                    {questions.map((rq, i) => (
                        <button
                            key={rq.questionId}
                            onClick={() => setActiveIdx(i)}
                            className={`text-xs px-4 py-2.5 whitespace-nowrap transition border-b-2 ${
                                activeIdx === i
                                    ? "text-violet-400 border-violet-400"
                                    : "text-gray-500 border-transparent hover:text-gray-300"
                            }`}
                        >
                            Q{i + 1}. {rq.question.title}
                        </button>
                    ))}
                </div>
            )}

            {/* Description */}
            <div className="flex-1 overflow-y-auto px-5 py-4">
                {active ? (
                    <>
                        <div className="flex items-start justify-between mb-3">
                            <h2 className="text-sm font-semibold text-gray-100">
                                {active.title}
                            </h2>
                            <span
                                className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                                    active.difficulty === "EASY"
                                        ? "bg-green-900/60 text-green-400"
                                        : active.difficulty === "MEDIUM"
                                          ? "bg-amber-900/60 text-amber-400"
                                          : "bg-red-900/60   text-red-400"
                                }`}
                            >
                                {active.difficulty}
                            </span>
                        </div>
                        <div
                            className="prose prose-invert prose-sm max-w-none
                            prose-p:text-gray-300
                            prose-code:text-violet-300
                            prose-pre:bg-gray-800
                            prose-headings:text-gray-100"
                        >
                            <ReactMarkdown>{active.description}</ReactMarkdown>
                        </div>
                        <div className="mt-4 flex flex-wrap gap-1.5">
                            {active.tags.map((t) => (
                                <span
                                    key={t}
                                    className="text-xs bg-gray-800 text-gray-400 px-2 py-0.5 rounded-full"
                                >
                                    {t}
                                </span>
                            ))}
                        </div>
                    </>
                ) : (
                    <p className="text-gray-500 text-sm">
                        No question selected
                    </p>
                )}
            </div>
        </div>
    );
}
