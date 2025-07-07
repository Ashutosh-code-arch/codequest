import { useState } from "react";
import {
    Box,
    Button,
    Container,
    FormControl,
    InputLabel,
    MenuItem,
    Select,
    TextField,
    Typography,
} from "@mui/material";
import { useNavigate } from "react-router-dom";
import TopAppBar from "../components/AppBar";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import { getAuth } from "firebase/auth";
import { toast } from "react-toastify";
import endpoints from "../api/endpoints";
import axios from "../api/api";
import api from "../api/api";
import { socket } from "../services/socket";
// import { io } from "socket.io-client";

// Socket setup (reuse this in RoomPage later)
// const socket = io("http://localhost:8000", {
//     transports: ["websocket"],
// });

const DashboardPage = () => {
    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("javascript");

    const user = useSelector(selectUser);
    const auth = getAuth();

    const navigate = useNavigate();
    const [joinRoomId, setJoinRoomId] = useState("");

    const handleCreateRoom = async () => {
        if (!title) return;

        try {
            const res = await api.post("/rooms", { title, language });
            const room = res.data;

            socket.emit("create-room", room.id);
            navigate(`/room/${room.id}`);
        } catch (err) {
            console.error("Room creation error:", err);
        }
    };

    const handleJoinRoom = async () => {
        if (!joinRoomId.trim()) return;
        const token = await auth.currentUser?.getIdToken();

        await axios.get(endpoints.rooms.join(joinRoomId), {
            headers: { Authorization: `Bearer ${token}` },
        });

        toast.success(`Joined Room: ${joinRoomId}`);
        navigate(`/room/${joinRoomId}`);
    };

    return (
        <>
            <TopAppBar />
            <Container maxWidth="sm" sx={{ mt: 6 }}>
                <Typography variant="h4" align="center" gutterBottom>
                    CodeQuest Dashboard
                </Typography>
                <Box sx={{ mt: 4 }}>
                    <TextField
                        label="Room Title"
                        fullWidth
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        sx={{ mb: 2 }}
                    />
                    <FormControl fullWidth sx={{ mb: 2 }}>
                        <InputLabel>Language</InputLabel>
                        <Select
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                            label="Language"
                        >
                            <MenuItem value="javascript">JavaScript</MenuItem>
                            <MenuItem value="python">Python</MenuItem>
                            <MenuItem value="java">Java</MenuItem>
                        </Select>
                    </FormControl>
                </Box>
                <Box
                    sx={{
                        mt: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                    }}
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
                    <Button
                        variant="outlined"
                        fullWidth
                        onClick={handleJoinRoom}
                    >
                        Join Room
                    </Button>
                </Box>
            </Container>
        </>
    );
};

export default DashboardPage;
