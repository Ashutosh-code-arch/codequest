import { createContext } from "react";

export const ThemeContext = createContext<{
    mode: string;
    toggleTheme: () => void;
}>({
    mode: "light",
    toggleTheme: () => {},
});
