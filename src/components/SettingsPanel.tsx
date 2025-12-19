import { CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useTranslation, useThemeLanguage } from "@/hooks";
import type { SettingsPanelProps } from "@/types/components";

export function SettingsPanel({ settings, onChange, onSave }: SettingsPanelProps) {
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

            <div className="space-y-3">
                <Label htmlFor="dateFormat" className="editorial-caps text-muted-foreground">
                    {t("dateFormat")}
                </Label>
                <Select
                    value={settings.dateFormat}
                    onValueChange={(value) => onChange({ ...settings, dateFormat: value })}
                >
                    <SelectTrigger id="dateFormat" className="font-mono">
                        <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                        <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                        <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                        <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <Button onClick={onSave} className="w-full btn-primary">
                <CheckCircle className="mr-2 h-4 w-4" /> {t("saveSettings")}
            </Button>
        </div>
    );
}
