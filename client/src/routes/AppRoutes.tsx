import { Routes, Route } from "react-router-dom";
import DashboardPage from "../pages/DashboardPage";
import RoomPage from "../pages/RoomPage";
import LoginPage from "../pages/LoginPage";
import ProtectedRoute from "./ProtectedRoute";
import MainLayout from "../layouts/MainLayout";
import CodingRoomsPage from "../pages/CodingRoomsPage";
import HistoryPage from "../pages/HistoryPage";

const AppRoutes = () => {
    return (
        <Routes>
            <Route path="/auth/login" element={<LoginPage />} />
            {/* <Route path="/auth/register" element={<RegisterPage />} /> */}

            <Route path="/" element={<MainLayout />}>
                {/* <Route path="/dashboard" element={<DashboardPage />} /> */}
                <Route
                    path="/dashboard"
                    element={
                        <ProtectedRoute>
                            <DashboardPage />
                        </ProtectedRoute>
                    }
                />
                {/* <Route
                    path="/room/:roomId"
                    element={
                        <ProtectedRoute>
                            <RoomPage />
                        </ProtectedRoute>
                    }
                /> */}
                <Route path="/rooms" element={<CodingRoomsPage />} />
                <Route
                    path="/room/:roomId"
                    element={
                        <ProtectedRoute>
                            <RoomPage />
                        </ProtectedRoute>
                    }
                />
                <Route path="/history" element={<HistoryPage />} />
            </Route>

            <Route path="*" element={<LoginPage />} />
        </Routes>
    );
};

export default AppRoutes;
