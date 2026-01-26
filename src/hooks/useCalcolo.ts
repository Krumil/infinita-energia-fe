import { useState, useCallback } from "react";
import { parseLiquidazioniExcel, calcolaProvvigioni, convertToCalcoloInput, ApiError } from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agente, Liquidazione, CalcoloResult } from "@/types";

export interface UnmatchedAgent {
    name: string;
    count: number;
}

export function useCalcolo(agents: Agente[]) {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [data, setData] = useState<Liquidazione[]>([]);
    const [result, setResult] = useState<CalcoloResult | null>(null);
    const [loading, setLoading] = useState(false);
    const [unmatchedAgents, setUnmatchedAgents] = useState<UnmatchedAgent[]>([]);

    const handleUpload = useCallback(
        async (files: File[]) => {
            const file = files[0];
            if (!file) return;

            try {
                const parsed = await parseLiquidazioniExcel(file);
                setData(parsed);
                setResult(null);

                // Validate agents against loaded agents list
                const agentNames = new Set(agents.map((a) => a.nome_cognome.toLowerCase().trim()));
                const venditoreCounts = new Map<string, number>();

                // Count records per venditore
                for (const record of parsed) {
                    const venditore = record.venditore?.trim() || "";
                    if (venditore) {
                        venditoreCounts.set(venditore, (venditoreCounts.get(venditore) || 0) + 1);
                    }
                }

                // Find unmatched agents
                const unmatched: UnmatchedAgent[] = [];
                for (const [venditore, count] of venditoreCounts) {
                    if (!agentNames.has(venditore.toLowerCase())) {
                        unmatched.push({ name: venditore, count });
                    }
                }

                // Sort by count descending
                unmatched.sort((a, b) => b.count - a.count);
                setUnmatchedAgents(unmatched);

                if (unmatched.length > 0) {
                    toast({
                        title: t("unmatchedAgentsWarning"),
                        description: `${unmatched.length} ${t("unmatchedAgentsCount")}`,
                        variant: "destructive",
                    });
                } else if (agents.length > 0) {
                    toast({
                        title: t("uploadSuccessful"),
                        description: `${t("parsedRecords")}: ${parsed.length}. ${t("allAgentsMatched")}`,
                    });
                } else {
                    toast({
                        title: t("uploadSuccessful"),
                        description: `${t("parsedRecords")}: ${parsed.length}. ${t("loadAgentsFirst")}`,
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
        [toast, t, agents],
    );

    const calculate = useCallback(async (): Promise<string | null> => {
        if (data.length === 0) return null;

        setLoading(true);
        setResult(null);

        try {
            const inputData = convertToCalcoloInput(data);
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
    }, [data, toast, t]);

    return {
        data,
        result,
        loading,
        unmatchedAgents,
        handleUpload,
        calculate,
    };
}
