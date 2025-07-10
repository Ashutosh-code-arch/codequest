import { Box } from "@mui/material";
import Sidebar from "../components/layout/Sidebar";
import { Outlet } from "react-router-dom";
import TopBar from "../components/layout/Topbar";

const MainLayout = () => {
    return (
        <Box sx={{ display: "flex" }}>
            <Sidebar />
            <Box sx={{ flex: 1 }}>
                <TopBar />
                <Box sx={{ p: 4 }}>
                    <Outlet />
                </Box>
            </Box>
        </Box>
    );
};

export default MainLayout;
