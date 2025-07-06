// import "./App.css";
import {
    Navigate,
    Route,
    BrowserRouter as Router,
    Routes,
} from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { AppLayout } from "./components/AppLayout";
import DashboardPage from "./pages/DashboardPage";
import RoomPage from "./pages/RoomPage";
import { useDispatch } from "react-redux";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { useEffect } from "react";
import { clearUser, setUser } from "./features/auth/authSlice";
import AppRoutes from "./routes/AppRoutes";

const ProtectedRoute = ({ children }: { children: JSX.element }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/" replace />;
};

function App() {
    const dispatch = useDispatch();
    const auth = getAuth();

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
            if (user) {
                dispatch(
                    setUser({
                        uid: user.uid,
                        email: user.email,
                        name:
                            user.displayName ||
                            user.email?.split("@")[0] ||
                            "User",
                    })
                );
            } else {
                dispatch(clearUser());
            }
        });

        return () => unsubscribe();
    }, []);

    return <AppRoutes />;
}

export default App;
