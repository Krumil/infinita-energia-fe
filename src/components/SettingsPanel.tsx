import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation, useThemeLanguage } from "@/hooks";

export function SettingsPanel() {
    const { t } = useTranslation();
    const { theme, setTheme, language, setLanguage } = useThemeLanguage();

    return (
        <div className="space-y-8">
            <div className="space-y-3">
                <Label htmlFor="theme" className="editorial-caps text-muted-foreground">
                    {t("theme")}
                </Label>
                <Select value={theme} onValueChange={(value: "light" | "dark" | "system") => setTheme(value)}>
                    <SelectTrigger id="theme" className="font-mono">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="light">{t("light")}</SelectItem>
                        <SelectItem value="dark">{t("dark")}</SelectItem>
                        <SelectItem value="system">{t("system")}</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-3">
                <Label htmlFor="language" className="editorial-caps text-muted-foreground">
                    {t("language")}
                </Label>
                <Select value={language} onValueChange={(value: "it" | "en") => setLanguage(value)}>
                    <SelectTrigger id="language" className="font-mono">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="it">
                            <span className="flex items-center gap-2">
                                <span>Italiano</span>
                            </span>
                        </SelectItem>
                        <SelectItem value="en">
                            <span className="flex items-center gap-2">
                                <span>English</span>
                            </span>
                        </SelectItem>
                    </SelectContent>
                </Select>
            </div>
        </div>
    );
}
