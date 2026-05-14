import type { Socket, Server } from "socket.io";

export interface ChatMessagePayload {
    id: string;
    roomId: string;
    userId: string;
    username: string;
    content: string;
    createdAt: string;
    type: "message" | "system";
}

export interface ServerToClientEvents {
    "room:user-joined": (data: {
        user: { id: string; username: string };
        participantCount: number;
    }) => void;
    "room:user-left": (data: {
        userId: string;
        userName: string;
        participantCount: number;
    }) => void;
    "room:full": (data: { message: string }) => void;
    "room:terminated": (data: { reason: string }) => void;
    "timer:tick": (data: { secondsRemaining: number }) => void;
    "timer:sync": (data: { secondsRemaining: number }) => void;
    "room:time-up": () => void;
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
    "chat:new-message": (data: ChatMessagePayload) => void;
    "chat:history": (data: ChatMessagePayload[]) => void;
    "webrtc:signal": (data: WebRTCSignal) => void;
    "webrtc:existing-peers": (data: { peers: PeerInfo[] }) => void;
    "webrtc:peer-left": (data: { userId: string; socketId: string }) => void;
    error: (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
    "room:join": (data: { roomId: string }) => void;
    "room:leave": (data: { roomId: string }) => void;
    "timer:sync-request": (data: { roomId: string }) => void;
    "yjs:message": (data: ArrayBuffer) => void;
    "yjs:sync-request": (data?: { questionId?: string }) => void;
    "language:change": (data: { roomId: string; language: string }) => void;
    "chat:message": (data: { roomId: string; content: string }) => void;
    "webrtc:join": (data: { roomId: string }) => void;
    "webrtc:leave": (data: { roomId: string }) => void;
    "webrtc:signal": (data: WebRTCSignalPayload) => void;
}

export interface SocketData {
    roomId: string;
    userId: string;
    username: string;
    role: string;
    language: string;
}

export type TypedServer = Server<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;

export type TypedSocket = Socket<
    ClientToServerEvents,
    ServerToClientEvents,
    Record<string, never>,
    SocketData
>;

export type RTCSignalData =
    | { type: "offer"; sdp: string }
    | { type: "answer"; sdp: string }
    | { type: "ice-candidate"; candidate: RTCIceCandidateInit };

export interface WebRTCSignal {
    from: string;
    userId: string;
    signal: RTCSignalData;
}

export interface WebRTCSignalPayload {
    to: string;
    signal: RTCSignalData;
}

export interface PeerInfo {
    socketId: string;
    userId: string;
    username: string;
}
