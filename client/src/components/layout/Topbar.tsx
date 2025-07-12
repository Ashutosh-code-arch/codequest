import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Button,
    IconButton,
} from "@mui/material";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";
import NotificationsIcon from "@mui/icons-material/Notifications";
import Brightness4Icon from "@mui/icons-material/Brightness4";
import Brightness7Icon from "@mui/icons-material/Brightness4";
import { useThemeMode } from "../../api/hooks/useThemeMode";

const TopBar = () => {
    const navigate = useNavigate();
    const { mode, toggleTheme } = useThemeMode();

    const today = new Date().toLocaleDateString(undefined, {
        day: "numeric",
        weekday: "short",
        month: "short",
        year: "numeric",
    });

    const handleLogout = async () => {
        await signOut(auth);
        navigate("/auth/login");
    };

    return (
        <AppBar
            position="static"
            elevation={0}
            sx={{ backgroundColor: "#fff", color: "#000", boxShadow: "none" }}
        >
            <Toolbar
                sx={{
                    display: "flex",
                    justifyContent: "space-between",
                    px: 4,
                    borderBottom: "1px solid #e0e0e0",
                }}
            >
                <Box />
                <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                    <Typography variant="body1">{today}</Typography>
                    <IconButton color="inherit">
                        <NotificationsIcon />
                    </IconButton>
                    <IconButton onClick={toggleTheme} color="inherit">
                        {mode === "dark" ? (
                            <Brightness7Icon />
                        ) : (
                            <Brightness4Icon />
                        )}
                    </IconButton>
                    <Box sx={{ ml: "auto" }}>
                        <Button variant="outlined" onClick={handleLogout}>
                            Logout
                        </Button>
                    </Box>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default TopBar;
