import { useState, useCallback, useEffect, useRef } from "react";
import { getStoricoInviti, updateInvito as updateInvitoApi } from "@/api/inviti";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { StoricoInvito, UpdateInvitoRequest } from "@/types";

function defaultDataInizio(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    return `${yyyy}-${mm}`;
}

export function useInviti() {
    const { toast } = useToast();
    const { t } = useTranslation();
    const toastRef = useRef(toast);
    const tRef = useRef(t);
    toastRef.current = toast;
    tRef.current = t;

    const [inviti, setInviti] = useState<StoricoInvito[]>([]);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState<number | null>(null);

    const [selectedAgenteId, setSelectedAgenteId] = useState<number | undefined>();
    const [selectedStato, setSelectedStato] = useState<string | undefined>();
    const [selectedPagato, setSelectedPagato] = useState<boolean | undefined>();
    const [dataInizio, setDataInizio] = useState(defaultDataInizio);
    const [dataFine, setDataFine] = useState("");

    const fetchInviti = useCallback(async () => {
        setLoading(true);
        try {
            const params: Parameters<typeof getStoricoInviti>[0] = {};
            if (selectedAgenteId) params.agente_id = selectedAgenteId;
            if (selectedStato) params.stato = selectedStato;
            if (selectedPagato !== undefined) params.pagato = selectedPagato;
            if (dataInizio) params.data_inizio = `${dataInizio}-01`;
            if (dataFine) params.data_fine = `${dataFine}-01`;

            const data = await getStoricoInviti(params);
            setInviti(data);
        } catch (err) {
            const errorMsg = err instanceof ApiError ? err.message : tRef.current("fetchError");
            toastRef.current({ title: tRef.current("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [selectedAgenteId, selectedStato, selectedPagato, dataInizio, dataFine]);

    useEffect(() => {
        fetchInviti();
    }, [fetchInviti]);

    const updateInvito = useCallback(
        async (id: number, data: UpdateInvitoRequest) => {
            setUpdating(id);
            const previous = inviti;

            setInviti((prev) =>
                prev.map((inv) => (inv.id === id ? { ...inv, ...data } : inv)),
            );

            try {
                const updated = await updateInvitoApi(id, data);
                setInviti((prev) =>
                    prev.map((inv) => (inv.id === id ? { ...inv, ...updated } : inv)),
                );
                toastRef.current({ title: tRef.current("success"), description: tRef.current("invitationUpdated") });
            } catch (err) {
                setInviti(previous);
                const errorMsg = err instanceof ApiError ? err.message : tRef.current("invitationUpdateFailed");
                toastRef.current({ title: tRef.current("error"), description: errorMsg, variant: "destructive" });
            } finally {
                setUpdating(null);
            }
        },
        [inviti],
    );

    return {
        inviti,
        loading,
        updating,
        selectedAgenteId,
        setSelectedAgenteId,
        selectedStato,
        setSelectedStato,
        selectedPagato,
        setSelectedPagato,
        dataInizio,
        setDataInizio,
        dataFine,
        setDataFine,
        fetchInviti,
        updateInvito,
    };
}
