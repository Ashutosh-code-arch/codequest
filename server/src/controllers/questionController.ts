import prisma from "../services/prisma";

export const getQuestions = async (req, res) => {
    const questions = await prisma.question.findMany({
        select: {
            id: true,
            title: true,
            difficulty: true,
            tags: true,
        },
    });
    res.json(questions);
};
