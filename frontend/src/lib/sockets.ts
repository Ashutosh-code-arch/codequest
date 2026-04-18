import { io } from "socket.io-client";
export const socket = io(import.meta.env.VITE_WS_URL as string, {
    autoConnect: false,
    auth: {
        token: localStorage.getItem("accessToken"),
    },
});
