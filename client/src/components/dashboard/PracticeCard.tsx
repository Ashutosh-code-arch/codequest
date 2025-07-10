import { Card, CardContent, Typography, Button, Box } from "@mui/material";

interface PracticeCardProps {
    title: string;
    tags: string[];
    onStart: () => void;
}

const PracticeCard = ({ title, tags, onStart }: PracticeCardProps) => {
    return (
        <Card>
            <CardContent>
                <Typography variant="h6">{title}</Typography>
                <Box mt={1} display="flex" gap={1} flexWrap="wrap">
                    {tags.map((tag, i) => (
                        <Button key={i} size="small" variant="outlined">
                            {tag}
                        </Button>
                    ))}
                </Box>
                <Box mt={2}>
                    <Button variant="contained" onClick={onStart}>
                        Solve
                    </Button>
                </Box>
            </CardContent>
        </Card>
    );
};

export default PracticeCard;
