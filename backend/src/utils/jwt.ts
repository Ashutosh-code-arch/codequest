import jwt from "jsonwebtoken";
import { AuthPayload } from "../types";

const SECRET = process.env.JWT_SECRET!;
const EXPIRES_IN = process.env.JWT_EXPIRES_IN ?? "15m";

export function signToken(payload: AuthPayload): string {
    return jwt.sign(payload, SECRET, { expiresIn: EXPIRES_IN as any });
}

export function verifyToken(token: string): AuthPayload {
    return jwt.verify(token, SECRET) as AuthPayload;
}
