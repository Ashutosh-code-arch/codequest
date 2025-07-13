// import { useEffect, useState } from "react";
// import { useParams } from "react-router-dom";
// import Editor from "@monaco-editor/react";
// import { socket } from "../services/socket";
// import { useSelector } from "react-redux";
// import { selectUser } from "../features/auth/authSlice";
// import TopAppBar from "../components/AppBar";
// import { Box, Typography } from "@mui/material";
// import { toast } from "react-toastify";

// const RoomPage = () => {
//     const { roomId } = useParams();
//     const user = useSelector(selectUser);
//     const [code, setCode] = useState("// Start coding here...");

//     useEffect(() => {
//         if (!roomId || !user) return;

//         socket.connect();
//         socket.emit("join-room", {
//             roomId,
//             user: {
//                 name: user.name,
//                 email: user.email,
//             },
//         });

//         socket.on("code-change", (newCode: string) => {
//             setCode(newCode);
//         });

//         return () => {
//             socket.emit("leave-room", roomId);
//             socket.disconnect();
//         };
//     }, [roomId, user]);

//     const handleCodeChange = (newValue: string | undefined) => {
//         setCode(newValue || "");
//         socket.emit("code-change", { roomId, code: newValue });
//     };

//     return (
//         <>
//             <TopAppBar />
//             <Box sx={{ mt: 2, p: 2 }}>
//                 <Typography variant="h6">
//                     Room ID: {roomId} — Logged in as: {user?.name}
//                 </Typography>
//                 <Editor
//                     height="70vh"
//                     language="javascript"
//                     value={code}
//                     onChange={handleCodeChange}
//                     theme="vs-dark"
//                     options={{
//                         fontSize: 14,
//                         minimap: { enabled: false },
//                     }}
//                 />
//             </Box>
//         </>
//     );
// };

// export default RoomPage;

import {
    Box,
    Typography,
    Paper,
    MenuItem,
    Select,
    Button,
} from "@mui/material";
import Editor from "@monaco-editor/react";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import { socket } from "../services/socket";
import { runCode } from "../api/hooks/useCodeRunner";

const RoomPage = () => {
    const { roomId } = useParams();
    const [language, setLanguage] = useState("javascript");
    const [code, setCode] = useState("// write your solution");
    const user = useSelector(selectUser);

    useEffect(() => {
        if (roomId) {
            socket.emit("join-room", { roomId, user });
            socket.on("sync-code", (incomingCode) => {
                setCode(incomingCode);
            });
        }

        return () => {
            socket.emit("leave-room", { roomId });
            socket.off("sync-code");
        };
    }, [roomId]);

    const handleEditorChange = (val: string | undefined) => {
        const updatedCode = val || "";
        setCode(updatedCode);
        socket.emit("code-change", { roomId, code: updatedCode });
    };

    const handleRun = async () => {
        const result = await runCode(code, language);
        console.log("Output:", result.output);
    };

    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={3}>
                Room: {roomId}
            </Typography>

            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                <Paper sx={{ flex: 1, p: 2 }}>
                    <Typography variant="h6">Palindrome Number</Typography>
                    <Typography variant="body2" color="text.secondary" mt={1}>
                        A number is a palindrome if it reads the same backward
                        as forward...
                    </Typography>

                    <Box mt={2}>
                        <Typography variant="body2">Input: number</Typography>
                        <Typography variant="body2">Output: boolean</Typography>
                    </Box>

                    <Box mt={2}>
                        <Typography variant="body2">
                            Constraints: Must not use string conversion
                        </Typography>
                    </Box>
                </Paper>

                <Paper sx={{ flex: 2, p: 2 }}>
                    <Box display="flex" justifyContent="space-between" mb={2}>
                        <Select
                            size="small"
                            value={language}
                            onChange={(e) => setLanguage(e.target.value)}
                        >
                            <MenuItem value="javascript">JavaScript</MenuItem>
                            <MenuItem value="python">Python</MenuItem>
                            <MenuItem value="java">Java</MenuItem>
                        </Select>
                        <Button variant="contained" onClick={handleRun}>
                            Run Code
                        </Button>
                    </Box>

                    <Editor
                        height="400px"
                        language={language}
                        theme="vs-dark"
                        value={code}
                        onChange={(val) => setCode(val || "")}
                    />
                </Paper>
            </Box>
        </Box>
    );
};

export default RoomPage;
