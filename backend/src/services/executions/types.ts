export type SupportedLanguage = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";

export interface ExecuteOptions {
    code: string;
    language: SupportedLanguage;
    stdin?: string;
    timeLimit?: number; // milliseconds, default 2000
    memoryLimit?: number; // MB, default 256
}

export interface ExecuteResult {
    stdout: string;
    stderr: string;
    status: string; // "Accepted" | "Time Limit Exceeded" | "Runtime Error" | etc
    executionMs: number | null;
    memoryKB: number | null;
    exitCode: number | null;
}

export interface TestCaseResult {
    testCaseId: string;
    passed: boolean;
    stdout: string | null; // null if hidden
    expected: string | null; // null if hidden
    executionMs: number | null;
    status: string;
}

export interface SubmitResult {
    status: "ACCEPTED" | "WRONG_ANSWER" | "TLE" | "MLE" | "ERROR";
    results: TestCaseResult[];
    passedCount: number;
    totalCount: number;
}
