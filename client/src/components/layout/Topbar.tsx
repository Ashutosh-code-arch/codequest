import { AppBar, Toolbar, Typography, Box, Button } from "@mui/material";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { auth } from "../../services/firebase";

const TopBar = () => {
    const navigate = useNavigate();

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
                <Box>
                    <Button variant="outlined" onClick={handleLogout}>
                        Logout
                    </Button>
                </Box>
            </Toolbar>
        </AppBar>
    );
};

export default TopBar;
