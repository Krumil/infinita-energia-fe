import { useState, useEffect, useCallback, useRef } from "react";
import {
    getDashboardAnniDisponibili,
    getDashboardContrattiTotali,
    getDashboardProvvigioniTotali,
    getDashboardContrattiMensili,
    getDashboardProvvigioniMensili,
    ApiError,
} from "@/api";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type {
    DashboardContrattiTotali,
    DashboardProvvigioniTotali,
    DashboardContrattiMensili,
    DashboardProvvigioniMensili,
} from "@/types";

export interface DashboardData {
    contrattiTotali: DashboardContrattiTotali | null;
    provvigioniTotali: DashboardProvvigioniTotali | null;
    contrattiMensili: DashboardContrattiMensili | null;
    provvigioniMensili: DashboardProvvigioniMensili | null;
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
    const [selectedYear, setSelectedYear] = useState<number | null>(null);
    const [data, setData] = useState<DashboardData>({
        contrattiTotali: null,
        provvigioniTotali: null,
        contrattiMensili: null,
        provvigioniMensili: null,
    });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Fetch available years on mount only
    useEffect(() => {
        let isMounted = true;

        async function fetchYears() {
            try {
                const years = await getDashboardAnniDisponibili();
                if (!isMounted) return;
                setAvailableYears(years);
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

        fetchYears();

        return () => {
            isMounted = false;
        };
    }, []);

    // Fetch data when selectedYear changes
    useEffect(() => {
        if (selectedYear === null) return;

        const year = selectedYear;
        let isMounted = true;

        async function fetchData() {
            setLoading(true);
            setError(null);

            try {
                const [contrattiTotali, provvigioniTotali, contrattiMensili, provvigioniMensili] = await Promise.all([
                    getDashboardContrattiTotali(year),
                    getDashboardProvvigioniTotali(year),
                    getDashboardContrattiMensili(year),
                    getDashboardProvvigioniMensili(year),
                ]);

                if (!isMounted) return;

                setData({
                    contrattiTotali,
                    provvigioniTotali,
                    contrattiMensili,
                    provvigioniMensili,
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
    }, [selectedYear]);

    const changeYear = useCallback((year: number) => {
        setSelectedYear(year);
    }, []);

    return {
        availableYears,
        selectedYear,
        data,
        loading,
        error,
        changeYear,
    };
}
