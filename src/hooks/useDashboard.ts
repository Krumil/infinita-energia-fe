import { useState, useEffect, useCallback, useRef } from "react";
import {
    getDashboardAnniDisponibili,
    getDashboardAgentiFiltro,
    getDashboardContrattiTotali,
    getDashboardProvvigioniTotali,
    getDashboardContrattiMensili,
    getDashboardProvvigioniMensili,
    getDashboardContrattiPerProdotto,
    ApiError,
} from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type {
    DashboardContrattiTotali,
    DashboardProvvigioniTotali,
    DashboardContrattiMensili,
    DashboardProvvigioniMensili,
    DashboardContrattiPerProdotto,
} from "@/types";

export interface DashboardData {
    contrattiTotali: DashboardContrattiTotali | null;
    provvigioniTotali: DashboardProvvigioniTotali | null;
    contrattiMensili: DashboardContrattiMensili | null;
    provvigioniMensili: DashboardProvvigioniMensili | null;
    contrattiPerProdotto: DashboardContrattiPerProdotto | null;
}

export function useDashboard() {
    const { toast } = useToast();
    const { t } = useTranslation();

    // Use refs for functions that shouldn't trigger re-fetching
    const toastRef = useRef(toast);
    const tRef = useRef(t);

    // Keep refs updated with latest values
    useEffect(() => {
        toastRef.current = toast;
    }, [toast]);

    useEffect(() => {
        tRef.current = t;
    }, [t]);

    const [availableYears, setAvailableYears] = useState<number[]>([]);
    const [availableAgents, setAvailableAgents] = useState<string[]>([]);
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [selectedAgent, setSelectedAgent] = useState<string | null>(null);
    const [data, setData] = useState<DashboardData>({
        contrattiTotali: null,
        provvigioniTotali: null,
        contrattiMensili: null,
        provvigioniMensili: null,
        contrattiPerProdotto: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch available years and agents on mount only
    useEffect(() => {
        let isMounted = true;

        async function fetchInitialData() {
            try {
                const [years, agents] = await Promise.all([getDashboardAnniDisponibili(), getDashboardAgentiFiltro()]);
                if (!isMounted) return;
                setAvailableYears(years);
                setAvailableAgents(agents);
                if (years.length > 0) {
                    setSelectedYear(years[0]);
                } else {
                    setLoading(false);
                }
            } catch (err) {
                if (!isMounted) return;
                const errorMsg = err instanceof ApiError ? err.message : tRef.current("fetchError");
                setError(errorMsg);
                toastRef.current({
                    title: tRef.current("error"),
                    description: errorMsg,
                    variant: "destructive",
                });
                const currentYear = new Date().getFullYear();
                setSelectedYear(currentYear);
                setAvailableYears([currentYear]);
            }
        }

        fetchInitialData();

        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch data when selectedYear or selectedAgent changes
    useEffect(() => {
        if (selectedYear === null) return;

        const year = selectedYear;
        const agent = selectedAgent ?? undefined;
        let isMounted = true;

        async function fetchData() {
            setLoading(true);
            setError(null);

            try {
                const [contrattiTotali, provvigioniTotali, contrattiMensili, provvigioniMensili, contrattiPerProdotto] =
                    await Promise.all([
                        getDashboardContrattiTotali(year, agent),
                        getDashboardProvvigioniTotali(year, agent),
                        getDashboardContrattiMensili(year, agent),
                        getDashboardProvvigioniMensili(year, agent),
                        getDashboardContrattiPerProdotto(year, agent),
                    ]);

                if (!isMounted) return;

                setData({
                    contrattiTotali,
                    provvigioniTotali,
                    contrattiMensili,
                    provvigioniMensili,
                    contrattiPerProdotto,
                });
            } catch (err) {
                if (!isMounted) return;
                const errorMsg = err instanceof ApiError ? err.message : tRef.current("fetchError");
                setError(errorMsg);
                toastRef.current({
                    title: tRef.current("error"),
                    description: errorMsg,
                    variant: "destructive",
                });
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        }

        fetchData();

        return () => {
            isMounted = false;
        };
    }, [selectedYear, selectedAgent]);

    const changeYear = useCallback((year: number) => {
        setSelectedYear(year);
    }, []);

    const changeAgent = useCallback((agent: string | null) => {
        setSelectedAgent(agent);
    }, []);

    return {
        availableYears,
        availableAgents,
        selectedYear,
        selectedAgent,
        data,
        loading,
        error,
        changeYear,
        changeAgent,
    };
}
