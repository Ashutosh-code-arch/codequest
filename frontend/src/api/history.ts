import { api } from "../lib/api";

export interface HistoryRoom {
    id: string;
    status: string;
    language: string;
    startedAt: string;
    endedAt: string | null;
    timerSeconds: number;
    participantCount: number;
    creator: { id: string; username: string };
    joinedAt: string;
    questions: Array<{
        questionId: string;
        title: string;
        difficulty: string;
        myBestStatus: string | null;
    }>;
}

export interface SessionDetail {
    room: {
        id: string;
        status: string;
        language: string;
        startedAt: string;
        endedAt: string | null;
        creator: { id: string; username: string };
        participants: Array<{
            userId: string;
            user: { id: string; username: string };
        }>;
        questions: Array<{
            questionId: string;
            question: {
                id: string;
                title: string;
                difficulty: string;
                description: string;
                tags: string[];
            };
        }>;
    };
    submissions: Array<{
        id: string;
        questionId: string;
        status: string;
        language: string;
        code: string;
        submittedAt: string;
        question: { id: string; title: string };
    }>;
    latestSnapshot: {
        id: string;
        code: string;
        language: string;
        savedAt: string;
    } | null;
}

export async function getHistoryApi(): Promise<HistoryRoom[]> {
    const res = await api.get("/api/v1/history");
    return res.data.data.rooms;
}

export async function getSessionDetailApi(
    roomId: string,
): Promise<SessionDetail> {
    const res = await api.get(`/api/v1/history/${roomId}`);
    return res.data.data;
}
