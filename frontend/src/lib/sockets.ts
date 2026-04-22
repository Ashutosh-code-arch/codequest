import { io, Socket } from "socket.io-client";

interface ServerToClientEvents {
    "room:user-joined": (data: {
        user: { id: string; username: string };
        participantCount: number;
    }) => void;
    "room:user-left": (data: {
        userId: string;
        username: string;
        participantCount: number;
    }) => void;
    "room:full": (data: { message: string }) => void;
    "room:terminated": (data: { reason: string }) => void;
    "timer:tick": (data: { secondsRemaining: number }) => void;
    "timer:sync": (data: { secondsRemaining: number }) => void;
    "room:time-up": () => void;
    error: (data: { code: string; message: string }) => void;
}

interface ClientToServerEvents {
    "room:join": (data: { roomId: string }) => void;
    "room:leave": (data: { roomId: string }) => void;
    "timer:sync-request": (data: { roomId: string }) => void;
}

export const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(
    import.meta.env.VITE_WS_URL as string,
    {
        autoConnect: false,
        transports: ["websocket"], // skip polling - faster connection
        auth: { token: "" },
    },
);

// Call this after login - sets the token and opens the connection
export function connectSocket(token: string) {
    socket.auth = { token };
    if (!socket.connected) socket.connect();
}

// Call an logout
export function disconnectSocket() {
    socket.disconnect();
}
