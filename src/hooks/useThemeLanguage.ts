import { useContext } from "react";
import { ThemeLanguageContext } from "@/contexts/theme-language-context";

export function useThemeLanguage() {
    const context = useContext(ThemeLanguageContext);

    if (!context) {
        throw new Error("useThemeLanguage must be used within ThemeLanguageProvider");
    }

    return context;
}
