import {
    Avatar,
    Box,
    Divider,
    IconButton,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
} from "@mui/material";
import React from "react";
import { menuItems } from "../../config/menuItems";
import MoreVertIcon from "@mui/icons-material/MoreVert";
import SettingsIcon from "@mui/icons-material/Settings";
import InfoIcon from "@mui/icons-material/Info";
import SidebarItem from "./SidebarItem";
import { useDispatch, useSelector } from "react-redux";
import { selectUser } from "../../features/auth/authSlice";
import {
    Dashboard as DashboardIcon,
    Quiz as QuizIcon,
    Group as GroupIcon,
    Logout as LogoutIcon,
} from "@mui/icons-material";
import { useNavigate } from "react-router-dom";

const Sidebar = () => {
    const user = useSelector(selectUser);
    const navigate = useNavigate();
    const dispatch = useDispatch();

    console.log("----user----", user);

    return (
        <Box
            sx={{
                width: 230,
                height: "100vh",
                backgroundColor: "#15364fff",
                color: "#fff",
                display: "flex",
                flexDirection: "column",
                p: 2,
                borderRadius: "10px",
            }}
        >
            <Box
                sx={{
                    display: "flex",
                    alignItems: "center",
                    gap: 0.2,
                    mb: 2,
                }}
            >
                <Box
                    component="img"
                    src="/logo-transparent.png"
                    alt="logo"
                    sx={{
                        width: 40,
                        height: 40,
                        verticalAlign: "middle",
                        display: "inline-block",
                    }}
                />
                <Typography variant="h5" fontWeight="bold" fontSize={23}>
                    CodeQuest
                </Typography>
            </Box>
            <Divider sx={{ backgroundColor: "#2E5C78", marginBottom: 1.5 }} />

            <Box sx={{ flexGrow: 1 }}>
                <List>
                    {user?.role === "MENTOR" && (
                        <>
                            <ListItemButton
                                onClick={() => navigate("/dashboard")}
                            >
                                <ListItemIcon>
                                    <DashboardIcon />
                                </ListItemIcon>
                                <ListItemText primary="Dashboard" />
                            </ListItemButton>
                            <ListItemButton
                                onClick={() => navigate("/admin/questions")}
                            >
                                <ListItemIcon>
                                    <QuizIcon />
                                </ListItemIcon>
                                <ListItemText primary="Manage Questions" />
                            </ListItemButton>

                            <ListItemButton
                                onClick={() => navigate("/admin/rooms")}
                            >
                                <ListItemIcon>
                                    <GroupIcon />
                                </ListItemIcon>
                                <ListItemText primary="Manage Rooms/Users" />
                            </ListItemButton>
                        </>
                    )}
                    {user?.role === "CANDIDATE" &&
                        menuItems.map((item) => {
                            const Icon = item.icon;
                            return (
                                <React.Fragment>
                                    <SidebarItem
                                        key={item.label}
                                        icon={Icon}
                                        label={item.label}
                                        path={item.path}
                                    />
                                </React.Fragment>
                            );
                        })}
                </List>
            </Box>
            <Divider sx={{ backgroundColor: "#2E5C78", my: 1.5 }} />
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
                <List dense>
                    <ListItem
                        component={"button"}
                        sx={{
                            color: "#fff",
                            mb: 1,
                            cursor: "pointer",
                            borderRadius: "8px",
                            transition: "background-color 0.2s",
                            "&:hover": {
                                backgroundColor: "#1E4C6B",
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: "#fff" }}>
                            <SettingsIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="Settings" />
                    </ListItem>
                    <ListItem
                        component={"button"}
                        sx={{
                            color: "#fff",
                            mb: 1,
                            cursor: "pointer",
                            borderRadius: "8px",
                            transition: "background-color 0.2s",
                            "&:hover": {
                                backgroundColor: "#1E4C6B",
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: "#fff" }}>
                            <InfoIcon fontSize="small" />
                        </ListItemIcon>
                        <ListItemText primary="About" />
                    </ListItem>
                </List>

                <Box
                    sx={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        p: 1,
                        borderRadius: "8px",
                        backgroundColor: "#1e2e3a",
                    }}
                >
                    <Box sx={{ display: "flex", flexDirection: "column" }}>
                        <Avatar
                            src="/profile.jpg"
                            alt="User"
                            sx={{ width: 32, height: 32, mb: 0.5 }}
                        />
                        <Box>
                            <Typography variant="body2" fontWeight="bold">
                                {user?.name}
                            </Typography>
                            <Typography variant="caption" color="gray">
                                {user?.email}
                            </Typography>
                            <Typography variant="body2" color="text.secondary">
                                {user?.role === "MENTOR"
                                    ? "Admin"
                                    : "Candidate"}
                            </Typography>
                        </Box>
                    </Box>

                    <IconButton size="small" sx={{ color: "#fff" }}>
                        <MoreVertIcon fontSize="small" />
                    </IconButton>
                </Box>
            </Box>
        </Box>
    );
};

export default Sidebar;
