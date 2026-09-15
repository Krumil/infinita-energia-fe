import { useState, useCallback } from "react";
import { calculateCommissions, checkAgents } from "@/api/calcolo";
import { ApiError } from "@/api/client";
import { parseSettlementsExcel, convertToCalculationInput } from "@/importers/liquidazioni";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Settlement, CalculationResult } from "@/types";

export interface UnmatchedAgent {
    name: string;
    count: number;
}

export function useCalculation() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [data, setData] = useState<Settlement[]>([]);
    const [result, setResult] = useState<CalculationResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [unmatchedAgents, setUnmatchedAgents] = useState<UnmatchedAgent[]>([]);
    const [matchedNames, setMatchedNames] = useState<Set<string> | null>(null);

    const handleUpload = useCallback(
        async (files: File[]) => {
            const file = files[0];

            if (!file) return;

            try {
                const parsed = await parseSettlementsExcel(file);
                setData(parsed);
                setResult(null);
                setMatchedNames(null);

                const uniqueSellers = [
                    ...new Set(
                        parsed
                            .map((r) => r.venditore?.trim())
                            .filter((v): v is string => !!v),
                    ),
                ];

                if (uniqueSellers.length === 0) {
                    setUnmatchedAgents([]);
                    toast({
                        title: t("uploadSuccessful"),
                        description: `${t("parsedRecords")}: ${parsed.length}.`,
                    });

                    return;
                }

                const checkResult = await checkAgents(uniqueSellers);
                const matched = new Set(checkResult.matches);
                setMatchedNames(matched);

                const sellerCounts = new Map<string, number>();

                for (const record of parsed) {
                    const v = record.venditore?.trim() || "";

                    if (v) sellerCounts.set(v, (sellerCounts.get(v) || 0) + 1);
                }

                const unmatched: UnmatchedAgent[] = checkResult.not_found
                    .map((name) => ({
                        name,
                        count: sellerCounts.get(name) || 0,
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

            const inputData = convertToCalculationInput(matchedData);
            const calcResult = await calculateCommissions(inputData);
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
