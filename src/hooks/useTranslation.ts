import { useThemeLanguage } from "./useThemeLanguage";
import { getTranslation, type TranslationKey } from "../translations";

export function useTranslation() {
    const { language } = useThemeLanguage();

    const t = (key: TranslationKey): string => {
        return getTranslation(language, key);
    };

    return { t, language };
}
