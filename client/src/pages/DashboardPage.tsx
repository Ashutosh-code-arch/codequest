import { useState } from "react";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import { useNavigate } from "react-router-dom";
import { io } from "socket.io-client";

// Socket setup (reuse this in RoomPage later)
const socket = io("http://localhost:8000", {
    transports: ["websocket"],
});

const DashboardPage = () => {
    const navigate = useNavigate();
    const [joinRoomId, setJoinRoomId] = useState("");

    const handleCreateRoom = () => {
        const newRoomId = crypto.randomUUID().slice(0, 8);
        socket.emit("create-room", newRoomId);
        navigate(`/room/${newRoomId}`);
    };

    // const handleCreateRoom = async () => {
    //     try {
    //         const res = await axios.post(endpoints.rooms.create);
    //         navigate(`/room/${res.data.roomId}`);
    //     } catch (err) {
    //         console.error("Failed to create room", err);
    //     }
    // };

    const handleJoinRoom = () => {
        if (!joinRoomId.trim()) return;
        socket.emit("join-room", joinRoomId);
        navigate(`/room/${joinRoomId}`);
    };

    return (
        <Container maxWidth="sm" sx={{ mt: 6 }}>
            <Typography variant="h4" align="center" gutterBottom>
                CodeQuest Dashboard
            </Typography>
            <Box
                sx={{ mt: 4, display: "flex", flexDirection: "column", gap: 2 }}
            >
                <Button
                    variant="contained"
                    fullWidth
                    onClick={handleCreateRoom}
                >
                    Create Coding Room
                </Button>
                <TextField
                    label="Enter Room ID"
                    value={joinRoomId}
                    onChange={(e) => setJoinRoomId(e.target.value)}
                    fullWidth
                />
                <Button variant="outlined" fullWidth onClick={handleJoinRoom}>
                    Join Room
                </Button>
            </Box>
        </Container>
    );
};

export default DashboardPage;
