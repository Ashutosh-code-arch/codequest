const turnUrl = (import.meta.env.VITE_TURN_URL as string | undefined)?.trim();

const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

if (turnUrl) {
    iceServers.push({
        urls: turnUrl,
        username: (import.meta.env.VITE_TURN_USERNAME as string) ?? "",
        credential: (import.meta.env.VITE_TURN_CREDENTIAL as string) ?? "",
    });
}

export const ICE_SERVERS: RTCConfiguration = {
    iceServers,
    iceCandidatePoolSize: 10,
};
