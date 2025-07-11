import {
    Box,
    Typography,
    Grid,
    Card,
    CardContent,
    Button,
} from "@mui/material";
import CodingRoomCard from "../components/rooms/CodingRoomCard";
import { useNavigate } from "react-router-dom";

const mockRooms = [
    {
        id: "abc123",
        title: "Palindrome Number",
        status: "Live",
        host: "User One",
    },
    {
        id: "def456",
        title: "Merge Intervals",
        status: "Live",
        host: "User Two",
    },
    {
        id: "ghi789",
        title: "Longest Substring Without Reposting",
        status: "Blocked",
        host: "User Three",
    },
];

const CodingRoomsPage = () => {
    const navigate = useNavigate();
    function joinRoom(room: any) {
        navigate(`/room/${room.id}`);
    }

    return (
        <Box>
            <Box
                display="flex"
                justifyContent="space-between"
                gap={1}
                width={"100%"}
            >
                <Typography
                    variant="h5"
                    fontWeight="bold"
                    alignSelf={"flex-start"}
                >
                    Coding Rooms
                </Typography>
                <Button color="primary" alignSelf={"flex-end"}>
                    Create Room
                </Button>
            </Box>

            <Grid container spacing={2}>
                {mockRooms.map((room) => (
                    // <Grid item xs={12} sm={6} md={4} key={room.id}>
                    //     <Card>
                    //         <CardContent>
                    //             <Typography variant="h6">
                    //                 {room.title}
                    //             </Typography>
                    //             <Typography
                    //                 variant="body2"
                    //                 color="text.secondary"
                    //             >
                    //                 Host: {room.host}
                    //             </Typography>
                    //             <Box mt={2}>
                    //                 <Button
                    //                     variant="contained"
                    //                     disabled={room.status === "Blocked"}
                    //                 >
                    //                     {room.status === "Live"
                    //                         ? "Join"
                    //                         : "Blocked"}
                    //                 </Button>
                    //             </Box>
                    //         </CardContent>
                    //     </Card>
                    // </Grid>
                    <Grid item xs={12} sm={6} md={4} key={room.id}>
                        <CodingRoomCard
                            title={room.title}
                            host={room.host}
                            status={(room.status as "Live") || "Blocked"}
                            onJoin={joinRoom}
                        />
                    </Grid>
                ))}
            </Grid>
        </Box>
    );
};

export default CodingRoomsPage;
