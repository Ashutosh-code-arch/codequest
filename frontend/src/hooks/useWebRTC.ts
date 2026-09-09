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

    const [localStream, setLocalStream] = useState<MediaStream | null>(null);
    const [remoteStreams, setRemoteStreams] = useState<RemoteStream[]>([]);
    const [isMuted, setIsMuted] = useState(false);
    const [isVideoOff, setIsVideoOff] = useState(false);
    const [permError, setPermError] = useState("");

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
                const stream = event.streams[0];
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
                if (
                    pc.connectionState === "failed" ||
                    pc.connectionState === "closed"
                ) {
                    setRemoteStreams((prev) =>
                        prev.filter((r) => r.socketId !== remoteSocketId),
                    );
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
            setRemoteStreams([]);
        }

        function joinVideoRoom() {
            if (!active || !localStreamRef.current || !socket.connected) return;
            resetPeerConnections();
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
                setPermError("Could not establish the video connection.");
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
                setPermError("Could not establish the video connection.");
            }
        }

        function onPeerLeft({ socketId }: { userId: string; socketId: string }) {
            peerConns.current.get(socketId)?.close();
            peerConns.current.delete(socketId);
            pendingCandidates.current.delete(socketId);
            setRemoteStreams((prev) =>
                prev.filter((stream) => stream.socketId !== socketId),
            );
        }

        async function init() {
            setPermError("");
            if (!navigator.mediaDevices?.getUserMedia) {
                setPermError(
                    "Camera and microphone require HTTPS or localhost in a supported browser.",
                );
                return;
            }
            try {
                const stream = await navigator.mediaDevices.getUserMedia({
                    video: { width: 640, height: 480, frameRate: 24 },
                    audio: true,
                });
                if (!active) {
                    stream.getTracks().forEach((t) => t.stop());
                    return;
                }
                localStreamRef.current = stream;
                setLocalStream(stream);
            } catch (error) {
                console.error("Camera/microphone access failed", error);
                setPermError(
                    "Camera/mic permission denied. Enable in browser settings.",
                );
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
        };
    }, [roomId, enabled, createPC]);

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

    return {
        localStream,
        remoteStreams,
        isMuted,
        isVideoOff,
        permError,
        toggleMute,
        toggleVideo,
    };
}
