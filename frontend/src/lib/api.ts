import axios from "axios";
import { useAuthStore } from "../store/authStore";

export const api = axios.create({
    baseURL: import.meta.env.VITE_API_URL as string,
    withCredentials: true,
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem("accessToken");
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

let handlingUnauthorized = false;

api.interceptors.response.use(
    (res) => res,
    (error) => {
        if (error.response?.status === 401 && !handlingUnauthorized) {
            handlingUnauthorized = true;
            useAuthStore.getState().logout();

            if (window.location.pathname !== "/login") {
                window.location.replace("/login");
            } else {
                handlingUnauthorized = false;
            }
        }
        return Promise.reject(error);
    },
);
