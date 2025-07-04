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

const ProtectedRoute = ({ children }: { children: JSX.element }) => {
    const { user } = useAuth();
    return user ? children : <Navigate to="/" replace />;
};

function App() {
    return (
        <AuthProvider>
            <Router>
                <Routes>
                    <Route path="/" element={<LoginPage />} />
                    <Route
                        path="/dashboard"
                        element={
                            <ProtectedRoute>
                                <AppLayout>
                                    <DashboardPage />
                                </AppLayout>
                            </ProtectedRoute>
                        }
                    />
                    <Route
                        path="/room/:roomId"
                        element={
                            <ProtectedRoute>
                                <AppLayout>
                                    <RoomPage />
                                </AppLayout>
                            </ProtectedRoute>
                        }
                    />
                </Routes>
            </Router>
        </AuthProvider>
    );
}

export default App;
