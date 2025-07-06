import { createSlice, PayloadAction } from "@reduxjs/toolkit";

interface User {
    uid: string;
    email: string | null;
    name: string | null;
}

interface AuthState {
    user: User | null;
}

const initialState: AuthState = {
    user: null,
};

const authSlice = createSlice({
    name: "auth",
    initialState,
    reducers: {
        setUser: (state, action: PayloadAction<User>) => {
            state.user = action.payload;
        },
        clearUser: (state) => {
            state.user = null;
        },
    },
});

export const { setUser, clearUser } = authSlice.actions;

export const selectUser = (state: { auth: AuthState }) => state.auth.user;

export default authSlice.reducer;
