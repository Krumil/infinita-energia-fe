import { useState, useCallback } from "react";
import { importLiquidazioni } from "@/api/liquidazioni";
import { ApiError } from "@/api/client";
import { parseLiquidazioniExcel } from "@/importers/liquidazioni";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface LiquidazioniResult {
    success: boolean;
    message: string;
    count: number;
    hasNewRules: boolean;
}

function extractNewRulesCount(message: string): number {
    const match = message.match(/Aggiunte\s+(\d+)\s+nuove regole/i);
    return match ? Number(match[1]) : 0;
}

export function useLiquidazioni() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<LiquidazioniResult | null>(null);

    const handleUpload = useCallback(
        async (files: File[], competenzaPeriod?: string): Promise<{ action: string; hasNewRules: boolean } | null> => {
            const file = files[0];
            if (!file) return null;

            setImporting(true);
            setResult(null);

            try {
                const parsedData = await parseLiquidazioniExcel(file);

                // Override competenza period with user selection
                if (competenzaPeriod) {
                    const [year, month] = competenzaPeriod.split("-").map(Number);

                    // Format for backend: MM/YYYY (required by pandas conversion)
                    const competenzaLiquidazione = `${String(month).padStart(2, "0")}/${year}`;

                    // Format for comp_dal/comp_al: YYYY-MM-DD
                    const periodDate = `${competenzaPeriod}-01`;
                    const lastDay = new Date(year, month, 0).getDate();
                    const periodEndDate = `${competenzaPeriod}-${String(lastDay).padStart(2, "0")}`;

                    for (const record of parsedData) {
                        // Set competenza_liquidazione in MM/YYYY format for backend
                        record.competenza_liquidazione = competenzaLiquidazione;
                        record.comp_dal = periodDate;
                        record.comp_al = periodEndDate;
                    }
                }

                if (parsedData.length === 0) {
                    toast({
                        title: t("error"),
                        description: t("noDataFound"),
                        variant: "destructive",
                    });
                    setImporting(false);
                    return null;
                }

                const importResult = await importLiquidazioni(parsedData);

                if (importResult.success) {
                    const newRulesCount = extractNewRulesCount(importResult.message);
                    const resultData = {
                        success: true,
                        message: importResult.message,
                        count: parsedData.length,
                        hasNewRules: newRulesCount > 0,
                    };
                    setResult(resultData);
                    toast({
                        title: t("success"),
                        description: importResult.message,
                    });
                    return {
                        action: `${t("liquidationsImported")}: ${parsedData.length}`,
                        hasNewRules: resultData.hasNewRules,
                    };
                } else {
                    toast({
                        title: t("error"),
                        description: importResult.error || importResult.message,
                        variant: "destructive",
                    });
                    return null;
                }
            } catch (error) {
                const errorMsg =
                    error instanceof ApiError ? error.message : error instanceof Error ? error.message : t("error");
                toast({
                    title: t("uploadFailed"),
                    description: errorMsg,
                    variant: "destructive",
                });
                return null;
            } finally {
                setImporting(false);
            }
        },
        [toast, t],
    );

    return {
        importing,
        result,
        handleUpload,
    };
}
