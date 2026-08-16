import { api } from "../lib/api";
import type { SupportedLanguage } from "../types";

export interface ExecuteResult {
    stdout: string;
    stderr: string;
    status: string;
    executionMs: number | null;
    memoryKB: number | null;
    exitCode: number | null;
}

export interface TestCaseResult {
    testCaseId: string;
    passed: boolean;
    stdout: string | null;
    expected: string | null;
    executionMs: number | null;
    status: string;
}

export interface SubmitResult {
    status: "ACCEPTED" | "WRONG_ANSWER" | "TLE" | "MLE" | "ERROR";
    passedCount: number;
    totalCount: number;
    results: TestCaseResult[];
}

export async function runCodeApi(payload: {
    code: string;
    language: SupportedLanguage;
    stdin?: string;
    questionId?: string;
}): Promise<ExecuteResult> {
    const res = await api.post("/api/v1/execute", payload);
    return res.data.data;
}

export async function submitCodeApi(payload: {
    code: string;
    language: SupportedLanguage;
    questionId: string;
    roomId?: string;
}): Promise<SubmitResult> {
    const res = await api.post("/api/v1/submit", payload);
    return res.data.data;
}
