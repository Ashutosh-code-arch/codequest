export type ROLE = "ADMIN" | "USER";
export type Language = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";
export type RoomStatus = "ACTIVE" | "ENDED" | "TERMINATED";
export type Difficulty = "EASY" | "MEDIUM" | "HARD";
export type SupportedLanguage = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";

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
    maxUsers: number;
    startedAt: string;
    endedAt: string | null;
    creator: { id: string; username: string };
    participants: Participant[];
    questions: RoomQuestion[];
}

export interface RoomQuestion {
    roomId: string;
    questionId: string;
    addedAt: string;
    question: {
        id: string;
        title: string;
        description: string;
        difficulty: string;
        tags: string[];
        isActive: boolean;
        createdById: string;
        createdAt: string;
        updatedAt: string;
    };
}

export interface Participant {
    id: string;
    userId: string;
    isActive: boolean;
    joinedAt: string;
    leftAt: string | null;
    user: {
        id: string;
        username: string;
    };
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
    roomId: string;
    userId: string;
    username: string;
    content: string;
    createdAt: string;
    type: "message" | "system";
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
