import { useState } from "react";
import { Container, Box, Typography, TextField, Button } from "@mui/material";
import {
    signInWithEmailAndPassword,
    createUserWithEmailAndPassword,
    signInWithPopup,
    getAuth,
    updateProfile,
    onAuthStateChanged,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";
// import axios from "axios";
import { useDispatch } from "react-redux";
import endpoints from "../api/endpoints";
import { setUser } from "../features/auth/authSlice";
import { googleProvider } from "../services/firebase";
import api from "../api/api";

const LoginPage = () => {
    const auth = getAuth();
    const navigate = useNavigate();
    const dispatch = useDispatch();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const registerBackendUser = async (
        token: string,
        name: string,
        email: string
    ) => {
        try {
            const res = await api.post(
                endpoints.auth.register,
                { email, name },
                {
                    headers: { Authorization: `Bearer ${token}` },
                }
            );
            console.log("✅ Backend registration:", res.data);
            return res;
        } catch (err) {
            console.error("❌ Backend registration failed", err);
            return undefined;
        }
    };

    // const handleLogin = async () => {
    //     try {
    //         const result = await signInWithEmailAndPassword(
    //             auth,
    //             email,
    //             password
    //         );
    //         const user = result.user;
    //         const token = await user.getIdToken(true);

    //         console.log("user_____", user);
    //         console.log("token_____", token);

    //         await axios.get(endpoints.auth.me, {
    //             headers: { Authorization: `Bearer ${token}` },
    //         });

    //         dispatch(
    //             setUser({
    //                 uid: user.uid,
    //                 email: user.email,
    //                 name: user.displayName || user.email?.split("@")[0] || "",
    //             })
    //         );

    //         navigate("/dashboard");
    //     } catch (err) {
    //         console.error("❌ Login failed", err);
    //     }
    // };

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);

            // Wait for Firebase Auth to fully load currentUser
            onAuthStateChanged(auth, async (user) => {
                if (user) {
                    const token = await user.getIdToken(true);
                    const userDetails = await api.get(endpoints.auth.me, {
                        headers: { Authorization: `Bearer ${token}` },
                    });
                    dispatch(
                        setUser({
                            uid: user.uid,
                            email: user.email,
                            name:
                                user.displayName ||
                                user.email?.split("@")[0] ||
                                "",
                            role: userDetails?.data?.role,
                            token: token,
                        })
                    );

                    navigate("/dashboard");
                }
            });
        } catch (err) {
            console.error("Login error:", err);
        }
    };

    const handleRegister = async () => {
        try {
            const result = await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );
            const user = result.user;

            // Set display name from email prefix
            const name = email.split("@")[0];
            await updateProfile(user, { displayName: name });

            const token = await user.getIdToken();
            const userDetails = await registerBackendUser(token, name, email);

            dispatch(
                setUser({
                    uid: user.uid,
                    email: user.email,
                    name,
                    role: userDetails?.data?.role,
                    token: token,
                })
            );

            navigate("/dashboard");
        } catch (err) {
            console.error("❌ Registration failed", err);
        }
    };

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const token = await user.getIdToken();

            const userDetails = await registerBackendUser(
                token,
                user.displayName || "No Name",
                user.email || ""
            );
            dispatch(
                setUser({
                    uid: user.uid,
                    email: user.email,
                    name: user.displayName || user.email?.split("@")[0] || "",
                    role: userDetails?.data?.role,
                    token: token,
                })
            );

            navigate("/dashboard");
        } catch (err) {
            console.error("❌ Google Login failed", err);
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
                    variant="outlined"
                    onClick={handleRegister}
                    sx={{ mt: 2 }}
                >
                    Register
                </Button>
                <Button
                    fullWidth
                    variant="outlined"
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
