import { useNavigate } from "react-router-dom";

export default function NotFound() {
    const navigate = useNavigate();
    return (
        <div className="min-h-screen bg-gray-950 flex items-center justify-center">
            <div className="text-center">
                <p className="text-8xl font-bold text-gray-800 mb-4">404</p>
                <p className="text-gray-400 font-medium mb-2">Page not found</p>
                <p className="text-gray-600 text-sm mb-6">
                    The page you're looking for doesn't exist.
                </p>
                <button
                    onClick={() => navigate("/dashboard")}
                    className="bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition"
                >
                    Back to dashboard
                </button>
            </div>
        </div>
    );
}
