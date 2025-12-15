import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useThemeLanguage } from "@/contexts/ThemeLanguageContext";
import { useTranslation } from "@/hooks/useTranslation";

export function ThemeToggle() {
    const { setTheme, effectiveTheme } = useThemeLanguage();
    const { t } = useTranslation();

    const toggleTheme = () => {
        // Toggle based on current effective theme (handles system preference)
        setTheme(effectiveTheme === "dark" ? "light" : "dark");
    };

    return (
        <Button variant="ghost" size="icon" className="header-btn" onClick={toggleTheme}>
            <Sun className="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
            <Moon className="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
            <span className="sr-only">{t("theme")}</span>
        </Button>
    );
}
