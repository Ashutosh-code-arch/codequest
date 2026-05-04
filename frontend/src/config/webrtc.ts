export const ICE_SERVERS: RTCConfiguration = {
    iceServers: [
        { urls: "stun:stun.l.google.com:19302" },
        { urls: "stun:stun1.l.google.com:19302" },
        {
            urls: (import.meta.env.VITE_TURN_URL as string) ?? "",
            username: (import.meta.env.VITE_TURN_USERNAME as string) ?? "",
            credential: (import.meta.env.VITE_TURN_CREDENTIAL as string) ?? "",
        },
    ],
    iceCandidatePoolSize: 10,
};
