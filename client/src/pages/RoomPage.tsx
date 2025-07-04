// src/pages/RoomPage.tsx
import { useParams } from "react-router-dom";
import { Typography, Box } from "@mui/material";

const RoomPage = () => {
    const { roomId } = useParams();
    return (
        <Box sx={{ mt: 6 }}>
            <Typography variant="h5">Welcome to Room: {roomId}</Typography>
        </Box>
    );
};

export default RoomPage;
