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
    "yjs:message": (data: ArrayBuffer) => void;
    "language:changed": (data: {
        language: string;
        starterCode: string;
    }) => void;
    "room:existing-participants": (data: {
        participants: Array<{
            userId: string;
            username: string;
            isActive: boolean;
        }>;
    }) => void;
    "chat:new-message": (data: import("../types").ChatMessage) => void;
    "chat:history": (data: import("../types").ChatMessage[]) => void;
    "webrtc:signal": (data: import("../types/webrtc").WebRTCSignal) => void;
    "webrtc:existing-peers": (data: {
        peers: import("../types/webrtc").PeerInfo[];
    }) => void;
    "webrtc:peer-left": (data: { userId: string; socketId: string }) => void;
}

interface ClientToServerEvents {
    "room:join": (data: { roomId: string }) => void;
    "room:leave": (data: { roomId: string }) => void;
    "timer:sync-request": (data: { roomId: string }) => void;
    "yjs:message": (data: ArrayBuffer) => void;
    "yjs:sync-request": () => void;
    "language:change": (data: { roomId: string; language: string }) => void;
    "chat:message": (data: { roomId: string; content: string }) => void;
    "webrtc:join": (data: { roomId: string }) => void;
    "webrtc:leave": (data: { roomId: string }) => void;
    "webrtc:signal": (data: {
        to: string;
        signal: import("../types/webrtc").RTCSignalData;
    }) => void;
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
