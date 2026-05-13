import { api } from "../lib/api";
import type { Question, TestCase } from "../types";

// ---------- Types -----------------
export interface QuestionWithCount extends Question {
    _count: { testCases: number };
}

export interface QuestionWithTestCases extends Question {
    testCases: TestCase[];
}

export interface PaginatedQuestions {
    questions: QuestionWithCount[];
    total: number;
    page: number;
    totalPages: number;
}

export interface CreateQuestionPayload {
    title: string;
    description: string;
    difficulty: "EASY" | "MEDIUM" | "HARD";
    tags: string[];
    starterCode?: Record<string, string>;
    driverCode?: Record<string, string>;
}

export interface CreateTestCasePayload {
    input: string;
    expectedOutput: string;
    isHidden: boolean;
    timeLimit: number;
    memoryLimit: number;
}

// Question API calls ------------------

export async function getQuestionsApi(page = 1): Promise<PaginatedQuestions> {
    const res = await api.get(`/api/v1/admin/questions?page=${page}&limit=20`);
    return res.data.data;
}

export async function getQuestionApi(
    id: string,
): Promise<QuestionWithTestCases> {
    const res = await api.get(`/api/v1/admin/questions/${id}`);
    return res.data.data.question;
}

export async function createQuestionApi(
    payload: CreateQuestionPayload,
): Promise<Question> {
    const res = await api.post(`/api/v1/admin/questions`, payload);
    return res.data.data.question;
}

export async function updateQuestionApi(
    id: string,
    payload: Partial<CreateQuestionPayload>,
): Promise<Question> {
    const res = await api.post(`/api/v1/admin/questions/${id}`, payload);
    return res.data.data.question;
}

export async function deleteQuestionApi(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/questions/${id}`);
}

// ---------- Test Case API calls

export async function createTestCaseApi(
    questionId: string,
    payload: CreateTestCasePayload,
): Promise<TestCase> {
    const res = await api.post(
        `/api/v1/admin/questions/${questionId}/testcases`,
        payload,
    );
    return res.data.data.testCase;
}

export async function updateTestCaseApi(
    id: string,
    payload: Partial<CreateTestCasePayload>,
): Promise<TestCase> {
    const res = await api.put(`/api/v1/admin/testcases/${id}`, payload);
    return res.data.data.testCase;
}

export async function deleteTestCaseApi(id: string): Promise<void> {
    await api.delete(`/api/v1/admin/testcases/${id}`);
}

// ----------- Rooms ------------

export async function getAdminRoomsApi() {
    const res = await api.get(`/api/v1/admin/rooms`);
    return res.data.data;
}

export async function terminateRoomApi(id: string): Promise<void> {
    await api.post(`/api/v1/admin/rooms/${id}/terminate`);
}
