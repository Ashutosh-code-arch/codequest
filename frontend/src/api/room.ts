import { api } from "../lib/api";
import type { Room } from "../types";

export interface CreateRoomPayload {
    questionIds: string[];
    timerSeconds: number;
    language: string;
}

export async function createRoomApi(
    payload: CreateRoomPayload,
): Promise<{ id: string }> {
    const res = await api.post("/api/v1/rooms", payload);
    return res.data.data.room;
}

export async function joinRoomApi(roomId: string): Promise<Room> {
    const res = await api.post(`/api/v1/rooms/${roomId}/join`);
    return res.data.data.room;
}

export async function getRoomApi(roomId: string): Promise<Room> {
    const res = await api.get(`/api/v1/rooms/${roomId}`);
    return res.data.data.room;
}

export async function getUserRoomsApi(): Promise<Room[]> {
    const res = await api.get("/api/v1/rooms");
    return res.data.data.rooms;
}

export async function getPublicQuestionsApi() {
    const res = await api.get("/api/v1/rooms/questions");
    return res.data.data.questions as Array<{
        id: string;
        title: string;
        difficulty: string;
        tags: string[];
        _count: { testCases: number };
    }>;
}
