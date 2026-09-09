import type { SupportedLanguage } from "../executions/types";

export const SUPPORTED_LANGUAGES: SupportedLanguage[] = [
    "JAVASCRIPT",
    "PYTHON",
    "JAVA",
    "CPP",
    "C",
];

export const DEFAULT_STARTER_CODE: Record<SupportedLanguage, string> = {
    JAVASCRIPT: `const fs = require("fs");

function solve(input) {
    // Write your solution here.
}

const input = fs.readFileSync(0, "utf8").trim();
const result = solve(input);
if (result !== undefined) console.log(result);
`,
    PYTHON: `import sys

def solve(data: str):
    # Write your solution here.
    pass

result = solve(sys.stdin.read().strip())
if result is not None:
    print(result)
`,
    JAVA: `import java.util.*;

public class Main {
    static void solve(Scanner scanner) {
        // Write your solution here.
    }

    public static void main(String[] args) {
        solve(new Scanner(System.in));
    }
}
`,
    CPP: `#include <bits/stdc++.h>
using namespace std;

void solve() {
    // Write your solution here.
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);
    solve();
    return 0;
}
`,
    C: `#include <stdio.h>

void solve(void) {
    /* Write your solution here. */
}

int main(void) {
    solve();
    return 0;
}
`,
};

const PASSTHROUGH_DRIVER_CODE: Record<SupportedLanguage, string> = {
    JAVASCRIPT: "{{USER_CODE}}",
    PYTHON: "{{USER_CODE}}",
    JAVA: "{{USER_CODE}}",
    CPP: "{{USER_CODE}}",
    C: "{{USER_CODE}}",
};

function mergeCodeMap(
    value: unknown,
    defaults: Record<SupportedLanguage, string>,
): Record<SupportedLanguage, string> {
    const supplied =
        value && typeof value === "object"
            ? (value as Partial<Record<SupportedLanguage, unknown>>)
            : {};

    return Object.fromEntries(
        SUPPORTED_LANGUAGES.map((language) => {
            const code = supplied[language];
            return [
                language,
                typeof code === "string" && code.trim()
                    ? code
                    : defaults[language],
            ];
        }),
    ) as Record<SupportedLanguage, string>;
}

export function completeStarterCode(
    value: unknown,
): Record<SupportedLanguage, string> {
    return mergeCodeMap(value, DEFAULT_STARTER_CODE);
}

export function completeDriverCode(
    value: unknown,
): Record<SupportedLanguage, string> {
    return mergeCodeMap(value, PASSTHROUGH_DRIVER_CODE);
}

export function completeQuestionTemplates<
    T extends { starterCode?: unknown; driverCode?: unknown },
>(question: T): T & {
    starterCode: Record<SupportedLanguage, string>;
    driverCode: Record<SupportedLanguage, string>;
} {
    return {
        ...question,
        starterCode: completeStarterCode(question.starterCode),
        driverCode: completeDriverCode(question.driverCode),
    };
}
