import {
    Box,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    Typography,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import HistoryIcon from "@mui/icons-material/History";
import CodeIcon from "@mui/icons-material/Code";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
    const navigate = useNavigate();

    const items = [
        { label: "Dashboard", icon: <DashboardIcon />, path: "/dashboard" },
        { label: "Coding Rooms", icon: <CodeIcon />, path: "/rooms" },
        { label: "History", icon: <HistoryIcon />, path: "/history" },
    ];

    return (
        <Box
            sx={{
                width: 220,
                height: "100vh",
                backgroundColor: "#0E1E2A",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                p: 2,
            }}
        >
            <Typography variant="h5" fontWeight="bold" mb={4}>
                CodeQuest
            </Typography>
            <List>
                {items.map((item) => (
                    <ListItem
                        button
                        key={item.label}
                        onClick={() => navigate(item.path)}
                        sx={{ color: "#fff", mb: 1 }}
                    >
                        <ListItemIcon sx={{ color: "#fff" }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText primary={item.label} />
                    </ListItem>
                ))}
            </List>
        </Box>
    );
};

export default Sidebar;
