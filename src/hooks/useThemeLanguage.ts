import { useContext } from "react";
import { ThemeLanguageContext } from "@/contexts/themeLanguageContextDef";

export function useThemeLanguage() {
    const context = useContext(ThemeLanguageContext);
    if (!context) {
        throw new Error("useThemeLanguage must be used within ThemeLanguageProvider");
    }
    return context;
}
