import { useParams } from "react-router-dom";
import { useEffect } from "react";
import { Box, Typography } from "@mui/material";
import { socket } from "../services/socket"; 
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice"; 

const RoomPage = () => {
    const { roomId } = useParams();
    const user = useSelector(selectUser); // Grab logged-in user (or pass as prop/context)

    useEffect(() => {
        if (!roomId || !user) return;

        // ✅ emit join-room with user info
        socket.emit("join-room", {
            roomId,
            user: {
                name: user.name,
                email: user.email,
            },
        });

        return () => {
            // ✅ leave-room on unmount
            socket.emit("leave-room", roomId);
        };
    }, [roomId, user]);

    return (
        <Box sx={{ mt: 6 }}>
            <Typography variant="h5">Welcome to Room: {roomId}</Typography>
        </Box>
    );
};

export default RoomPage;
