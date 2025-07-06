import { useSelector } from "react-redux";
import { selectUser } from "../features/auth/authSlice";
import { Navigate } from "react-router-dom";

const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
    const user = useSelector(selectUser);

    if (!user) {
        return <Navigate to="/auth/login" replace />;
    }

    return children;
};

export default ProtectedRoute;
