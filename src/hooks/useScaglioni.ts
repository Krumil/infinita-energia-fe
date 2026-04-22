import { useState, useCallback, useEffect, useRef } from "react";
import { getScaglioni, updateScaglione, importScaglioni as apiImportScaglioni } from "@/api/scaglioni";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Scaglione } from "@/types";

export function useScaglioni() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [scaglioni, setScaglioni] = useState<Scaglione[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const initialLoadDone = useRef(false);

    const loadScaglioni = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getScaglioni();
            setScaglioni(data);
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [toast, t]);

    useEffect(() => {
        if (initialLoadDone.current) return;
        initialLoadDone.current = true;
        loadScaglioni();
    }, [loadScaglioni]);

    const importScaglioni = useCallback(async () => {
        setImporting(true);
        try {
            await apiImportScaglioni();
            toast({ title: t("success"), description: t("importScaglioniSuccess") });
            await loadScaglioni();
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setImporting(false);
        }
    }, [loadScaglioni, toast, t]);

    const updateTipoUtenza = useCallback(
        async (scaglione: Scaglione, value: "residenziale" | "business" | null): Promise<void> => {
            const previousValue = scaglione.tipo_utenza;
            setScaglioni((prev) => prev.map((s) => (s.id === scaglione.id ? { ...s, tipo_utenza: value } : s)));

            try {
                await updateScaglione(scaglione.id, { tipo_utenza: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setScaglioni((prev) =>
                    prev.map((s) => (s.id === scaglione.id ? { ...s, tipo_utenza: previousValue } : s)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    const updateTipoServizio = useCallback(
        async (scaglione: Scaglione, value: "gas" | "luce" | null): Promise<void> => {
            const previousValue = scaglione.tipo_servizio;
            setScaglioni((prev) => prev.map((s) => (s.id === scaglione.id ? { ...s, tipo_servizio: value } : s)));

            try {
                await updateScaglione(scaglione.id, { tipo_servizio: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setScaglioni((prev) =>
                    prev.map((s) => (s.id === scaglione.id ? { ...s, tipo_servizio: previousValue } : s)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    return {
        scaglioni,
        loading,
        importing,
        loadScaglioni,
        importScaglioni,
        updateTipoUtenza,
        updateTipoServizio,
    };
}
