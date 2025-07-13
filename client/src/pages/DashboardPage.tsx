// import { useState } from "react";
// import {
//     Box,
//     Button,
//     Container,
//     FormControl,
//     InputLabel,
//     MenuItem,
//     Select,
//     TextField,
//     Typography,
// } from "@mui/material";
// import { useNavigate } from "react-router-dom";
// import TopAppBar from "../components/AppBar";
// import { useSelector } from "react-redux";
// import { selectUser } from "../features/auth/authSlice";
// import { getAuth } from "firebase/auth";
// import { toast } from "react-toastify";
// import endpoints from "../api/endpoints";
// import axios from "../api/api";
// import api from "../api/api";
// import { socket } from "../services/socket";
// // import { io } from "socket.io-client";

// // Socket setup (reuse this in RoomPage later)
// // const socket = io("http://localhost:8000", {
// //     transports: ["websocket"],
// // });

// const DashboardPage = () => {
//     const [title, setTitle] = useState("");
//     const [language, setLanguage] = useState("javascript");

//     const user = useSelector(selectUser);
//     const auth = getAuth();

//     const navigate = useNavigate();
//     const [joinRoomId, setJoinRoomId] = useState("");

//     const handleCreateRoom = async () => {
//         if (!title) return;

//         try {
//             const res = await api.post("/rooms", { title, language });
//             const room = res.data;

//             socket.emit("create-room", room.id);
//             navigate(`/room/${room.id}`);
//         } catch (err) {
//             console.error("Room creation error:", err);
//         }
//     };

//     const handleJoinRoom = async () => {
//         if (!joinRoomId.trim()) return;
//         const token = await auth.currentUser?.getIdToken();

//         await api.post(endpoints.rooms.join(joinRoomId), {
//             headers: { Authorization: `Bearer ${token}` },
//         });

//         toast.success(`Joined Room: ${joinRoomId}`);
//         navigate(`/room/${joinRoomId}`);
//     };

//     return (
//         <>
//             <TopAppBar />
//             <Container maxWidth="sm" sx={{ mt: 6 }}>
//                 <Typography variant="h4" align="center" gutterBottom>
//                     CodeQuest Dashboard
//                 </Typography>
//                 <Box sx={{ mt: 4 }}>
//                     <TextField
//                         label="Room Title"
//                         fullWidth
//                         value={title}
//                         onChange={(e) => setTitle(e.target.value)}
//                         sx={{ mb: 2 }}
//                     />
//                     <FormControl fullWidth sx={{ mb: 2 }}>
//                         <InputLabel>Language</InputLabel>
//                         <Select
//                             value={language}
//                             onChange={(e) => setLanguage(e.target.value)}
//                             label="Language"
//                         >
//                             <MenuItem value="javascript">JavaScript</MenuItem>
//                             <MenuItem value="python">Python</MenuItem>
//                             <MenuItem value="java">Java</MenuItem>
//                         </Select>
//                     </FormControl>
//                 </Box>
//                 <Box
//                     sx={{
//                         mt: 4,
//                         display: "flex",
//                         flexDirection: "column",
//                         gap: 2,
//                     }}
//                 >
//                     <Button
//                         variant="contained"
//                         fullWidth
//                         onClick={handleCreateRoom}
//                     >
//                         Create Coding Room
//                     </Button>
//                     <TextField
//                         label="Enter Room ID"
//                         value={joinRoomId}
//                         onChange={(e) => setJoinRoomId(e.target.value)}
//                         fullWidth
//                     />
//                     <Button
//                         variant="outlined"
//                         fullWidth
//                         onClick={handleJoinRoom}
//                     >
//                         Join Room
//                     </Button>
//                 </Box>
//             </Container>
//         </>
//     );
// };

// export default DashboardPage;

// pages/DashboardPage.tsx
import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
} from "@mui/material";
import { useQuestions } from "../api/hooks/useQuestions";

type Question = {
    title: string;
    difficulty: string;
    tags: string[];
};

// const practiceQuestions: Question[] = [
//     {
//         title: "Two Sum",
//         tags: ["Braining 3", "strateges"],
//     },
//     {
//         title: "Reverse a List",
//         tags: ["Blinking 8", "starts"],
//     },
//     {
//         title: "Validate Binary Search Tree",
//         tags: ["8", "eotenest strange"],
//     },
// ];

const DashboardPage = () => {
    const questions: Question[] = useQuestions();

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={4}>
                Practice Questions
            </Typography>

            <Grid container spacing={2}>
                {questions.map((q, idx) => (
                    <Grid key={idx} sx={{ xs: 12, sm: 6, md: 4 }}>
                        <Card elevation={2}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    {q.title}
                                </Typography>
                                <Box
                                    sx={{
                                        display: "flex",
                                        gap: 1,
                                        flexWrap: "wrap",
                                        mb: 2,
                                    }}
                                >
                                    {q.tags.map((tag, i) => (
                                        <Button
                                            key={i}
                                            size="small"
                                            variant="outlined"
                                        >
                                            {tag}
                                        </Button>
                                    ))}
                                </Box>
                                <Button variant="contained" size="small">
                                    Solve
                                </Button>
                            </CardContent>
                        </Card>
                    </Grid>
                ))}
            </Grid>

            <Box sx={{ mt: 6 }}>
                <Typography variant="h6" mb={2}>
                    Recent Activity
                </Typography>
                <Card elevation={1}>
                    <CardContent>
                        <Typography>User One → User Two (5 min ago)</Typography>
                        <Typography>
                            Longest Substring Without Repeating
                        </Typography>
                    </CardContent>
                </Card>
            </Box>
        </Box>
    );
};

export default DashboardPage;
