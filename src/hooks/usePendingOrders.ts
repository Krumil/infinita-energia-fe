import { useState, useCallback } from "react";
import { getPendingOrders, ApiError } from "@/api";
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

    const fetchPendingOrders = useCallback(async () => {
        setLoading(true);
        setError(null);

        try {
            const response = await getPendingOrders();
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
    }, [toast, t]);

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
        fetchPendingOrders,
        clearOrders,
    };
}
