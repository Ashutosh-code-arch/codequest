import { useEffect, useState } from "react";
import api from "../api";
import endpoints from "../endpoints";

export const useQuestions = () => {
    const [questions, setQuestions] = useState([]);

    useEffect(() => {
        api.get(endpoints.questions.get).then((res) => {
            setQuestions(res.data);
        });
    }, []);

    return questions;
};
