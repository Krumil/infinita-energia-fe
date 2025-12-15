import { useState, useCallback } from "react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { AppSettings } from "@/types";

const SETTINGS_KEY = "app-settings";

const defaultSettings: AppSettings = {
    dateFormat: "DD/MM/YYYY",
};

function loadSettingsFromStorage(): AppSettings {
    try {
        const stored = localStorage.getItem(SETTINGS_KEY);
        return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
    } catch {
        return defaultSettings;
    }
}

function saveSettingsToStorage(settings: AppSettings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

export function useAppSettings() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const [settings, setSettings] = useState<AppSettings>(loadSettingsFromStorage);
    const [sheetOpen, setSheetOpen] = useState(false);

    const saveSettings = useCallback(() => {
        saveSettingsToStorage(settings);
        setSheetOpen(false);
        toast({
            title: t("settingsSaved"),
            description: t("preferencesUpdated"),
        });
    }, [settings, toast, t]);

    return {
        settings,
        setSettings,
        saveSettings,
        sheetOpen,
        setSheetOpen,
    };
}
