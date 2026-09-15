import { useState, useCallback, useEffect, useRef } from "react";
import { getTiers, updateTier, importTiers as apiImportTiers } from "@/api/scaglioni";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Tier } from "@/types";

export function useTiers() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [tiers, setTiers] = useState<Tier[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const initialLoadDone = useRef(false);

    const loadTiers = useCallback(async () => {
        setLoading(true);

        try {
            const data = await getTiers();
            setTiers(data);
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
        loadTiers();
    }, [loadTiers]);

    const importTiers = useCallback(async () => {
        setImporting(true);

        try {
            await apiImportTiers();
            toast({ title: t("success"), description: t("importScaglioniSuccess") });
            await loadTiers();
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setImporting(false);
        }
    }, [loadTiers, toast, t]);

    const updateCustomerType = useCallback(
        async (tier: Tier, value: "residenziale" | "business" | null): Promise<void> => {
            const previousValue = tier.tipo_utenza;
            setTiers((prev) => prev.map((s) => (s.id === tier.id ? { ...s, tipo_utenza: value } : s)));

            try {
                await updateTier(tier.id, { tipo_utenza: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setTiers((prev) =>
                    prev.map((s) => (s.id === tier.id ? { ...s, tipo_utenza: previousValue } : s)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    const updateServiceType = useCallback(
        async (tier: Tier, value: "gas" | "luce" | null): Promise<void> => {
            const previousValue = tier.tipo_servizio;
            setTiers((prev) => prev.map((s) => (s.id === tier.id ? { ...s, tipo_servizio: value } : s)));

            try {
                await updateTier(tier.id, { tipo_servizio: value });
                toast({ title: t("success"), description: t("defaultUpdated") });
            } catch (error) {
                setTiers((prev) =>
                    prev.map((s) => (s.id === tier.id ? { ...s, tipo_servizio: previousValue } : s)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [toast, t],
    );

    return {
        tiers,
        loading,
        importing,
        loadTiers,
        importTiers,
        updateCustomerType,
        updateServiceType,
    };
}
