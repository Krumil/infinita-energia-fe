import { useState, useCallback, useRef } from "react";
import { getPendingOrders } from "@/api/orders";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { PendingOrder } from "@/types";

export function usePendingOrders() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [orders, setOrders] = useState<PendingOrder[]>([]);
    const [count, setCount] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDateState] = useState<string>("");
    const [endDate, setEndDateState] = useState<string>("");
    const startDateRef = useRef("");
    const endDateRef = useRef("");

    const setStartDate = useCallback((date: string) => {
        startDateRef.current = date;
        setStartDateState(date);
    }, []);

    const setEndDate = useCallback((date: string) => {
        endDateRef.current = date;
        setEndDateState(date);
    }, []);

    const fetchPendingOrders = useCallback(
        async (start?: string, end?: string) => {
            setLoading(true);
            setError(null);

            try {
                const effectiveStart = start ?? (startDateRef.current || undefined);
                const effectiveEnd = end ?? (endDateRef.current || undefined);
                const response = await getPendingOrders(effectiveStart, effectiveEnd);
                setOrders(response.data);
                setCount(response.count);
            } catch (err) {
                const errorMsg = err instanceof ApiError ? err.message : t("fetchError");
                setError(errorMsg);
                toast({
                    title: t("error"),
                    description: errorMsg,
                    variant: "destructive",
                });
            } finally {
                setLoading(false);
            }
        },
        [toast, t],
    );

    const clearOrders = useCallback(() => {
        setOrders([]);
        setCount(0);
        setError(null);
    }, []);

    return {
        orders,
        count,
        loading,
        error,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        fetchPendingOrders,
        clearOrders,
    };
}
