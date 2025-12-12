import { createContext, useContext, useEffect, useState } from "react";
import type { Language } from "../translations";

type Theme = "light" | "dark" | "system";

type ThemeLanguageContextType = {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  language: Language;
  setLanguage: (language: Language) => void;
  effectiveTheme: "light" | "dark";
};

const ThemeLanguageContext = createContext<ThemeLanguageContextType | undefined>(
  undefined
);

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
  // Default to Italian since this is an Italian application
  return "it";
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light";
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

export function ThemeLanguageProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [theme, setThemeState] = useState<Theme>(getStoredTheme);
  const [language, setLanguageState] = useState<Language>(getStoredLanguage);
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">(getSystemTheme);

  // Calculate effective theme
  const effectiveTheme = theme === "system" ? systemTheme : theme;

  // Listen for system theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    const handleChange = (e: MediaQueryListEvent) => {
      setSystemTheme(e.matches ? "dark" : "light");
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Apply theme to document
  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove("light", "dark");
    root.classList.add(effectiveTheme);
  }, [effectiveTheme]);

  // Persist theme
  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    try {
      localStorage.setItem(THEME_KEY, newTheme);
    } catch {
      // Ignore localStorage errors
    }
  };

  // Persist language
  const setLanguage = (newLanguage: Language) => {
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

export function useThemeLanguage() {
  const context = useContext(ThemeLanguageContext);
  if (!context) {
    throw new Error(
      "useThemeLanguage must be used within ThemeLanguageProvider"
    );
  }
  return context;
}
