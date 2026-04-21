export type ROLE = "ADMIN" | "USER";
export type Language = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";
export type RoomStatus = "ACTIVE" | "ENDED" | "TERMINATED";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";

export interface User {
    id: string;
    email: string;
    username: string;
    role: ROLE;
}

export interface Room {
    id: string;
    creatorId: string;
    status: string;
    language: Language;
    timerSeconds: number;
    startedAt: string;
    participants: Participant[];
    questions: Question[];
}

export interface Participant {
    userId: string;
    username: string;
    isActive: boolean;
}

export interface Question {
    id: string;
    title: string;
    description: string;
    difficulty: Difficulty;
    tags: string[];
}

export interface TestCase {
    id: string;
    questionId: string;
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    timeLimit: number;
    memoryLimit: number;
}
export interface ChatMessage {
    id: string;
    userId: string;
    username: string;
    content: string;
    createdAt: string;
}
export interface ExecutionResult {
    stdout: string;
    stderr: string;
    status: string;
    executionMs: number;
}

export interface SubmissionResult {
    status: "ACCEPTED" | "WRONG_ANSWER" | "TLE" | "MLE" | "ERROR";
    results: TestCaseResult[];
}

export interface TestCaseResult {
    testCaseId: string;
    passed: boolean;
    stdout: string | null;
    expected: string | null;
    executionMs: number;
}
