import { useCallback, useState } from "react";
import { getCalcoloNonPagati } from "@/api/calcolo";
import { getStoricoInviti } from "@/api/inviti";
import { ApiError } from "@/api/client";
import { downloadCsv, toCsv } from "@/lib/csvUtils";
import { PROVVIGIONE_HEADERS, provvigioneToRow } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { StoricoInvito } from "@/types";

export interface NonLiquidatiAgent {
    id: number;
    name: string;
}

function formatToday(): string {
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
}

function sanitizeFilename(name: string): string {
    return name.trim().replace(/[^\w.-]+/g, "_");
}

export function useInvitiNonLiquidati() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
    const [selectedInvitoIds, setSelectedInvitoIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [nonLiquidatiInviti, setNonLiquidatiInviti] = useState<StoricoInvito[]>([]);
    const [selectionLoading, setSelectionLoading] = useState(false);

    const enterSelectionMode = useCallback(async () => {
        setSelectionMode(true);
        setSelectedAgentId(null);
        setSelectedInvitoIds(new Set());
        setSelectionLoading(true);
        try {
            const data = await getStoricoInviti({ pagato: false });
            setNonLiquidatiInviti(data);
        } catch (err) {
            const reason = err instanceof ApiError ? err.message : t("fetchError");
            toast({ title: t("error"), description: reason, variant: "destructive" });
            setNonLiquidatiInviti([]);
        } finally {
            setSelectionLoading(false);
        }
    }, [t, toast]);

    const exitSelectionMode = useCallback(() => {
        setSelectionMode(false);
        setSelectedAgentId(null);
        setSelectedInvitoIds(new Set());
        setNonLiquidatiInviti([]);
    }, []);

    const selectAgent = useCallback((agentId: number, eligibleInvitoIds: number[]) => {
        setSelectedAgentId(agentId);
        setSelectedInvitoIds(new Set(eligibleInvitoIds));
    }, []);

    const toggleInvito = useCallback((invitoId: number) => {
        setSelectedInvitoIds((prev) => {
            const next = new Set(prev);
            if (next.has(invitoId)) {
                next.delete(invitoId);
            } else {
                next.add(invitoId);
            }
            return next;
        });
    }, []);

    const runCalculation = useCallback(
        async (agent: NonLiquidatiAgent, mesi: string[]) => {
            if (mesi.length === 0 || loading) return;

            setLoading(true);
            try {
                const response = await getCalcoloNonPagati(agent.id, mesi);

                if (response.kind === "empty" || response.dati_provvigione.length === 0) {
                    toast({
                        title: t("error"),
                        description: t("unpaidCalcNoData"),
                        variant: "destructive",
                    });
                    return;
                }

                const csv = toCsv(
                    [...PROVVIGIONE_HEADERS],
                    response.dati_provvigione.map(provvigioneToRow),
                    { delimiter: ";", decimal: "," },
                );
                downloadCsv(`non-liquidati_${sanitizeFilename(agent.name)}_${formatToday()}.csv`, csv);

                const summary = t("unpaidCalcDoneSingle")
                    .replace("{rows}", String(response.dati_provvigione.length))
                    .replace("{agent}", agent.name);
                toast({ title: t("success"), description: summary });

                setSelectionMode(false);
                setSelectedAgentId(null);
                setSelectedInvitoIds(new Set());
                setNonLiquidatiInviti([]);
            } catch (err) {
                const reason = err instanceof ApiError ? err.message : t("error");
                toast({ title: t("error"), description: reason, variant: "destructive" });
            } finally {
                setLoading(false);
            }
        },
        [loading, t, toast],
    );

    return {
        selectionMode,
        selectedAgentId,
        selectedInvitoIds,
        loading,
        nonLiquidatiInviti,
        selectionLoading,
        enterSelectionMode,
        exitSelectionMode,
        selectAgent,
        toggleInvito,
        runCalculation,
    };
}
