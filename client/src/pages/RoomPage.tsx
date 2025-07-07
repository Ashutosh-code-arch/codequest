import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import Editor from "@monaco-editor/react";
import { socket } from "../services/socket";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import TopAppBar from "../components/AppBar";
import { Box, Typography } from "@mui/material";
import { toast } from "react-toastify";

const RoomPage = () => {
    const { roomId } = useParams();
    const user = useSelector(selectUser);
    const [code, setCode] = useState("// Start coding here...");

    useEffect(() => {
        if (!roomId || !user) return;

        socket.connect();
        socket.emit("join-room", {
            roomId,
            user: {
                name: user.name,
                email: user.email,
            },
        });

        socket.on("code-change", (newCode: string) => {
            setCode(newCode);
        });

        return () => {
            socket.emit("leave-room", roomId);
            socket.disconnect();
        };
    }, [roomId, user]);

    const handleCodeChange = (newValue: string | undefined) => {
        setCode(newValue || "");
        socket.emit("code-change", { roomId, code: newValue });
    };

    return (
        <>
            <TopAppBar />
            <Box sx={{ mt: 2, p: 2 }}>
                <Typography variant="h6">
                    Room ID: {roomId} — Logged in as: {user?.name}
                </Typography>
                <Editor
                    height="70vh"
                    language="javascript"
                    value={code}
                    onChange={handleCodeChange}
                    theme="vs-dark"
                    options={{
                        fontSize: 14,
                        minimap: { enabled: false },
                    }}
                />
            </Box>
        </>
    );
};

export default RoomPage;
