import { useState, useCallback } from "react";
import { parseLiquidazioniExcel, importLiquidazioni, validateLiquidazioni, ApiError } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Liquidazione } from "@/types";

export function useLiquidazioni() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [parsed, setParsed] = useState<Liquidazione[]>([]);
    const [valid, setValid] = useState<Liquidazione[]>([]);
    const [invalidCount, setInvalidCount] = useState(0);
    const [importing, setImporting] = useState(false);
    const [importedCount, setImportedCount] = useState(0);

    const handleUpload = useCallback(
        async (files: File[]) => {
            const file = files[0];
            if (!file) return;

            try {
                const parsedData = await parseLiquidazioniExcel(file);
                const { valid: validData, invalid } = validateLiquidazioni(parsedData);
                setParsed(parsedData);
                setValid(validData);
                setInvalidCount(invalid);
                toast({
                    title: t("uploadSuccessful"),
                    description: `${t("parsedRecords")}: ${parsedData.length}`,
                });
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : t("error");
                toast({
                    title: t("uploadFailed"),
                    description: errorMsg,
                    variant: "destructive",
                });
            }
        },
        [toast, t]
    );

    const handleImport = useCallback(async (): Promise<string | null> => {
        if (valid.length === 0) return null;

        setImporting(true);
        try {
            const result = await importLiquidazioni(valid);
            if (result.success) {
                setImportedCount(valid.length);
                toast({
                    title: t("success"),
                    description: result.message,
                });
                // Reset state after successful import
                setParsed([]);
                setValid([]);
                setInvalidCount(0);
                return `${t("liquidationsImported")}: ${valid.length}`;
            } else {
                toast({
                    title: t("error"),
                    description: result.error || result.message,
                    variant: "destructive",
                });
                return null;
            }
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({
                title: t("error"),
                description: errorMsg,
                variant: "destructive",
            });
            return null;
        } finally {
            setImporting(false);
        }
    }, [valid, toast, t]);

    return {
        parsed,
        valid,
        invalidCount,
        importing,
        importedCount,
        handleUpload,
        handleImport,
    };
}
