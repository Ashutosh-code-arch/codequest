export interface WebRTCSignal {
    from: string;
    userId: string;
    signal: RTCSignalData;
}

export interface PeerInfo {
    socketId: string;
    userId: string;
    username: string;
}

export type RTCSignalData =
    | { type: "offer"; sdp: string }
    | { type: "answer"; sdp: string }
    | { type: "ice-candidate"; candidate: RTCIceCandidateInit };
