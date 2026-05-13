export type LangKey = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";

export function wrapWithDriver(
    userCode: string,
    driverCode: string,
    language: LangKey,
): string {
    // Simple placeholder replacement
    // The driver template has {{USER_CODE}} where the solution goes
    return driverCode.replace("{{USER_CODE}}", userCode);
}
