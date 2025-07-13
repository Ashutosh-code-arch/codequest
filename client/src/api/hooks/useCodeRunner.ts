import api from "../api";
import endpoints from "../endpoints";

export const runCode = async (
    code: string,
    language: string = "javascript"
) => {
    const { data } = await api.post(endpoints.code.run, {
        code,
        language,
        stdin: "",
    });

    return data;
};
