import {
    Box,
    Typography,
    Grid,
    Button,
    TextField,
    Card,
    Input,
    MenuItem,
    Select,
    FormControl,
    InputLabel,
    Paper,
} from "@mui/material";
import CodingRoomCard from "../components/rooms/CodingRoomCard";
import { useNavigate } from "react-router-dom";
import React, { useState } from "react";
import api from "../api/api";
import { socket } from "../services/socket";

interface Room {
    id: string;
    title: string; host: string;
    status: string;
}

const mockRooms = [
    {
        id: "abc123",
        title: "Palindrome Number",
        status: "Live",
        host: "User One",
    },
    {
        id: "def456",
        title: "Merge Intervals",
        status: "Live",
        host: "User Two",
    },
    {
        id: "ghi789",
        title: "Longest Substring Without Reposting",
        status: "Blocked",
        host: "User Three",
    },
];

const CodingRoomsPage = () => {
    const navigate = useNavigate();
    function joinRoom(room: Room) {
        navigate(`/room/${room.id}`);
    }

    const [title, setTitle] = useState("");
    const [language, setLanguage] = useState("");

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

    return (
        <React.Fragment>
            <Box
                display="flex"
                justifyContent="space-between"
                gap={1}
                width={"100%"}
            >
                <Typography
                    variant="h5"
                    fontWeight="bold"
                    alignSelf={"flex-start"}
                >
                    Coding Rooms
                </Typography>
                <FormControl
                    sx={{ m: 1, minWidth: 120, alignSelf: "end" }}
                    size="small"
                >
                    <InputLabel id="demo-select-small-label">
                        Filter 1
                    </InputLabel>
                    <Select
                        labelId="demo-select-small-label"
                        id="demo-select-small"
                        value={""}
                        size="small"
                        // label=""
                        // onChange={handleChange}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value={10}>All</MenuItem>
                    </Select>
                </FormControl>
                <FormControl
                    sx={{ m: 1, minWidth: 120, alignSelf: "flex-end" }}
                    size="small"
                >
                    <InputLabel id="demo-select-small-label">
                        Filter 2
                    </InputLabel>
                    <Select
                        labelId="demo-select-small-label"
                        id="demo-select-small"
                        size="small"
                        // value={age}
                        // label="Age"
                        // onChange={handleChange}
                    >
                        <MenuItem value="">
                            <em>None</em>
                        </MenuItem>
                        <MenuItem value={10}>Newest First</MenuItem>
                    </Select>
                </FormControl>
            </Box>
            <Box>
                <Box
                    display="flex"
                    justifyContent="center"
                    alignItems={"flex-start"}
                    gap={1}
                >
                    <Box
                        sx={{
                            border: "1px solid #ccc",
                            width: "50%",
                            borderRadius: 2,
                            padding: 0.5,
                        }}
                        gap={0.5}
                        display={"flex"}
                        flexDirection={"column"}
                    >
                        <Typography sx={{ marginLeft: 1 }} variant="subtitle1">
                            Join Room
                        </Typography>
                        <Grid item xs={12} xl={12} lg={12}>
                            <Grid container spacing={0.5}>
                                <Grid size={{ xs: 10, lg: 10, xl: 10 }}>
                                    <TextField
                                        required
                                        id="outlined-required"
                                        label="Room Id"
                                        defaultValue=""
                                        placeholder="Enter Room Id"
                                        fullWidth
                                        sx={{ padding: 0.1 }}
                                        size="small"
                                    />
                                </Grid>
                                <Grid
                                    size={{ xs: 2, lg: 2, xl: 2 }}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: 0.1,
                                    }}
                                >
                                    <Button
                                        color="primary"
                                        variant="contained"
                                        size="small"
                                    >
                                        JOIN
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                    <Box
                        sx={{
                            border: "1px solid #ccc",
                            width: "100%",
                            borderRadius: 2,
                            padding: 0.5,
                        }}
                        gap={0.5}
                        justifyContent="space-between"
                        display={"flex"}
                        flexDirection={"column"}
                    >
                        <Typography sx={{ marginLeft: 1 }} variant="subtitle1">
                            Create Room
                        </Typography>
                        <Grid item xs={12} xl={12} lg={12}>
                            <Grid container spacing={0.5}>
                                <Grid size={{ xs: 10, lg: 10, xl: 10 }}>
                                    <TextField
                                        required
                                        id="outlined-required"
                                        label="Title"
                                        defaultValue=""
                                        placeholder="Enter Room Title"
                                        fullWidth
                                        sx={{ padding: 0.2 }}
                                        size="small"
                                    />
                                </Grid>
                                <Grid size={{ xs: 2, lg: 2, xl: 2 }}>
                                    <FormControl
                                        sx={{
                                            m: 1,
                                            minWidth: 120,
                                            alignSelf: "flex-end",
                                        }}
                                        size="small"
                                    >
                                        <InputLabel id="demo-select-small-label">
                                            Filter 2
                                        </InputLabel>
                                        <Select
                                            labelId="demo-select-small-label"
                                            id="demo-select-small"
                                            size="small"
                                            // value={age}
                                            // label="Age"
                                            // onChange={handleChange}
                                        >
                                            <MenuItem value="">
                                                <em>None</em>
                                            </MenuItem>
                                            <MenuItem value={10}>
                                                Newest First
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                            </Grid>
                        </Grid>
                        <Grid item xs={12} xl={12} lg={12}>
                            <Grid container spacing={0.5}>
                                <Grid size={{ xs: 10, lg: 10, xl: 10 }}>
                                    <FormControl
                                        sx={{
                                            m: 1,
                                            minWidth: 120,
                                            alignSelf: "flex-end",
                                        }}
                                        size="small"
                                    >
                                        <InputLabel id="demo-select-small-label">
                                            Filter 2
                                        </InputLabel>
                                        <Select
                                            labelId="demo-select-small-label"
                                            id="demo-select-small"
                                            size="small"
                                            // value={age}
                                            // label="Age"
                                            // onChange={handleChange}
                                        >
                                            <MenuItem value="">
                                                <em>None</em>
                                            </MenuItem>
                                            <MenuItem value={10}>
                                                Newest First
                                            </MenuItem>
                                        </Select>
                                    </FormControl>
                                </Grid>
                                <Grid
                                    size={{ xs: 2, lg: 2, xl: 2 }}
                                    sx={{
                                        display: "flex",
                                        alignItems: "center",
                                        padding: 0.1,
                                    }}
                                >
                                    <Button
                                        color="primary"
                                        variant="contained"
                                        size="small"
                                        onClick={handleCreateRoom}
                                    >
                                        CREATE
                                    </Button>
                                </Grid>
                            </Grid>
                        </Grid>
                    </Box>
                </Box>

                <Grid container spacing={2} marginTop={2}>
                    {mockRooms.map((room) => (
                        <Grid key={room.id} sx={{ xs: 12, sm: 6, md: 4 }}>
                            <CodingRoomCard
                                title={room.title}
                                host={room.host}
                                status={(room.status as "Live") || "Blocked"}
                                onJoin={() => joinRoom(room)}
                            />
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </React.Fragment>
    );
};

export default CodingRoomsPage;
