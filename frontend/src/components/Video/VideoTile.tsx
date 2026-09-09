import { useEffect, useRef, useState } from "react";

interface VideoTileProps {
    stream: MediaStream | null;
    username: string;
    isMuted?: boolean;
    videoOff?: boolean;
    isLocal?: boolean;
    placeholderText?: string;
}

export default function VideoTile({
    stream,
    username,
    isMuted = false,
    videoOff = false,
    isLocal = false,
    placeholderText,
}: VideoTileProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [playbackBlocked, setPlaybackBlocked] = useState(false);

    useEffect(() => {
        const video = videoRef.current;
        if (!video || !stream) return;

        video.srcObject = stream;
        function startPlayback() {
            void video!
                .play()
                .then(() => setPlaybackBlocked(false))
                .catch((error: unknown) => {
                    // Setting srcObject can temporarily abort play before the
                    // metadata event. Retry there instead of showing a false
                    // autoplay error.
                    if (
                        error instanceof DOMException &&
                        error.name === "AbortError"
                    ) {
                        return;
                    }
                    setPlaybackBlocked(true);
                });
        }

        video.addEventListener("loadedmetadata", startPlayback);
        video.addEventListener("canplay", startPlayback, { once: true });
        startPlayback();

        return () => {
            video.removeEventListener("loadedmetadata", startPlayback);
            video.removeEventListener("canplay", startPlayback);
            if (video.srcObject === stream) video.srcObject = null;
        };
    }, [stream]);

    function resumePlayback() {
        if (!videoRef.current) return;
        void videoRef.current
            .play()
            .then(() => setPlaybackBlocked(false))
            .catch(() => setPlaybackBlocked(true));
    }

    const initials = username.slice(0, 2).toUpperCase();

    return (
        <div className="relative bg-gray-800 rounded-xl overflow-hidden flex items-center justify-center aspect-video w-full h-full">
            {stream && (
                <video
                    ref={videoRef}
                    autoPlay
                    playsInline
                    muted={isLocal}
                    className={`${videoOff ? "hidden " : ""}w-full h-full object-cover${isLocal ? " scale-x-[-1]" : ""}`}
                />
            )}
            {(!stream || videoOff) && (
                <div className="flex flex-col items-center justify-center gap-2">
                    <div className="w-12 h-12 rounded-full bg-violet-700 flex items-center justify-center">
                        <span className="text-white font-semibold text-base">
                            {initials}
                        </span>
                    </div>
                    {videoOff && (
                        <span className="text-xs text-gray-500">
                            Camera off
                        </span>
                    )}
                    {!stream && !videoOff && placeholderText && (
                        <span className="text-xs text-gray-500">
                            {placeholderText}
                        </span>
                    )}
                </div>
            )}
            {playbackBlocked && stream && !videoOff && (
                <button
                    type="button"
                    onClick={resumePlayback}
                    className="absolute inset-0 bg-black/50 text-white text-xs font-medium"
                >
                    Click to start video
                </button>
            )}
            <div className="absolute bottom-2 left-2 flex items-center gap-1.5">
                <span className="text-xs text-white bg-black/50 px-2 py-0.5 rounded-full">
                    {isLocal ? username + " (you)" : username}
                </span>
                {isMuted && (
                    <span className="bg-red-600/80 rounded-full p-0.5">
                        <svg
                            className="w-2.5 h-2.5 text-white"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                            />
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                            />
                        </svg>
                    </span>
                )}
            </div>
        </div>
    );
}
