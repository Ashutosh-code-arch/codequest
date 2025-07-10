import { Card, CardContent, Typography, Button, Box } from "@mui/material";

interface CodingRoomCardProps {
    title: string;
    host: string;
    status: "Live" | "Blocked";
    onJoin: () => void;
}

const CodingRoomCard = ({
    title,
    host,
    status,
    onJoin,
}: CodingRoomCardProps) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6">{title}</Typography>
                <Typography variant="body2" color="text.secondary">
                    Host: {host}
                </Typography>
                <Box mt={2}>
                    <Button
                        variant="contained"
                        disabled={status === "Blocked"}
                        onClick={onJoin}
                    >
                        {status === "Live" ? "Join" : "Blocked"}
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default CodingRoomCard;
