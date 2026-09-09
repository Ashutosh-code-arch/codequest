export type LangKey = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";

export function wrapWithDriver(
    userCode: string,
    driverCode: string,
    language: LangKey,
): string {
    const placeholderCount = driverCode.match(/{{USER_CODE}}/g)?.length ?? 0;
    if (placeholderCount !== 1) {
        throw new Error(
            `Invalid ${language} driver: expected exactly one {{USER_CODE}} placeholder`,
        );
    }
    return driverCode.replace("{{USER_CODE}}", userCode);
}
