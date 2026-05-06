import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Room from "./pages/Room";
import History from "./pages/History";
import NotFound from "./pages/NotFound";

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                {/* Public */}
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<Register />} />

                {/* Logged-in users */}
                <Route element={<ProtectedRoute />}>
                    <Route path="/dashboard" element={<Dashboard />} />
                    <Route path="/room/:id" element={<Room />} />
                    <Route path="/history" element={<History />} />
                </Route>

                {/* Admin only */}
                <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPanel />} />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route path="*" element={<NotFound />} />
            </Routes>
        </BrowserRouter>
    );
}
