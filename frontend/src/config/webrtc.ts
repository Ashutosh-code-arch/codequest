const configuredTurnUrls = (
    (import.meta.env.VITE_TURN_URLS as string | undefined) ??
    (import.meta.env.VITE_TURN_URL as string | undefined) ??
    ""
)
    .split(",")
    .map((url) => url.trim())
    .filter(Boolean);

const turnUrls = Array.from(
    new Set(
        configuredTurnUrls.flatMap((url) => {
            if (!url.startsWith("turn:") || url.includes("transport=")) {
                return [url];
            }
            return [url, `${url}${url.includes("?") ? "&" : "?"}transport=tcp`];
        }),
    ),
);

const iceServers: RTCIceServer[] = [
    { urls: "stun:stun.l.google.com:19302" },
    { urls: "stun:stun1.l.google.com:19302" },
];

if (turnUrls.length > 0) {
    iceServers.push({
        urls: turnUrls,
        username: (import.meta.env.VITE_TURN_USERNAME as string) ?? "",
        credential: (import.meta.env.VITE_TURN_CREDENTIAL as string) ?? "",
    });
}

export const ICE_SERVERS: RTCConfiguration = {
    iceServers,
    iceCandidatePoolSize: 10,
};
