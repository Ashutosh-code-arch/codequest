import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../lib/sockets";
import { ICE_SERVERS } from "../config/webrtc";
import type { PeerInfo, WebRTCSignal } from "../types/webrtc";

export interface RemoteStream {
    socketId: string;
    userId: string;
    username: string;
    stream: MediaStream;
}

export type MediaStatus = "idle" | "requesting" | "ready" | "error";

function getMediaErrorMessage(error: unknown): string {
    const name = error instanceof DOMException ? error.name : "";
    switch (name) {
        case "NotAllowedError":
        case "SecurityError":
            return "Camera or microphone access is blocked. Allow both for this site in the browser and in macOS System Settings → Privacy & Security.";
        case "NotFoundError":
        case "DevicesNotFoundError":
            return "No usable camera or microphone was found. Connect a device and check the browser input settings.";
        case "NotReadableError":
        case "TrackStartError":
            return "The camera or microphone is busy. Close other apps using it, then reopen video.";
        case "OverconstrainedError":
            return "The selected camera cannot satisfy the requested video settings. Choose another camera in the browser.";
        default:
            return "Could not start the camera and microphone. Check site permissions and device settings, then try again.";
    }
}

export function useWebRTC({
    roomId,
    enabled,
}: {
    roomId: string;
    enabled: boolean;
}) {
    const localStreamRef = useRef<MediaStream | null>(null);
    const peerConns = useRef(new Map<string, RTCPeerConnection>());
    const pendingCandidates = useRef(new Map<string, RTCIceCandidateInit[]>());
    const remoteMediaStreams = useRef(new Map<string, MediaStream>());

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [permError, setPermError] = useState("");
    const [mediaWarning, setMediaWarning] = useState("");
    const [connectionError, setConnectionError] = useState("");
    const [mediaStatus, setMediaStatus] = useState<MediaStatus>("idle");
    const [retryAttempt, setRetryAttempt] = useState(0);

    const createPC = useCallback(
        (
            remoteSocketId: string,
            remoteUserId: string,
            remoteUsername: string,
        ) => {
            // Close existing PC for this socket if any
            peerConns.current.get(remoteSocketId)?.close();

            const pc = new RTCPeerConnection(ICE_SERVERS);

            // MUST add tracks BEFORE createOffer
            localStreamRef.current?.getTracks().forEach((track) => {
                pc.addTrack(track, localStreamRef.current!);
            });

            pc.ontrack = (event) => {
                const stream =
                    event.streams[0] ??
                    remoteMediaStreams.current.get(remoteSocketId) ??
                    new MediaStream();
                if (
                    !event.streams[0] &&
                    !stream.getTracks().some((track) => track.id === event.track.id)
                ) {
                    stream.addTrack(event.track);
                }
                remoteMediaStreams.current.set(remoteSocketId, stream);
                setRemoteStreams((prev) => {
                    const idx = prev.findIndex(
                        (r) => r.socketId === remoteSocketId,
                    );
                    if (idx !== -1) {
                        const updated = [...prev];
                        updated[idx] = { ...updated[idx], stream };
                        return updated;
                    }
                    return [
                        ...prev,
                        {
                            socketId: remoteSocketId,
                            userId: remoteUserId,
                            username: remoteUsername,
                            stream,
                        },
                    ];
                });
            };

            pc.onicecandidate = (e) => {
                if (e.candidate) {
                    socket.emit("webrtc:signal", {
                        to: remoteSocketId,
                        signal: {
                            type: "ice-candidate",
                            candidate: e.candidate.toJSON(),
                        },
                    });
                }
            };

            pc.onconnectionstatechange = () => {
                // An offer can replace an older connection for the same peer.
                // Ignore the old connection's delayed "closed" event so it
                // cannot delete the replacement from the map.
                if (peerConns.current.get(remoteSocketId) !== pc) return;
                if (pc.connectionState === "connected") {
                    setConnectionError("");
                }
                if (pc.connectionState === "failed") {
                    setConnectionError(
                        "A participant could not be reached. Check the TURN configuration or try reopening video.",
                    );
                }
                if (
                    pc.connectionState === "failed" ||
                    pc.connectionState === "closed"
                ) {
                    setRemoteStreams((prev) =>
                        prev.filter((r) => r.socketId !== remoteSocketId),
                    );
                    remoteMediaStreams.current.delete(remoteSocketId);
                    peerConns.current.delete(remoteSocketId);
                }
            };

            peerConns.current.set(remoteSocketId, pc);
            return pc;
        },
        [],
    );

    async function flushCandidates(socketId: string, pc: RTCPeerConnection) {
        const candidates = pendingCandidates.current.get(socketId) ?? [];
        for (const c of candidates) {
            try {
                await pc.addIceCandidate(new RTCIceCandidate(c));
            } catch (err) {
                console.warn("Failed to add ICE candidate:", err);
            }
        }
        pendingCandidates.current.delete(socketId);
    }

    useEffect(() => {
        if (!enabled || !roomId) return;
        let active = true;
        const connections = peerConns.current;
        const candidateQueue = pendingCandidates.current;

        function resetPeerConnections() {
            connections.forEach((pc) => pc.close());
            connections.clear();
            candidateQueue.clear();
            remoteMediaStreams.current.clear();
            setRemoteStreams([]);
        }

        function joinVideoRoom() {
            if (!active || !localStreamRef.current || !socket.connected) return;
            resetPeerConnections();
            setConnectionError("");
            socket.emit("webrtc:join", { roomId });
        }

        async function onExistingPeers({ peers }: { peers: PeerInfo[] }) {
            try {
                for (const peer of peers) {
                    const pc = createPC(
                        peer.socketId,
                        peer.userId,
                        peer.username,
                    );
                    const offer = await pc.createOffer();
                    await pc.setLocalDescription(offer);
                    socket.emit("webrtc:signal", {
                        to: peer.socketId,
                        signal: { type: "offer", sdp: offer.sdp! },
                    });
                }
            } catch (error) {
                console.error("Failed to connect to video peers", error);
                setConnectionError(
                    "Could not establish the video connection. Try reopening video.",
                );
            }
        }

        async function onSignal(data: WebRTCSignal) {
            try {
                const { from, userId, username, signal } = data;

                if (signal.type === "offer") {
                    const pc = createPC(from, userId, username);
                    await pc.setRemoteDescription({
                        type: "offer",
                        sdp: signal.sdp,
                    });
                    await flushCandidates(from, pc);
                    const answer = await pc.createAnswer();
                    await pc.setLocalDescription(answer);
                    socket.emit("webrtc:signal", {
                        to: from,
                        signal: { type: "answer", sdp: answer.sdp! },
                    });
                } else if (signal.type === "answer") {
                    const pc = peerConns.current.get(from);
                    if (pc) {
                        await pc.setRemoteDescription({
                            type: "answer",
                            sdp: signal.sdp,
                        });
                        await flushCandidates(from, pc);
                    }
                } else {
                    const pc = peerConns.current.get(from);
                    if (pc?.remoteDescription) {
                        await pc.addIceCandidate(
                            new RTCIceCandidate(signal.candidate),
                        );
                    } else {
                        const queued = pendingCandidates.current.get(from) ?? [];
                        pendingCandidates.current.set(from, [
                            ...queued,
                            signal.candidate,
                        ]);
                    }
                }
            } catch (error) {
                console.error("WebRTC signaling failed", error);
                setConnectionError(
                    "Could not establish the video connection. Try reopening video.",
                );
            }
        }

        function onPeerLeft({ socketId }: { userId: string; socketId: string }) {
            peerConns.current.get(socketId)?.close();
            peerConns.current.delete(socketId);
            pendingCandidates.current.delete(socketId);
            remoteMediaStreams.current.delete(socketId);
            setRemoteStreams((prev) =>
                prev.filter((stream) => stream.socketId !== socketId),
            );
        }

        async function init() {
            setPermError("");
            setMediaWarning("");
            setConnectionError("");
            setMediaStatus("requesting");
            if (!navigator.mediaDevices?.getUserMedia) {
                setPermError(
                    "Camera and microphone require HTTPS or localhost in a supported browser.",
                );
                setMediaStatus("error");
                return;
            }
            try {
                const constraints: MediaStreamConstraints = {
                    video: {
                        width: { ideal: 640 },
                        height: { ideal: 480 },
                        frameRate: { ideal: 24 },
                    },
                    audio: true,
                };
                let stream: MediaStream;
                let audioWarning = "";
                try {
                    stream = await navigator.mediaDevices.getUserMedia(
                        constraints,
                    );
                } catch {
                    // A missing, busy, or blocked microphone must not prevent the
                    // camera preview and video-only participation from working.
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: constraints.video,
                        audio: false,
                    });
                    audioWarning =
                        "Camera started, but the microphone is unavailable. You joined without audio.";
                }
                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                const videoTrack = stream.getVideoTracks()[0];
                if (!videoTrack || videoTrack.readyState !== "live") {
                    stream.getTracks().forEach((track) => track.stop());
                    throw new DOMException(
                        "No live camera track was returned",
                        "NotReadableError",
                    );
                }
                localStreamRef.current = stream;
                setLocalStream(stream);
                setIsMuted(false);
                setIsVideoOff(false);
                setMediaWarning(audioWarning);
                setMediaStatus("ready");
                videoTrack.addEventListener(
                    "ended",
                    () => {
                        if (active) {
                            setPermError(
                                "Camera access stopped. Check browser and macOS camera permissions, then reopen video.",
                            );
                            setMediaStatus("error");
                        }
                    },
                    { once: true },
                );
            } catch (error) {
                console.error("Camera/microphone access failed", error);
                setPermError(getMediaErrorMessage(error));
                setMediaStatus("error");
                return;
            }

            joinVideoRoom();
        }

        socket.on("webrtc:existing-peers", onExistingPeers);
        socket.on("webrtc:signal", onSignal);
        socket.on("webrtc:peer-left", onPeerLeft);
        socket.on("connect", joinVideoRoom);
        init();

        return () => {
            active = false;
            socket.emit("webrtc:leave", { roomId });
            socket.off("webrtc:existing-peers", onExistingPeers);
            socket.off("webrtc:signal", onSignal);
            socket.off("webrtc:peer-left", onPeerLeft);
            socket.off("connect", joinVideoRoom);
            resetPeerConnections();
            localStreamRef.current?.getTracks().forEach((t) => t.stop());
            localStreamRef.current = null;
            setLocalStream(null);
            setRemoteStreams([]);
            setIsMuted(false);
            setIsVideoOff(false);
            setMediaStatus("idle");
        };
    }, [roomId, enabled, createPC, retryAttempt]);

    function toggleMute() {
        const track = localStreamRef.current?.getAudioTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setIsMuted(!track.enabled);
    }

    function toggleVideo() {
        const track = localStreamRef.current?.getVideoTracks()[0];
        if (!track) return;
        track.enabled = !track.enabled;
        setIsVideoOff(!track.enabled);
    }

    function retryMedia() {
        setRetryAttempt((attempt) => attempt + 1);
    }

    return {
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        permError,
        mediaWarning,
        connectionError,
        mediaStatus,
        hasAudio: (localStream?.getAudioTracks().length ?? 0) > 0,
        toggleMute,
        toggleVideo,
        retryMedia,
    };
}
