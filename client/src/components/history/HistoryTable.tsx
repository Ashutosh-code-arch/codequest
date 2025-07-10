import {
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Paper,
} from "@mui/material";

interface HistoryRow {
    question: string;
    difficulty: string;
    attempts: string;
}

interface HistoryTableProps {
    data: HistoryRow[];
}

const HistoryTable = ({ data }: HistoryTableProps) => {
    return (
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
                    {data.map((row, i) => (
                        <TableRow key={i}>
                            <TableCell>{row.question}</TableCell>
                            <TableCell>{row.difficulty}</TableCell>
                            <TableCell>{row.attempts}</TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </Paper>
    );
};

export default HistoryTable;
