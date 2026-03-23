import { useState, useCallback, useEffect, useRef } from "react";
import { getRegole, updateRegola, importRegole as apiImportRegole } from "@/api/regole";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Regola } from "@/types";

export function useRegole() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [regole, setRegole] = useState<Regola[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const initialLoadDone = useRef(false);

    const loadRegole = useCallback(async () => {
        setLoading(true);
        try {
            const data = await getRegole();
            setRegole(data);
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
        loadRegole();
    }, [loadRegole]);

    const importRegole = useCallback(async () => {
        setImporting(true);
        try {
            await apiImportRegole();
            toast({ title: t("success"), description: t("importRulesSuccess") });
            await loadRegole();
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setImporting(false);
        }
    }, [loadRegole, toast, t]);

    const toggleUtilizzato = useCallback(
        async (regola: Regola, value: boolean): Promise<void> => {
            setRegole((prev) => prev.map((r) => (r.id === regola.id ? { ...r, utilizzato: value } : r)));

            try {
                await updateRegola(regola.id, { utilizzato: value });
                toast({ title: t("success"), description: value ? t("ruleActivated") : t("ruleDeactivated") });
            } catch (error) {
                setRegole((prev) => prev.map((r) => (r.id === regola.id ? { ...r, utilizzato: regola.utilizzato } : r)));
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    const updateDefault = useCallback(
        async (regola: Regola, value: number): Promise<void> => {
            const previousValue = regola.valore_default;
            setRegole((prev) => prev.map((r) => (r.id === regola.id ? { ...r, valore_default: value } : r)));

            try {
                await updateRegola(regola.id, { valore_default: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setRegole((prev) =>
                    prev.map((r) => (r.id === regola.id ? { ...r, valore_default: previousValue } : r)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    const updateTipoUtenza = useCallback(
        async (regola: Regola, value: "residenziale" | "business" | null): Promise<void> => {
            const previousValue = regola.tipo_utenza;
            setRegole((prev) => prev.map((r) => (r.id === regola.id ? { ...r, tipo_utenza: value } : r)));

            try {
                await updateRegola(regola.id, { tipo_utenza: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setRegole((prev) =>
                    prev.map((r) => (r.id === regola.id ? { ...r, tipo_utenza: previousValue } : r)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    const updateTipoServizio = useCallback(
        async (regola: Regola, value: "gas" | "luce" | null): Promise<void> => {
            const previousValue = regola.tipo_servizio;
            setRegole((prev) => prev.map((r) => (r.id === regola.id ? { ...r, tipo_servizio: value } : r)));

            try {
                await updateRegola(regola.id, { tipo_servizio: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setRegole((prev) =>
                    prev.map((r) => (r.id === regola.id ? { ...r, tipo_servizio: previousValue } : r)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    return {
        regole,
        loading,
        importing,
        loadRegole,
        importRegole,
        toggleUtilizzato,
        updateDefault,
        updateTipoUtenza,
        updateTipoServizio,
    };
}
