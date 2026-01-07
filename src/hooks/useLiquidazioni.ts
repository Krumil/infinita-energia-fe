import { useState, useCallback } from "react";
import { parseLiquidazioniExcel, importLiquidazioni, ApiError } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";

interface LiquidazioniResult {
    success: boolean;
    message: string;
    count: number;
}

export function useLiquidazioni() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<LiquidazioniResult | null>(null);

    const handleUpload = useCallback(
        async (files: File[], competenzaPeriod?: string): Promise<string | null> => {
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
                    const resultData = {
                        success: true,
                        message: importResult.message,
                        count: parsedData.length,
                    };
                    setResult(resultData);
                    toast({
                        title: t("success"),
                        description: importResult.message,
                    });
                    return `${t("liquidationsImported")}: ${parsedData.length}`;
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
        [toast, t]
    );

    return {
        importing,
        result,
        handleUpload,
    };
}
