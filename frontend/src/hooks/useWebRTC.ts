import { useEffect, useRef, useState, useCallback } from "react";
import { socket } from "../lib/sockets";
import { ICE_SERVERS } from "../config/webrtc";
import type { PeerInfo, WebRTCSignal, RTCSignalData } from "../types/webrtc";

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

        async function init() {
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
            } catch {
                setPermError(
                    "Camera/mic permission denied. Enable in browser settings.",
                );
                return;
            }

            socket.emit("webrtc:join", { roomId });

            async function onExistingPeers({ peers }: { peers: PeerInfo[] }) {
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
            }

            async function onSignal(data: WebRTCSignal) {
                const { from, userId, signal } = data;
                const existing = remoteStreams.find((r) => r.socketId === from);
                const username = existing?.username ?? userId;

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
                } else if (signal.type === "ice-candidate") {
                    const pc = peerConns.current.get(from);
                    if (pc?.remoteDescription) {
                        try {
                            await pc.addIceCandidate(
                                new RTCIceCandidate(signal.candidate),
                            );
                        } catch (err) {
                            console.warn("Failed to add ICE candidate:", err);
                        }
                    } else {
                        const buf = pendingCandidates.current.get(from) ?? [];
                        pendingCandidates.current.set(from, [
                            ...buf,
                            signal.candidate,
                        ]);
                    }
                }
            }

            function onPeerLeft({
                socketId,
            }: {
                userId: string;
                socketId: string;
            }) {
                peerConns.current.get(socketId)?.close();
                peerConns.current.delete(socketId);
                setRemoteStreams((prev) =>
                    prev.filter((r) => r.socketId !== socketId),
                );
            }

            socket.on("webrtc:existing-peers", onExistingPeers);
            socket.on("webrtc:signal", onSignal);
            socket.on("webrtc:peer-left", onPeerLeft);
        }

        init();

        return () => {
            active = false;
            socket.emit("webrtc:leave", { roomId });
            socket.off("webrtc:existing-peers");
            socket.off("webrtc:signal");
            socket.off("webrtc:peer-left");
            peerConns.current.forEach((pc) => pc.close());
            peerConns.current.clear();
            pendingCandidates.current.clear();
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
