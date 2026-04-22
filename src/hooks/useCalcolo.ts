import { useState, useCallback } from "react";
import { calcolaProvvigioni } from "@/api/calcolo";
import { ApiError } from "@/api/client";
import { parseLiquidazioniExcel, convertToCalcoloInput } from "@/importers/liquidazioni";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Agente, Liquidazione, CalcoloResult } from "@/types";

export interface UnmatchedAgent {
    name: string;
    count: number;
}

function normalizeSellerName(value: string | null | undefined): string {
    return value?.trim().toLowerCase() ?? "";
}

function createAgentNameSet(agents: Agente[]): Set<string> {
    return new Set(agents.map((agent) => normalizeSellerName(agent.nome_cognome)).filter(Boolean));
}

function collectUnmatchedAgents(data: Liquidazione[], agentNames: Set<string>): UnmatchedAgent[] {
    const venditoreCounts = new Map<string, number>();

    for (const record of data) {
        const venditore = record.venditore?.trim() || "";
        if (venditore) {
            venditoreCounts.set(venditore, (venditoreCounts.get(venditore) || 0) + 1);
        }
    }

    const unmatched: UnmatchedAgent[] = [];
    for (const [venditore, count] of venditoreCounts) {
        if (!agentNames.has(venditore.toLowerCase())) {
            unmatched.push({ name: venditore, count });
        }
    }

    unmatched.sort((a, b) => b.count - a.count);
    return unmatched;
}

function filterMatchedLiquidazioni(data: Liquidazione[], agentNames: Set<string>): Liquidazione[] {
    return data.filter((record) => {
        const venditore = normalizeSellerName(record.venditore);
        return venditore !== "" && agentNames.has(venditore);
    });
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
                const agentNames = createAgentNameSet(agents);
                const unmatched = collectUnmatchedAgents(parsed, agentNames);
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
            const agentNames = createAgentNameSet(agents);
            if (agentNames.size === 0) {
                toast({
                    title: t("error"),
                    description: t("loadAgentsFirst"),
                    variant: "destructive",
                });
                return null;
            }

            const matchedData = filterMatchedLiquidazioni(data, agentNames);
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
    }, [agents, data, toast, t]);

    return {
        data,
        result,
        loading,
        unmatchedAgents,
        handleUpload,
        calculate,
    };
}
