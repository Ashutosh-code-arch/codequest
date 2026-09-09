export type LangKey = "JAVASCRIPT" | "PYTHON" | "JAVA" | "CPP" | "C";

export interface LangConfig {
    label: string;
    monacoLang: string;
    starterCode: string;
}

export const LANGUAGE_CONFIG: Record<LangKey, LangConfig> = {
    JAVASCRIPT: {
        label: "JavaScript",
        monacoLang: "javascript",
        starterCode: `const fs = require("fs");

function solve(input) {
    // Write your solution here.
}

const input = fs.readFileSync(0, "utf8").trim();
const result = solve(input);
if (result !== undefined) console.log(result);
`,
    },
    PYTHON: {
        label: "Python",
        monacoLang: "python",
        starterCode: `import sys

def solve(data: str):
    # Write your solution here.
    pass

result = solve(sys.stdin.read().strip())
if result is not None:
    print(result)
`,
    },
    JAVA: {
        label: "Java",
        monacoLang: "java",
        starterCode: `import java.util.*;

public class Main {
    static void solve(Scanner scanner) {
        // Write your solution here.
    }

    public static void main(String[] args) {
        solve(new Scanner(System.in));
    }
}
`,
    },
    CPP: {
        label: "C++",
        monacoLang: "cpp",
        starterCode: `#include <bits/stdc++.h>
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
    },
    C: {
        label: "C",
        monacoLang: "c",
        starterCode: `#include <stdio.h>

void solve(void) {
    /* Write your solution here. */
}

int main(void) {
    solve();
    return 0;
}
`,
    },
};

export const LANGUAGE_KEYS = Object.keys(LANGUAGE_CONFIG) as LangKey[];

export const DEFAULT_STARTER_CODE = Object.fromEntries(
    LANGUAGE_KEYS.map((language) => [
        language,
        LANGUAGE_CONFIG[language].starterCode,
    ]),
) as Record<LangKey, string>;

export const DEFAULT_DRIVER_CODE = Object.fromEntries(
    LANGUAGE_KEYS.map((language) => [language, "{{USER_CODE}}"]),
) as Record<LangKey, string>;
