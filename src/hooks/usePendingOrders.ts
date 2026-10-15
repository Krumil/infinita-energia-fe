import { useState, useCallback, useRef } from "react";
import { excludeOrder as excludeOrderApi, getExcludedOrders, getPendingOrders, restoreOrder as restoreOrderApi } from "@/api/orders";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { ExcludedOrder, PendingOrder } from "@/types";

interface PendingOrdersHook {
    orders: PendingOrder[];
    loading: boolean;
    error: string | null;
    excludedOrders: ExcludedOrder[];
    excludedCount: number;
    excludedLoading: boolean;
    excludedError: string | null;
    mutatingRowId: string | null;
    mutationError: string | null;
    startDate: string;
    setStartDate: (date: string) => void;
    endDate: string;
    setEndDate: (date: string) => void;
    refreshOrders: (start?: string, end?: string) => Promise<void>;
    excludeOrder: (orderLineId: string, reason: string) => Promise<boolean>;
    restoreOrder: (orderLineId: string) => Promise<boolean>;
}

function errorMessage(cause: unknown, fallback: string): string {
    return cause instanceof ApiError ? cause.message : fallback;
}

export function usePendingOrders(): PendingOrdersHook {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [orders, setOrders] = useState<PendingOrder[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDateState] = useState<string>("");
    const [endDate, setEndDateState] = useState<string>("");
    const [excludedOrders, setExcludedOrders] = useState<ExcludedOrder[]>([]);
    const [excludedCount, setExcludedCount] = useState(0);
    const [excludedLoading, setExcludedLoading] = useState(false);
    const [excludedError, setExcludedError] = useState<string | null>(null);
    const [mutatingRowId, setMutatingRowId] = useState<string | null>(null);
    const [mutationError, setMutationError] = useState<string | null>(null);
    const startDateRef = useRef("");
    const endDateRef = useRef("");
    const pendingRequestRef = useRef(0);
    const excludedRequestRef = useRef(0);
    const mutatingRowsRef = useRef(new Set<string>());

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
            const requestId = ++pendingRequestRef.current;
            setLoading(true);
            setError(null);

            try {
                const effectiveStart = start ?? (startDateRef.current || undefined);
                const effectiveEnd = end ?? (endDateRef.current || undefined);
                const response = await getPendingOrders(effectiveStart, effectiveEnd);

                if (requestId === pendingRequestRef.current) {
                    setOrders(response.data);
                }
            } catch (err) {
                const errorMsg = errorMessage(err, t("fetchError"));

                if (requestId === pendingRequestRef.current) {
                    setError(errorMsg);
                    toast({ title: t("error"), description: errorMsg, variant: "destructive" });
                }
            } finally {
                if (requestId === pendingRequestRef.current) setLoading(false);
            }
        },
        [toast, t],
    );

    const fetchExcludedOrders = useCallback(async () => {
        const requestId = ++excludedRequestRef.current;
        setExcludedLoading(true);
        setExcludedError(null);

        try {
            const response = await getExcludedOrders();

            if (requestId === excludedRequestRef.current) {
                setExcludedOrders(response.data);
                setExcludedCount(response.count);
            }
        } catch (err) {
            const errorMsg = errorMessage(err, t("fetchError"));

            if (requestId === excludedRequestRef.current) {
                setExcludedError(errorMsg);
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
            }
        } finally {
            if (requestId === excludedRequestRef.current) setExcludedLoading(false);
        }
    }, [toast, t]);

    const refreshOrders = useCallback(
        async (start?: string, end?: string): Promise<void> => {
            await Promise.all([fetchPendingOrders(start, end), fetchExcludedOrders()]);
        },
        [fetchExcludedOrders, fetchPendingOrders],
    );

    const excludeOrder = useCallback(
        async (orderLineId: string, reason: string): Promise<boolean> => {
            if (mutatingRowsRef.current.size > 0) return false;
            mutatingRowsRef.current.add(orderLineId);
            setMutatingRowId(orderLineId);
            setMutationError(null);

            try {
                await excludeOrderApi(orderLineId, reason);
                pendingRequestRef.current += 1;
                setOrders((currentOrders) => currentOrders.filter((order) => order.id_riga_ordine !== orderLineId));
                void refreshOrders();

                return true;
            } catch (err) {
                const errorMsg = errorMessage(err, t("fetchError"));
                setMutationError(errorMsg);
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
                void refreshOrders();

                return false;
            } finally {
                mutatingRowsRef.current.delete(orderLineId);
                setMutatingRowId((currentRowId) => (currentRowId === orderLineId ? null : currentRowId));
            }
        },
        [refreshOrders, toast, t],
    );

    const restoreOrder = useCallback(
        async (orderLineId: string): Promise<boolean> => {
            if (mutatingRowsRef.current.size > 0) return false;
            mutatingRowsRef.current.add(orderLineId);
            setMutatingRowId(orderLineId);
            setMutationError(null);

            try {
                await restoreOrderApi(orderLineId);
                excludedRequestRef.current += 1;
                setExcludedOrders((currentOrders) =>
                    currentOrders.filter((order) => order.id_riga_ordine !== orderLineId),
                );
                setExcludedCount((currentCount) => Math.max(0, currentCount - 1));
                void refreshOrders();

                return true;
            } catch (err) {
                const errorMsg = errorMessage(err, t("fetchError"));
                setMutationError(errorMsg);
                toast({ title: t("error"), description: errorMsg, variant: "destructive" });
                void refreshOrders();

                return false;
            } finally {
                mutatingRowsRef.current.delete(orderLineId);
                setMutatingRowId((currentRowId) => (currentRowId === orderLineId ? null : currentRowId));
            }
        },
        [refreshOrders, toast, t],
    );

    return {
        orders,
        loading,
        error,
        excludedOrders,
        excludedCount,
        excludedLoading,
        excludedError,
        mutatingRowId,
        mutationError,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        refreshOrders,
        excludeOrder,
        restoreOrder,
    };
}
