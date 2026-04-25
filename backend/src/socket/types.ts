import type { Socket, Server } from "socket.io";

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
    error: (data: { code: string; message: string }) => void;
}

export interface ClientToServerEvents {
    "room:join": (data: { roomId: string }) => void;
    "room:leave": (data: { roomId: string }) => void;
    "timer:sync-request": (data: { roomId: string }) => void;
    "yjs:message": (data: ArrayBuffer) => void;
    "yjs:sync-request": () => void;
    "language:change": (data: { roomId: string; language: string }) => void;
}

export interface SocketData {
    roomId: string;
    userId: string;
    username: string;
    role: string;
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
