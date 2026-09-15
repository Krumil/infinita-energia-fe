import { useEffect, useState, type ReactElement, type ReactNode } from "react";
import type { Language } from "../translations";
import { ThemeLanguageContext, type Theme } from "./theme-language-context";

interface ThemeLanguageProviderProps {
	children: ReactNode;
}

const THEME_KEY = "app-theme";

const LANGUAGE_KEY = "app-language";

function getStoredTheme(): Theme {
	try {
		const stored = localStorage.getItem(THEME_KEY);

		if (stored === "light" || stored === "dark" || stored === "system") {
			return stored;
		}
	} catch {
		// Ignore localStorage errors
	}

	return "system";
}

function getStoredLanguage(): Language {
	try {
		const stored = localStorage.getItem(LANGUAGE_KEY);

		if (stored === "en" || stored === "it") {
			return stored;
		}
	} catch {
		// Ignore localStorage errors
	}

	return "it";
}

function getSystemTheme(): "light" | "dark" {
	if (typeof window === "undefined") return "light";

	return window.matchMedia("(prefers-color-scheme: dark)").matches
		? "dark"
		: "light";
}

export function ThemeLanguageProvider({ children }: ThemeLanguageProviderProps): ReactElement {
	const [theme, setThemeState] = useState<Theme>(getStoredTheme);
	const [language, setLanguageState] = useState<Language>(getStoredLanguage);

	const [systemTheme, setSystemTheme] = useState<"light" | "dark">(
		getSystemTheme,
	);

	const effectiveTheme = theme === "system" ? systemTheme : theme;

	useEffect(() => {
		const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");

		const handleChange = (e: MediaQueryListEvent) => {
			setSystemTheme(e.matches ? "dark" : "light");
		};

		mediaQuery.addEventListener("change", handleChange);

		return () => mediaQuery.removeEventListener("change", handleChange);
	}, []);

	useEffect(() => {
		const root = window.document.documentElement;
		root.classList.remove("light", "dark");
		root.classList.add(effectiveTheme);
	}, [effectiveTheme]);

	const setTheme = (newTheme: Theme): void => {
		setThemeState(newTheme);

		try {
			localStorage.setItem(THEME_KEY, newTheme);
		} catch {
			// Ignore localStorage errors
		}
	};

	const setLanguage = (newLanguage: Language): void => {
		setLanguageState(newLanguage);

		try {
			localStorage.setItem(LANGUAGE_KEY, newLanguage);
		} catch {
			// Ignore localStorage errors
		}
	};

	return (
		<ThemeLanguageContext.Provider
			value={{ theme, setTheme, language, setLanguage, effectiveTheme }}
		>
			{children}
		</ThemeLanguageContext.Provider>
	);
}
