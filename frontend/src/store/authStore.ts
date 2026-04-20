import type { User } from "../types";
import { create } from "zustand";
import { persist } from "zustand/middleware";

interface AuthState {
    user: User | null;
    token: string | null;
    isAuthenticated: boolean;
    login: (user: User, token: string) => void;
    logout: () => void;
    isAdmin: () => boolean;
}

export const useAuthStore = create<AuthState>()(
    persist(
        (set, get) => ({
            user: null,
            token: null,
            isAuthenticated: false,
            login: (user, token) => {
                localStorage.setItem("accessToken", token);
                set({ user, token, isAuthenticated: true });
            },
            logout: () => {
                localStorage.removeItem("accessToken");
                set({ user: null, token: null, isAuthenticated: false });
            },
            isAdmin: () => get().user?.role === "ADMIN",
        }),
        {
            name: "auth-storage",
            partialize: (state) => ({
                user: state.user,
                token: state.token,
                isAuthenticated: state.isAuthenticated,
            }),
        },
    ),
);
