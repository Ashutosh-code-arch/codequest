import {
    Box,
    Typography,
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableRow,
    Paper,
} from "@mui/material";

const mockHistory = [
    { question: "Reverse a List", difficulty: "Medium", attempts: "2 / 4" },
    { question: "Two Sum", difficulty: "Easy", attempts: "4 / 4" },
    {
        question: "Longest Substring...",
        difficulty: "Medium",
        attempts: "3 / 5",
    },
    { question: "Validate BST", difficulty: "Hard", attempts: "1 / 3" },
];

const HistoryPage = () => {
    return (
        <Box>
            <Typography variant="h5" fontWeight="bold" mb={3}>
                History
            </Typography>
            <Paper>
                <Table>
                    <TableHead>
                        <TableRow>
                            <TableCell>Question</TableCell>
                            <TableCell>Difficulty</TableCell>
                            <TableCell>Attempts</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {mockHistory.map((row, i) => (
                            <TableRow key={i}>
                                <TableCell>{row.question}</TableCell>
                                <TableCell>{row.difficulty}</TableCell>
                                <TableCell>{row.attempts}</TableCell>
                            </TableRow>
                        ))}
                    </TableBody>
                </Table>
            </Paper>
        </Box>
    );
};

export default HistoryPage;
