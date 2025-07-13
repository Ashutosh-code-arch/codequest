import axios from "axios";

export const runCode = async (req, res) => {
    const { code, language, stdin } = req.body;

    const payload = {
        script: code,
        language,
        versionIndex: "0",
        stdin,
        clientId: process.env.JDOODLE_CLIENT_ID,
        clientSecret: process.env.JDOODLE_CLIENT_SECRET,
    };

    try {
        const { data } = await axios.post(
            "https://api.jdoodle.com/v1/execute",
            payload
        );
        res.json(data);
    } catch (err) {
        res.status(500).json({ error: "Execution failed" });
    }
};
