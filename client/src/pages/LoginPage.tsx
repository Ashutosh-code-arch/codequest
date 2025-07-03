import { useState } from "react";
import { auth, googleProvider } from "../services/firebase";
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    signInWithPopup,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Box, Button, Container, TextField, Typography } from "@mui/material";

const LoginPage = () => {
    const navigate = useNavigate();
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const handleLogin = async () => {
        await signInWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
    };

    const handleRegister = async () => {
        await createUserWithEmailAndPassword(auth, email, password);
        navigate("/dashboard");
    };

    const handleGoogleLogin = async () => {
        try {
            await signInWithPopup(auth, googleProvider);
            // const user = result.user;
            // const idToken = await user.getIdToken();

            // setToken(idToken);
            // setUserInfo({
            //     name: user.displayName,
            //     email: user.email,
            // });

            // localStorage.setItem("token", idToken);
            // console.log("ID Token:", idToken);
        } catch (err) {
            console.error("Login error:", err);
        }
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
