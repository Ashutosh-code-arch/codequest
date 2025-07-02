import { useState } from "react";
import { auth, googleProvider } from "../services/firebase";
import { signInWithPopup } from "firebase/auth";

const LoginPage = () => {
    const [token, setToken] = useState("");
    const [userInfo, setUserInfo] = useState<any>(null);

    const handleGoogleLogin = async () => {
        try {
            const result = await signInWithPopup(auth, googleProvider);
            const user = result.user;
            const idToken = await user.getIdToken();

            setToken(idToken);
            setUserInfo({
                name: user.displayName,
                email: user.email,
            });

            localStorage.setItem("token", idToken);
            console.log("ID Token:", idToken);
        } catch (err) {
            console.error("Login error:", err);
        }
    };

    return (
        <div style={{ padding: "2rem", textAlign: "center" }}>
            <h2>CodeQuest Login</h2>
            <button
                onClick={handleGoogleLogin}
                style={{ padding: "10px 20px", fontSize: "16px" }}
            >
                Sign in with Google
            </button>

            {userInfo && (
                <div style={{ marginTop: "2rem" }}>
                    <h3>Logged in as:</h3>
                    <p>{userInfo.name}</p>
                    <p>{userInfo.email}</p>
                    <textarea
                        readOnly
                        value={token}
                        style={{
                            width: "100%",
                            height: "100px",
                            marginTop: "1rem",
                        }}
                    />
                </div>
            )}
        </div>
    );
};

export default LoginPage;
