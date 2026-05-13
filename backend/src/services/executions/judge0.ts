import { logger } from "../../lib/logger";
import type { ExecuteOptions, ExecuteResult, SupportedLanguage } from "./types";

// Judge0 language IDs — find full list at judge0-ce.p.rapidapi.com/languages
const LANGUAGE_IDS: Record<SupportedLanguage, number> = {
    JAVASCRIPT: 63, // Node.js 12.14.0
    PYTHON: 71, // Python 3.8.1
    JAVA: 62, // Java 13.0.1
    CPP: 54, // C++ 17 (GCC 9.2.0)
    C: 50, // C (GCC 9.2.0)
};

// Judge0 status IDs → human readable
const STATUS_MAP: Record<number, string> = {
    1: "In Queue",
    2: "Processing",
    3: "Accepted",
    4: "Wrong Answer",
    5: "Time Limit Exceeded",
    6: "Compilation Error",
    7: "Runtime Error (SIGSEGV)",
    8: "Runtime Error (SIGXFSZ)",
    9: "Runtime Error (SIGFPE)",
    10: "Runtime Error (SIGABRT)",
    11: "Runtime Error (NZEC)",
    12: "Runtime Error (Other)",
    13: "Internal Error",
    14: "Exec Format Error",
};

function b64encode(str: string): string {
    return Buffer.from(str).toString("base64");
}

function b64decode(str: string | null | undefined): string {
    if (!str) return "";
    try {
        return Buffer.from(str, "base64").toString("utf-8");
    } catch {
        return str;
    }
}

export async function judge0Execute(
    opts: ExecuteOptions,
): Promise<ExecuteResult> {
    const {
        code,
        language,
        stdin = "",
        timeLimit = 2000,
        memoryLimit = 256,
    } = opts;

    function normalizeStdin(raw: string): string {
        let s = raw.trim();

        // Unwrap if accidentally JSON-stringified: "\"0\"" → "0"
        if (s.startsWith('"') && s.endsWith('"')) {
            try {
                const parsed = JSON.parse(s);
                if (typeof parsed === "string") s = parsed;
            } catch {
                // not valid JSON — leave as-is
            }
        }

        // Replace literal \n escape sequences with real newlines
        s = s.replace(/\\n/g, "\n").replace(/\\t/g, "\t");

        return s;
    }

    const normalizedStdin = normalizeStdin(stdin);

    const languageId = LANGUAGE_IDS[language];
    if (!languageId) {
        throw new Error(`Unsupported language: ${language}`);
    }

    const body = {
        source_code: b64encode(code),
        language_id: languageId,
        stdin: b64encode(normalizedStdin),
        cpu_time_limit: timeLimit / 1000, // Judge0 uses seconds
        memory_limit: memoryLimit * 1024, // Judge0 uses KB
        enable_base64: true,
        encode_base64: true,
    };

    const url = `${process.env.JUDGE0_URL}/submissions?wait=true&base64_encoded=true`;

    const response = await fetch(url, {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "X-RapidAPI-Key": process.env.JUDGE0_API_KEY ?? "",
            "X-RapidAPI-Host": "judge0-ce.p.rapidapi.com",
        },
        body: JSON.stringify(body),
    });

    if (!response.ok) {
        const text = await response.text();
        logger.error(
            { status: response.status, body: text },
            "Judge0 API error",
        );
        throw new Error(`Judge0 API returned ${response.status}`);
    }

    const data = (await response.json()) as {
        stdout?: string | null;
        stderr?: string | null;
        compile_output?: string | null;
        status?: { id: number; description: string };
        time?: string | null;
        memory?: number | null;
        exit_code?: number | null;
    };

    const statusId = data.status?.id ?? 0;
    const statusText =
        STATUS_MAP[statusId] ?? data.status?.description ?? "Unknown";

    // stderr OR compile_output — whichever has content
    const stderrRaw = b64decode(data.stderr) || b64decode(data.compile_output);

    return {
        stdout: b64decode(data.stdout),
        stderr: stderrRaw,
        status: statusText,
        executionMs: data.time
            ? Math.round(parseFloat(data.time) * 1000)
            : null,
        memoryKB: data.memory ?? null,
        exitCode: data.exit_code ?? null,
    };
}
