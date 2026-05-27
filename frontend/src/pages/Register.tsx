import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { registerApi } from "../api/auth";
import { useAuthStore } from "../store/authStore";

function PasswordStrength({ password }: { password: string }) {
    const checks = [
        { label: "At least 8 characters", pass: password.length >= 8 },
        { label: "Contains a number", pass: /\d/.test(password) },
        { label: "Contains a letter", pass: /[a-zA-Z]/.test(password) },
    ];
    if (!password) return null;
    return (
        <div className="mt-2 space-y-1">
            {checks.map((c) => (
                <div key={c.label} className="flex items-center gap-2">
                    <div
                        className={`w-3.5 h-3.5 rounded-full flex items-center justify-center shrink-0 ${
                            c.pass ? "bg-green-500" : "bg-gray-200"
                        }`}
                    >
                        {c.pass && (
                            <svg
                                className="w-2 h-2 text-white"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={3}
                                    d="M5 13l4 4L19 7"
                                />
                            </svg>
                        )}
                    </div>
                    <span
                        className={`text-xs ${c.pass ? "text-green-600" : "text-gray-400"}`}
                    >
                        {c.label}
                    </span>
                </div>
            ))}
        </div>
    );
}

export default function Register() {
    const navigate = useNavigate();
    const { login, isAuthenticated } = useAuthStore();

    const [form, setForm] = useState({ email: "", username: "", password: "" });
    const [usernameError, setUsernameError] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isAuthenticated) navigate("/dashboard", { replace: true });
    }, [isAuthenticated, navigate]);

    function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
        const { name, value } = e.target;
        setForm((prev) => ({ ...prev, [name]: value }));
        setError("");

        if (name === "username") {
            if (value && !/^[a-zA-Z0-9_]+$/.test(value)) {
                setUsernameError("Only letters, numbers, and underscores");
            } else {
                setUsernameError("");
            }
        }
    }

    const isFormValid =
        form.email.length > 0 &&
        form.username.length >= 3 &&
        form.password.length >= 8 &&
        !usernameError;

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        if (!isFormValid) return;
        setError("");
        setLoading(true);
        try {
            const { user, token } = await registerApi(form);
            login(user, token);
            navigate("/dashboard");
        } catch (err: unknown) {
            const msg =
                (
                    err as {
                        response?: { data?: { error?: { message?: string } } };
                    }
                )?.response?.data?.error?.message ??
                "Registration failed. Please try again.";
            setError(msg);
        } finally {
            setLoading(false);
        }
    }

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Left panel */}
            <div className="hidden lg:flex lg:w-1/2 bg-violet-600 flex-col justify-between p-12">
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
                <div>
                    <p className="text-white/90 text-2xl font-medium leading-snug mb-4">
                        Start collaborating in minutes.
                    </p>
                    <ul className="space-y-3">
                        {[
                            "Create a coding room and share the ID",
                            "Up to 4 developers per session",
                            "Real-time editor with live cursors",
                            "Built-in video, chat, and code runner",
                        ].map((item) => (
                            <li key={item} className="flex items-start gap-3">
                                <div className="w-5 h-5 rounded-full bg-white/20 flex items-center justify-center shrink-0 mt-0.5">
                                    <svg
                                        className="w-3 h-3 text-white"
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2.5}
                                            d="M5 13l4 4L19 7"
                                        />
                                    </svg>
                                </div>
                                <span className="text-violet-100 text-sm">
                                    {item}
                                </span>
                            </li>
                        ))}
                    </ul>
                </div>
                <p className="text-violet-300 text-xs">
                    Free to use. No credit card required.
                </p>
            </div>

            {/* Right panel */}
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
                        Create your account
                    </h1>
                    <p className="text-sm text-gray-500 mb-8">
                        Already have one?{" "}
                        <Link
                            to="/login"
                            className="text-violet-600 hover:text-violet-700 font-medium"
                        >
                            Sign in
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
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                            />
                        </div>

                        {/* Username */}
                        <div>
                            <label
                                htmlFor="username"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Username
                            </label>
                            <input
                                id="username"
                                name="username"
                                type="text"
                                autoComplete="username"
                                required
                                placeholder="your_handle"
                                value={form.username}
                                onChange={handleChange}
                                disabled={loading}
                                className={`w-full rounded-lg border bg-white px-3 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:ring-2 disabled:opacity-50 ${
                                    usernameError
                                        ? "border-red-300 focus:border-red-400 focus:ring-red-500/20"
                                        : "border-gray-200 focus:border-violet-500 focus:ring-violet-500/20"
                                }`}
                            />
                            {usernameError ? (
                                <p className="mt-1 text-xs text-red-500">
                                    {usernameError}
                                </p>
                            ) : (
                                <p className="mt-1 text-xs text-gray-400">
                                    3–20 chars. Letters, numbers, underscores
                                    only.
                                </p>
                            )}
                        </div>

                        {/* Password */}
                        <div>
                            <label
                                htmlFor="password"
                                className="block text-sm font-medium text-gray-700 mb-1"
                            >
                                Password
                            </label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="new-password"
                                required
                                placeholder="••••••••"
                                value={form.password}
                                onChange={handleChange}
                                disabled={loading}
                                className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2.5 text-sm placeholder-gray-400 outline-none transition focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 disabled:opacity-50"
                            />
                            <PasswordStrength password={form.password} />
                        </div>

                        {/* Global error */}
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

                        <button
                            type="submit"
                            disabled={loading || !isFormValid}
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
                                    Creating account...
                                </span>
                            ) : (
                                "Create account"
                            )}
                        </button>

                        <p className="text-center text-xs text-gray-400">
                            By signing up you agree to our{" "}
                            <span className="text-gray-500 underline cursor-pointer">
                                Terms
                            </span>{" "}
                            and{" "}
                            <span className="text-gray-500 underline cursor-pointer">
                                Privacy Policy
                            </span>
                        </p>
                    </form>
                </div>
            </div>
        </div>
    );
}
