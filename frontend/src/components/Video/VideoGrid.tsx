import VideoTile from "./VideoTile";
import type { RemoteStream } from "../../hooks/useWebRTC";

interface VideoGridProps {
    localStream: MediaStream | null;
    localUsername: string;
    isMuted: boolean;
    isVideoOff: boolean;
    remoteStreams: RemoteStream[];
    permError: string;
    onToggleMute: () => void;
    onToggleVideo: () => void;
}

export default function VideoGrid({
    localStream,
    localUsername,
    isMuted,
    isVideoOff,
    remoteStreams,
    permError,
    onToggleMute,
    onToggleVideo,
}: VideoGridProps) {
    const total = 1 + remoteStreams.length;
    const grid = total <= 1 ? "grid-cols-1" : "grid-cols-2";

    if (permError) {
        return (
            <div className="w-full h-full flex items-center justify-center bg-gray-900">
                <p className="text-red-400 text-xs text-center px-4">
                    {permError}
                </p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full bg-gray-900">
            <div className={"flex-1 grid " + grid + " gap-1 p-1 min-h-0"}>
                <VideoTile
                    stream={localStream}
                    username={localUsername}
                    isMuted={isMuted}
                    videoOff={isVideoOff}
                    isLocal
                />
                {remoteStreams.map((r) => (
                    <VideoTile
                        key={r.socketId}
                        stream={r.stream}
                        username={r.username}
                    />
                ))}
                {Array.from({ length: Math.max(0, 4 - total) }).map((_, i) => (
                    <div
                        key={"empty-" + i}
                        className="bg-gray-800/30 rounded-xl flex items-center justify-center aspect-video"
                    >
                        <span className="text-gray-700 text-xs">
                            Empty slot
                        </span>
                    </div>
                ))}
            </div>
            <div className="shrink-0 flex items-center justify-center gap-3 py-2 border-t border-gray-800">
                <button
                    onClick={onToggleMute}
                    title={isMuted ? "Unmute" : "Mute"}
                    className={
                        "w-8 h-8 rounded-full flex items-center justify-center transition " +
                        (isMuted
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-gray-700 hover:bg-gray-600")
                    }
                >
                    <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z"
                        />
                    </svg>
                </button>
                <button
                    onClick={onToggleVideo}
                    title={isVideoOff ? "Camera on" : "Camera off"}
                    className={
                        "w-8 h-8 rounded-full flex items-center justify-center transition " +
                        (isVideoOff
                            ? "bg-red-600 hover:bg-red-700"
                            : "bg-gray-700 hover:bg-gray-600")
                    }
                >
                    <svg
                        className="w-3.5 h-3.5 text-white"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 10l4.553-2.069A1 1 0 0121 8.882v6.236a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z"
                        />
                    </svg>
                </button>
            </div>
        </div>
    );
}
