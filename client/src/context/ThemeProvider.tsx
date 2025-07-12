import {
    createTheme,
    CssBaseline,
    ThemeProvider as MuiThemeProvider,
} from "@mui/material";
import { useMemo, useState, type ReactNode } from "react";
import { ThemeContext } from "./theme-context";

export const CustomThemeProvider = ({ children }: { children: ReactNode }) => {
    const [mode, setMode] = useState<"light" | "dark">("light");

    const toggleTheme = () =>
        setMode((prev) => (prev === "light" ? "dark" : "light"));

    const theme = useMemo(
        () =>
            createTheme({
                palette: {
                    mode,
                    ...(mode === "dark"
                        ? {
                              background: {
                                  default: "#1a1a2e",
                                  paper: "#2e2e48",
                              },
                              text: {
                                  primary: "#f0f0f0",
                                  secondary: "#a0a0b0",
                              },
                          }
                        : {
                              background: {
                                  default: "#f9f9f9",
                                  paper: "#fff",
                              },
                              text: {
                                  primary: "#000",
                              },
                          }),
                },
            }),
        [mode]
    );

    // const theme = useMemo(() => createTheme({ palette: { mode } }), [mode]);

    return (
        <ThemeContext.Provider value={{ mode, toggleTheme }}>
            <MuiThemeProvider theme={theme}>
                <CssBaseline />
                {children}
            </MuiThemeProvider>
        </ThemeContext.Provider>
    );
};
