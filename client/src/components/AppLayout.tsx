import {
    AppBar,
    Avatar,
    Box,
    Button,
    Toolbar,
    Typography,
} from "@mui/material";
import { useAuth } from "../context/AuthContext";

export const AppLayout = ({ children }: { children: React.ReactNode }) => {
    const { user, logout } = useAuth();

    return (
        <Box>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" sx={{ flexGrow: 1 }}>
                        CodeQuest
                    </Typography>
                    {user && (
                        <>
                            <Typography>{user.dispalyName}</Typography>
                            <Avatar src={user.photoURL} sx={{ mx: 2 }} />
                            <Button onClick={logout} color="inherit">
                                Logout
                            </Button>
                        </>
                    )}
                </Toolbar>
            </AppBar>
            <Box sx={{ p: 3 }}>{children}</Box>
        </Box>
    );
};
