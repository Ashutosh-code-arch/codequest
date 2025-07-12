import { useContext } from "react";
import { ThemeContext } from "../../context/theme-context";

export const useThemeMode = () => useContext(ThemeContext);
