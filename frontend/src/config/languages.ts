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
        starterCode: `function solution() {
        // your code here
        }
        `,
    },
    PYTHON: {
        label: "Python",
        monacoLang: "python",
        starterCode: `def solution():
    # your code here
    pass
`,
    },
    JAVA: {
        label: "Java",
        monacoLang: "java",
        starterCode: `class Solution {
    public void solution() {
        // your code here
    }
}
`,
    },
    CPP: {
        label: "C++",
        monacoLang: "cpp",
        starterCode: `#include <bits/stdc++.h>
                      using namespace std;

                        int main() {
                            // your code here
                            return 0;
                        }
`,
    },
    C: {
        label: "C",
        monacoLang: "c",
        starterCode: `#include <stdio.h>

                        int main() {
                            // your code here
                            return 0;
                        }
`,
    },
};

export const LANGUAGE_KEYS = Object.keys(LANGUAGE_CONFIG) as LangKey[];
