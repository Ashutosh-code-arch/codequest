import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ProtectedRoute, AdminRoute } from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Dashboard from "./pages/Dashboard";
import AdminPanel from "./pages/AdminPanel";
import Room from "./pages/Room";

// Placeholder — replaced in later phases
function ComingSoon({ label }: { label: string }) {
    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
            <div className="text-center">
                <p className="text-gray-300 text-6xl mb-4">{"{ }"}</p>
                <p className="text-gray-400 text-sm font-mono">
                    {label} — coming soon
                </p>
            </div>
        </div>
    );
}

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
                    <Route
                        path="/history"
                        element={<ComingSoon label="History" />}
                    />
                </Route>

                {/* Admin only */}
                <Route element={<AdminRoute />}>
                    <Route path="/admin" element={<AdminPanel />} />
                </Route>

                <Route path="/" element={<Navigate to="/login" replace />} />
                <Route
                    path="*"
                    element={<ComingSoon label="404 — page not found" />}
                />
            </Routes>
        </BrowserRouter>
    );
}
