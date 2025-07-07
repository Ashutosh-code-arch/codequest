import {
    AppBar,
    Toolbar,
    Typography,
    Button,
    Box,
    Avatar,
} from "@mui/material";
import { useDispatch, useSelector } from "react-redux";
import { selectUser, clearUser } from "../features/auth/authSlice";
import { getAuth, signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";

const TopAppBar = () => {
    const user = useSelector(selectUser);
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const handleLogout = async () => {
        const auth = getAuth();
        await signOut(auth);
        dispatch(clearUser());
        navigate("/auth/login");
    };

    if (!user) return null;

    return (
        <AppBar position="static">
            <Toolbar sx={{ justifyContent: "space-between" }}>
                <Typography variant="h6">CodeQuest</Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body1">{user.name}</Typography>
                    <Avatar>{user.name?.[0]?.toUpperCase()}</Avatar>
                    <Button color="inherit" onClick={handleLogout}>
                        Logout
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default TopAppBar;
