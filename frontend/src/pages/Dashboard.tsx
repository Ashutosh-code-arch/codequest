import { useNavigate, Link } from "react-router-dom";
import { useAuthStore } from "../store/authStore";

// Sidebar nav item
function NavItem({
    icon,
    label,
    to,
    active = false,
}: {
    icon: React.ReactNode;
    label: string;
    to: string;
    active?: boolean;
}) {
    return (
        <Link
            to={to}
            className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm transition ${
                active
                    ? "bg-violet-50 text-violet-700 font-medium"
                    : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
        >
            <span className="w-4 h-4 shrink-0">{icon}</span>
            {label}
        </Link>
    );
}

// Stat card shown at top of content area
function StatCard({
    label,
    value,
    sub,
}: {
    label: string;
    value: string | number;
    sub?: string;
}) {
    return (
        <div className="bg-white border border-gray-100 rounded-xl p-5">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wide mb-1">
                {label}
            </p>
            <p className="text-2xl font-semibold text-gray-900">{value}</p>
            {sub && <p className="text-xs text-gray-400 mt-1">{sub}</p>}
        </div>
    );
}

// Placeholder empty state for room list
function EmptyRooms() {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-center">
            <div className="w-14 h-14 bg-violet-50 rounded-2xl flex items-center justify-center mb-4">
                <svg
                    className="w-7 h-7 text-violet-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                </svg>
            </div>
            <h3 className="text-gray-700 font-medium mb-1">No active rooms</h3>
            <p className="text-gray-400 text-sm mb-5 max-w-xs">
                Create a room and share the code with your team to start
                collaborating.
            </p>
            <button
                className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition"
                onClick={() => alert("Room creation coming in F3")}
            >
                <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M12 4v16m8-8H4"
                    />
                </svg>
                Create room
            </button>
        </div>
    );
}

export default function Dashboard() {
    const navigate = useNavigate();
    const { user, logout, isAdmin } = useAuthStore();

    function handleLogout() {
        logout();
        navigate("/login");
    }

    // Avatar initials from username
    const initials = user?.username
        ? user.username.slice(0, 2).toUpperCase()
        : "??";

    return (
        <div className="min-h-screen bg-gray-50 flex">
            {/* Sidebar */}
            <aside className="hidden md:flex md:w-56 lg:w-60 bg-white border-r border-gray-100 flex-col p-4 shrink-0">
                {/* Logo */}
                <div className="flex items-center gap-2 px-1 mb-8">
                    <div className="w-7 h-7 bg-violet-600 rounded-md flex items-center justify-center shrink-0">
                        <span className="text-white text-xs font-bold">CC</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                        Collab Code
                    </span>
                </div>

                {/* Nav */}
                <nav className="flex flex-col gap-1 flex-1">
                    <NavItem
                        to="/dashboard"
                        active
                        label="Dashboard"
                        icon={
                            <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6"
                                />
                            </svg>
                        }
                    />
                    <NavItem
                        to="/history"
                        label="History"
                        icon={
                            <svg
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                            </svg>
                        }
                    />

                    {/* Admin only */}
                    {isAdmin() && (
                        <>
                            <div className="mt-4 mb-1 px-3">
                                <p className="text-xs font-medium text-gray-400 uppercase tracking-wider">
                                    Admin
                                </p>
                            </div>
                            <NavItem
                                to="/admin"
                                label="Admin panel"
                                icon={
                                    <svg
                                        fill="none"
                                        stroke="currentColor"
                                        viewBox="0 0 24 24"
                                    >
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                                        />
                                        <path
                                            strokeLinecap="round"
                                            strokeLinejoin="round"
                                            strokeWidth={2}
                                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                                        />
                                    </svg>
                                }
                            />
                        </>
                    )}
                </nav>

                {/* User profile at bottom */}
                <div className="border-t border-gray-100 pt-4 mt-4">
                    <div className="flex items-center gap-3 px-1">
                        <div className="w-8 h-8 rounded-full bg-violet-100 flex items-center justify-center shrink-0">
                            <span className="text-violet-700 text-xs font-semibold">
                                {initials}
                            </span>
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-800 truncate">
                                {user?.username}
                            </p>
                            <p className="text-xs text-gray-400 truncate">
                                {user?.email}
                            </p>
                        </div>
                        <button
                            onClick={handleLogout}
                            title="Sign out"
                            className="text-gray-400 hover:text-gray-600 transition"
                        >
                            <svg
                                className="w-4 h-4"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                                />
                            </svg>
                        </button>
                    </div>
                </div>
            </aside>

            {/* Mobile top nav */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-10 bg-white border-b border-gray-100 px-4 py-3 flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 bg-violet-600 rounded flex items-center justify-center">
                        <span className="text-white text-xs font-bold">CC</span>
                    </div>
                    <span className="font-semibold text-gray-900 text-sm">
                        Collab Code
                    </span>
                </div>
                <button
                    onClick={handleLogout}
                    className="text-sm text-gray-500 hover:text-gray-800"
                >
                    Sign out
                </button>
            </div>

            {/* Main content */}
            <main className="flex-1 flex flex-col min-w-0">
                {/* Top bar */}
                <header className="bg-white border-b border-gray-100 px-6 py-4 flex items-center justify-between">
                    <div>
                        <h1 className="text-base font-semibold text-gray-900">
                            Dashboard
                        </h1>
                        <p className="text-xs text-gray-400 mt-0.5">
                            Welcome back,{" "}
                            <span className="text-gray-600">
                                {user?.username}
                            </span>
                        </p>
                    </div>
                    <button
                        onClick={() => alert("Room creation coming in F3")}
                        className="inline-flex items-center gap-2 bg-violet-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-violet-700 transition"
                    >
                        <svg
                            className="w-4 h-4"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                        >
                            <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                            />
                        </svg>
                        New room
                    </button>
                </header>

                <div className="flex-1 p-6 md:pt-6 pt-16">
                    {/* Stats row */}
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                        <StatCard
                            label="Sessions today"
                            value={0}
                            sub="Rooms joined or created"
                        />
                        <StatCard
                            label="Total sessions"
                            value={0}
                            sub="All time"
                        />
                        <StatCard
                            label="Problems solved"
                            value={0}
                            sub="Accepted submissions"
                        />
                        <StatCard
                            label="Role"
                            value={user?.role ?? "—"}
                            sub="Your access level"
                        />
                    </div>

                    {/* Join by ID */}
                    <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
                        <h2 className="text-sm font-semibold text-gray-800 mb-3">
                            Join a room
                        </h2>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                placeholder="Paste room ID..."
                                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"
                            />
                            <button
                                className="bg-gray-900 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-gray-700 transition"
                                onClick={() => alert("Room join coming in F3")}
                            >
                                Join
                            </button>
                        </div>
                    </div>

                    {/* Room list */}
                    <div className="bg-white border border-gray-100 rounded-xl">
                        <div className="px-5 py-4 border-b border-gray-50 flex items-center justify-between">
                            <h2 className="text-sm font-semibold text-gray-800">
                                Active rooms
                            </h2>
                            <span className="text-xs text-gray-400 bg-gray-50 px-2 py-0.5 rounded-full">
                                0
                            </span>
                        </div>
                        <EmptyRooms />
                    </div>
                </div>
            </main>
        </div>
    );
}
