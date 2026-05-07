import { useState, useCallback } from "react";
import { calcolaProvvigioni, checkAgenti } from "@/api/calcolo";
import { ApiError } from "@/api/client";
import { parseLiquidazioniExcel, convertToCalcoloInput } from "@/importers/liquidazioni";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Liquidazione, CalcoloResult } from "@/types";

export interface UnmatchedAgent {
    name: string;
    count: number;
}

export function useCalcolo() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [data, setData] = useState<Liquidazione[]>([]);
    const [result, setResult] = useState<CalcoloResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [unmatchedAgents, setUnmatchedAgents] = useState<UnmatchedAgent[]>([]);
    const [matchedNames, setMatchedNames] = useState<Set<string> | null>(null);

    const handleUpload = useCallback(
        async (files: File[]) => {
            const file = files[0];
            if (!file) return;

            try {
                const parsed = await parseLiquidazioniExcel(file);
                setData(parsed);
                setResult(null);
                setMatchedNames(null);

                const uniqueVenditori = [
                    ...new Set(
                        parsed
                            .map((r) => r.venditore?.trim())
                            .filter((v): v is string => !!v),
                    ),
                ];

                if (uniqueVenditori.length === 0) {
                    setUnmatchedAgents([]);
                    toast({
                        title: t("uploadSuccessful"),
                        description: `${t("parsedRecords")}: ${parsed.length}.`,
                    });
                    return;
                }

                const checkResult = await checkAgenti(uniqueVenditori);
                const matched = new Set(checkResult.matches);
                setMatchedNames(matched);

                const venditoreCounts = new Map<string, number>();
                for (const record of parsed) {
                    const v = record.venditore?.trim() || "";
                    if (v) venditoreCounts.set(v, (venditoreCounts.get(v) || 0) + 1);
                }

                const unmatched: UnmatchedAgent[] = checkResult.not_found
                    .map((name) => ({
                        name,
                        count: venditoreCounts.get(name) || 0,
                    }))
                    .sort((a, b) => b.count - a.count);

                setUnmatchedAgents(unmatched);

                if (unmatched.length > 0) {
                    toast({
                        title: t("unmatchedAgentsWarning"),
                        description: `${unmatched.length} ${t("unmatchedAgentsCount")}`,
                        variant: "destructive",
                    });
                } else {
                    toast({
                        title: t("uploadSuccessful"),
                        description: `${t("parsedRecords")}: ${parsed.length}. ${t("allAgentsMatched")}`,
                    });
                }
            } catch (error) {
                const errorMsg = error instanceof Error ? error.message : t("error");
                toast({
                    title: t("uploadFailed"),
                    description: errorMsg,
                    variant: "destructive",
                });
            }
        },
        [toast, t],
    );

    const calculate = useCallback(async (): Promise<string | null> => {
        if (data.length === 0) return null;

        setLoading(true);
        setResult(null);

        try {
            if (!matchedNames || matchedNames.size === 0) {
                toast({
                    title: t("error"),
                    description: t("noMatchedRecordsToCalculate"),
                    variant: "destructive",
                });
                return null;
            }

            const matchedData = data.filter((record) => {
                const v = record.venditore?.trim() || "";
                return v !== "" && matchedNames.has(v);
            });

            if (matchedData.length === 0) {
                toast({
                    title: t("error"),
                    description: t("noMatchedRecordsToCalculate"),
                    variant: "destructive",
                });
                return null;
            }

            const inputData = convertToCalcoloInput(matchedData);
            const calcResult = await calcolaProvvigioni(inputData);
            setResult(calcResult);
            toast({
                title: t("success"),
                description: t("calculationResults"),
            });
            return t("calculateCommissions");
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({
                title: t("error"),
                description: errorMsg,
                variant: "destructive",
            });
            return null;
        } finally {
            setLoading(false);
        }
    }, [matchedNames, data, toast, t]);

    return {
        data,
        result,
        loading,
        unmatchedAgents,
        handleUpload,
        calculate,
    };
}
