import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuthStore } from "../store/authStore";
import { loginApi } from "../api/auth";

export default function Login() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();

    const [form, setForm] = useState({ email: "", password: "" });
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    // Already logged in → skip login page
    useEffect(() => {
        if (isAuthenticated) navigate("/dashboard", { replace: true });
    }, [isAuthenticated, navigate]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
        setError(""); // clear error on typing
    }

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError("");
        setLoading(true);
        try {
            const { user, token } = await loginApi(form);
            login(user, token);
            navigate("/dashboard");
        } catch (err: unknown) {
            const msg =
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ??
                "Invalid email or password";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left panel — branding (hidden on mobile) */}
            <div className="hidden lg:flex lg:w-1/2 bg-violet-600 flex-col justify-between p-12">
                <div>
                    <div className="flex items-center gap-2">
                        <div className="w-7 h-7 bg-white rounded-md flex items-center justify-center">
                            <span className="text-violet-600 text-xs font-bold">
                                CC
                            </span>
                        </div>
                        <span className="text-white font-medium text-sm">
                            Collab Code
                        </span>
                    </div>
                </div>
                <div>
                    <blockquote className="text-white/90 text-2xl font-medium leading-snug mb-4">
                        "Code together, think together, ship together."
                    </blockquote>
                    <p className="text-violet-200 text-sm">
                        Real-time collaborative coding for engineering teams.
                    </p>
                </div>
                <div className="flex gap-3">
                    {[
                        "Collaborative editor",
                        "Live cursors",
                        "Video calls",
                        "Code execution",
                    ].map((f) => (
                        <span
                            key={f}
                            className="text-xs text-violet-200 border border-violet-400 rounded-full px-3 py-1"
                        >
                            {f}
                        </span>
                    ))}
                </div>
            </div>

            {/* Right panel — form */}
            <div className="flex-1 flex items-center justify-center p-6">
                <div className="w-full max-w-sm">
                    {/* Mobile logo */}
                    <div className="flex items-center gap-2 mb-8 lg:hidden">
                        <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center">
                            <span className="text-white text-xs font-bold">
                                CC
                            </span>
                        </div>
                        <span className="text-gray-900 font-medium text-sm">
                            Collab Code
                        </span>
                    </div>

                    <h1 className="text-2xl font-semibold text-gray-900 mb-1">
                        Welcome back
                    </h1>
                    <p className="text-sm text-gray-500 mb-8">
                        Don't have an account?{" "}
                        <Link
                            to="/register"
                            className="text-violet-600 hover:text-violet-700 font-medium"
                        >
                            Sign up free
                        </Link>
                    </p>

                    <form
                        onSubmit={handleSubmit}
                        noValidate
                        className="space-y-4"
                    >
                        {/* Email */}
                        <div>
                            <label
                                htmlFor="email"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Email
                            </label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                placeholder="you@example.com"
                                value={form.email}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                                disabled={loading}
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <div className="flex items-center justify-between mb-1">
                                <label
                                    htmlFor="password"
                                    className="block text-sm font-medium text-gray-700"
                                >
                                    Password
                                </label>
                            </div>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                                disabled={loading}
                            />
                        </div>

                        {/* Error */}
                        {error && (
                            <div className="flex items-start gap-2 rounded-lg bg-red-50 border border-red-100 px-3 py-2.5">
                                <svg
                                    className="w-4 h-4 text-red-500 mt-0.5 shrink-0"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                >
                                    <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={2}
                                        d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                    />
                                </svg>
                                <p className="text-sm text-red-600">{error}</p>
                            </div>
                        )}

                        {/* Submit */}
                        <button
                            type="submit"
                            disabled={loading || !form.email || !form.password}
                            className="w-full rounded-lg bg-violet-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500/50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-2">
                                    <svg
                                        className="h-4 w-4 animate-spin"
                                        viewBox="0 0 24 24"
                                        fill="none"
                                    >
                                        <circle
                                            className="opacity-25"
                                            cx="12"
                                            cy="12"
                                            r="10"
                                            stroke="currentColor"
                                            strokeWidth="4"
                                        />
                                        <path
                                            className="opacity-75"
                                            fill="currentColor"
                                            d="M4 12a8 8 0 018-8v8H4z"
                                        />
                                    </svg>
                                    Signing in...
                                </span>
                            ) : (
                                "Sign in"
                            )}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}
