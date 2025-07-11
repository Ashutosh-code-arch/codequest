import {
    ListItem,
    ListItemIcon,
    ListItemText,
    type SxProps,
    type Theme,
} from "@mui/material";
import { useNavigate } from "react-router-dom";

interface SidebarItemProps {
    icon: React.ElementType;
    label: string;
    path?: string;
    onClick?: () => void;
    sx?: SxProps<Theme>;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
    icon: Icon,
    label,
    path,
    onClick,
    sx = {},
}) => {
    const navigate = useNavigate();

    const handleClick = () => {
        if (onClick) onClick();
        else if (path) navigate(path);
    };

    return (
        <ListItem
            button
            onClick={handleClick}
            sx={{
                color: "#fff",
                mb: 1,
                cursor: "pointer",
                borderRadius: "8px",
                transition: "background-color 0.2s",
                "&:hover": {
                    backgroundColor: "#1E4C6B",
                },
                ...sx,
            }}
        >
            <ListItemIcon sx={{ color: "#fff" }}>
                <Icon fontSize="small" />
            </ListItemIcon>
            <ListItemText primary={label} />
        </ListItem>
    );
};

export default SidebarItem;
