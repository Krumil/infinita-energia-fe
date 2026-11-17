import { useState, useCallback, useEffect, useRef } from "react";
import { getRules, updateRule, importRules as apiImportRules } from "@/api/regole";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { Rule } from "@/types";

interface Options {
    // Called after a change that can alter commission amounts, so an open preview can be marked stale.
    onChanged?: () => void;
}

export function useRules({ onChanged }: Options = {}) {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [rules, setRules] = useState<Rule[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const initialLoadDone = useRef(false);

    const loadRules = useCallback(async () => {
        setLoading(true);

        try {
            const data = await getRules();
            setRules(data);
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
        loadRules();
    }, [loadRules]);

    const importRules = useCallback(async () => {
        setImporting(true);

        try {
            await apiImportRules();
            onChanged?.();
            toast({ title: t("success"), description: t("importRulesSuccess") });
            await loadRules();
        } catch (error) {
            const errorMsg = error instanceof ApiError ? error.message : t("error");
            toast({ title: t("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setImporting(false);
        }
    }, [loadRules, onChanged, toast, t]);

    const toggleEnabled = useCallback(
        async (rule: Rule, value: boolean): Promise<void> => {
            setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, utilizzato: value } : r)));

            try {
                await updateRule(rule.id, { utilizzato: value });
                onChanged?.();
            } catch (error) {
                setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, utilizzato: rule.utilizzato } : r)));
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [onChanged, toast, t],
    );

    const updateDefault = useCallback(
        async (rule: Rule, value: number): Promise<void> => {
            const previousValue = rule.valore_default;
            setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, valore_default: value } : r)));

            try {
                await updateRule(rule.id, { valore_default: value });
                onChanged?.();
            } catch (error) {
                setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, valore_default: previousValue } : r)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [onChanged, toast, t],
    );

    const updateCustomerType = useCallback(
        async (rule: Rule, value: "residenziale" | "business" | null): Promise<void> => {
            const previousValue = rule.tipo_utenza;
            setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, tipo_utenza: value } : r)));

            try {
                await updateRule(rule.id, { tipo_utenza: value });
                onChanged?.();
            } catch (error) {
                setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, tipo_utenza: previousValue } : r)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [onChanged, toast, t],
    );

    const updateServiceType = useCallback(
        async (rule: Rule, value: "gas" | "luce" | null): Promise<void> => {
            const previousValue = rule.tipo_servizio;
            setRules((prev) => prev.map((r) => (r.id === rule.id ? { ...r, tipo_servizio: value } : r)));

            try {
                await updateRule(rule.id, { tipo_servizio: value });
                onChanged?.();
            } catch (error) {
                setRules((prev) =>
                    prev.map((r) => (r.id === rule.id ? { ...r, tipo_servizio: previousValue } : r)),
                );
                const errorMsg = error instanceof ApiError ? error.message : t("error");
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        },
        [onChanged, toast, t],
    );

    return {
        rules,
        loading,
        importing,
        loadRules,
        importRules,
        toggleEnabled,
        updateDefault,
        updateCustomerType,
        updateServiceType,
    };
}
