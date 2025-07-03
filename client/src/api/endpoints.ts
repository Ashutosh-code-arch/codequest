const endpoints = {
    auth: {
        register: "/auth/register",
        me: "/auth/me",
    },
    rooms: {
        create: "/rooms",
        join: (roomId: string) => `/rooms/${roomId}/join`,
        get: (roomId: string) => `/rooms/${roomId}`,
    },
};

export default endpoints;
