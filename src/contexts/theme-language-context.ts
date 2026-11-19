import { createContext } from "react";
import type { Language } from "../translations";

export type Theme = "light" | "dark" | "system";

interface ThemeLanguageContextType {
	theme: Theme;
	setTheme: (theme: Theme) => void;
	language: Language;
	setLanguage: (language: Language) => void;
	effectiveTheme: "light" | "dark";
}

export const ThemeLanguageContext = createContext<
	ThemeLanguageContextType | undefined
>(undefined);

