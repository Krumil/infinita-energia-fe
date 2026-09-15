import { useCallback, useState } from "react";
import { getUnpaidCalculation } from "@/api/calcolo";
import { getInvoiceRequests } from "@/api/inviti";
import { ApiError } from "@/api/client";
import { downloadCsv, toCsv } from "@/lib/csvUtils";
import { COMMISSION_HEADERS, commissionToRow } from "@/lib/exportUtils";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { InvoiceRequest } from "@/types";

export interface UnpaidAgent {
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

export function useUnpaidInvoiceRequests() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [selectionMode, setSelectionMode] = useState(false);
    const [selectedAgentId, setSelectedAgentId] = useState<number | null>(null);
    const [selectedInvoiceRequestIds, setSelectedInvoiceRequestIds] = useState<Set<number>>(new Set());
    const [loading, setLoading] = useState(false);
    const [unpaidInvoiceRequests, setUnpaidInvoiceRequests] = useState<InvoiceRequest[]>([]);
    const [selectionLoading, setSelectionLoading] = useState(false);

    const enterSelectionMode = useCallback(async () => {
        setSelectionMode(true);
        setSelectedAgentId(null);
        setSelectedInvoiceRequestIds(new Set());
        setSelectionLoading(true);

        try {
            const data = await getInvoiceRequests({ pagato: false });
            setUnpaidInvoiceRequests(data);
        } catch (err) {
            const reason = err instanceof ApiError ? err.message : t("fetchError");
            toast({ title: t("error"), description: reason, variant: "destructive" });
            setUnpaidInvoiceRequests([]);
        } finally {
            setSelectionLoading(false);
        }
    }, [t, toast]);

    const exitSelectionMode = useCallback(() => {
        setSelectionMode(false);
        setSelectedAgentId(null);
        setSelectedInvoiceRequestIds(new Set());
        setUnpaidInvoiceRequests([]);
    }, []);

    const selectAgent = useCallback((agentId: number, eligibleInvoiceRequestIds: number[]) => {
        setSelectedAgentId(agentId);
        setSelectedInvoiceRequestIds(new Set(eligibleInvoiceRequestIds));
    }, []);

    const toggleInvoiceRequest = useCallback((invoiceRequestId: number) => {
        setSelectedInvoiceRequestIds((prev) => {
            const next = new Set(prev);

            if (next.has(invoiceRequestId)) {
                next.delete(invoiceRequestId);
            } else {
                next.add(invoiceRequestId);
            }

            return next;
        });
    }, []);

    const runCalculation = useCallback(
        async (agent: UnpaidAgent, months: string[]) => {
            if (months.length === 0 || loading) return;

            setLoading(true);

            try {
                const response = await getUnpaidCalculation(agent.id, months);

                if (response.kind === "empty" || response.dati_provvigione.length === 0) {
                    toast({
                        title: t("error"),
                        description: t("unpaidCalcNoData"),
                        variant: "destructive",
                    });

                    return;
                }

                const csv = toCsv(
                    [...COMMISSION_HEADERS],
                    response.dati_provvigione.map(commissionToRow),
                    { delimiter: ";", decimal: "," },
                );

                downloadCsv(`non-liquidati_${sanitizeFilename(agent.name)}_${formatToday()}.csv`, csv);

                const summary = t("unpaidCalcDoneSingle")
                    .replace("{rows}", String(response.dati_provvigione.length))
                    .replace("{agent}", agent.name);

                toast({ title: t("success"), description: summary });

                setSelectionMode(false);
                setSelectedAgentId(null);
                setSelectedInvoiceRequestIds(new Set());
                setUnpaidInvoiceRequests([]);
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
        selectedInvoiceRequestIds,
        loading,
        unpaidInvoiceRequests,
        selectionLoading,
        enterSelectionMode,
        exitSelectionMode,
        selectAgent,
        toggleInvoiceRequest,
        runCalculation,
    };
}
