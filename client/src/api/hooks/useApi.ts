import axios from "axios";
import { useState } from "react";

export const useApi = <T = any>() => {
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<any>(null);

    const request = async (
        method: "get" | "post" | "put" | "delete",
        url: string,
        data?: any
    ) => {
        setLoading(true);
        setError(null);

        try {
            const res = await axios({ method, url, data });
            return res.data as T;
        } catch (err: any) {
            setError(err.response?.data || err.message);
            throw err;
        } finally {
            setLoading(false);
        }
    };

    return { request, loading, error };
};
