export type Role = "ADMIN" | "USER";
export type Language = "JAVASCRIPT" | "JAVA" | "PYTHON" | "CPP" | "C";
export type RoomStatus = "ACTIVE" | "ENDED" | "TERMINATED";

export interface AuthPayload {
    userId: string;
    role: Role;
    email: string;
}

export interface ApiResponse<T> {
    success: boolean;
    data?: T;
    error?: {
        code: string;
        message: string;
        statusCode: number;
    };
}

declare global {
    namespace Express {
        interface Request {
            user?: {
                id: string;
                email: string;
                username: string;
                role: Role;
            };
        }
    }
}
