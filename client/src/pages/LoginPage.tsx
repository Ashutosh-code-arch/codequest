import { useState } from "react";
import { auth, googleProvider } from "../services/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, TextField, Typography } from "@mui/material";
import endpoints from "../api/endpoints";
import axios from "../api/axios";

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const registerBackendUser = async (
        token: string,
        name: string,
        email: string
    ) => {
        try {
            const res = await axios.post(
                endpoints.auth.register,
                { email, name, role: "CANDIDATE" },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            console.log("res______", res);
        } catch (err) {
            console.error("Backend registration failed", err);
        }
    };

    const handleLogin = async () => {
        const result = await signInWithEmailAndPassword(auth, email, password);
        const user = result.user;
        const token = await user.getIdToken();
        // await registerBackendUser(
        //     token,
        //     user.displayName || "No Name",
        //     user.email || ""
        // );
        await axios.get(endpoints.auth.me, {
            headers: { Authorization: `Bearer ${token}` },
        });
        navigate("/dashboard");
    };

    const handleRegister = async () => {
        const result = await createUserWithEmailAndPassword(
            auth,
            email,
            password
        );
        const user = result.user;
        const token = await user.getIdToken();
        await registerBackendUser(
            token,
            user.displayName || "No Name",
            user.email || ""
        );
        navigate("/dashboard");
    };

    const handleGoogleLogin = async () => {
        const result = await signInWithPopup(auth, googleProvider);
        const user = result.user;
        const token = await user.getIdToken();
        await registerBackendUser(
            token,
            user.displayName || "No Name",
            user.email || ""
        );
        navigate("/dashboard");
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 10, textAlign: "center" }}>
                <Typography variant="h4" gutterBottom>
                    Welcome to CodeQuest
                </Typography>
                <TextField
                    fullWidth
                    label="Email"
                    margin="normal"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                />
                <TextField
                    fullWidth
                    label="Password"
                    margin="normal"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleLogin}
                    sx={{ mt: 2 }}
                >
                    Login
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleRegister}
                    sx={{ mt: 2 }}
                >
                    Register
                </Button>
                <Button
                    fullWidth
                    variant="contained"
                    onClick={handleGoogleLogin}
                    sx={{ mt: 2 }}
                >
                    Continue with Google
                </Button>
            </Box>
        </Container>
    );
};

export default LoginPage;
