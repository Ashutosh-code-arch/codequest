import { api } from "../lib/api";
import type { User } from "../types";

interface AuthResponse {
    user: User;
    token: string;
}

export async function registerApi(data: {
    email: string;
    username: string;
    password: string;
}): Promise<AuthResponse> {
    const res = await api.post<{ success: boolean; data: AuthResponse }>(
        "/api/v1/auth/register",
        data,
    );
    return res.data.data!;
}

export async function loginApi(data: {
    email: string;
    password: string;
}): Promise<AuthResponse> {
    const res = await api.post<{ success: boolean; data: AuthResponse }>(
        "/api/v1/auth/login",
        data,
    );
    return res.data.data!;
}

export async function getMeApi(): Promise<unknown> {
    const res = await api.get<{ success: boolean; data: { user: User } }>(
        "api/v1/auth/me",
    );
    return res.data.data!.user;
}
