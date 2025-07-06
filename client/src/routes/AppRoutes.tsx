import { Routes, Route } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import RoomPage from "../pages/RoomPage";
import LoginPage from "../pages/LoginPage";
// import RegisterPage from "../pages/";
import ProtectedRoute from "./ProtectedRoute";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            {/* <Route path="/auth/register" element={<RegisterPage />} /> */}

            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <DashboardPage />
                    </ProtectedRoute>
                }
            />
            <Route
                path="/room/:roomId"
                element={
                    <ProtectedRoute>
                        <RoomPage />
                    </ProtectedRoute>
                }
            />

            <Route path="*" element={<LoginPage />} />
        </Routes>
    );
};

export default AppRoutes;
