import { useState, useCallback, useEffect, useRef, type Dispatch, type SetStateAction } from "react";
import { getInvoiceRequests, updateInvoiceRequest as updateInvoiceRequestApi } from "@/api/inviti";
import { ApiError } from "@/api/client";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { InvoiceRequest, UpdateInvoiceRequestPayload } from "@/types";

export interface UpdateInvoiceRequestSuccess {
    ok: true;
    invoiceRequest: InvoiceRequest;
}

export interface UpdateInvoiceRequestFailure {
    ok: false;
    error: string;
}

export type UpdateInvoiceRequestResult = UpdateInvoiceRequestSuccess | UpdateInvoiceRequestFailure;

export interface UseInvoiceRequestsResult {
    invoiceRequests: InvoiceRequest[];
    loading: boolean;
    updating: number | null;
    filteredAgentId: number | undefined;
    setFilteredAgentId: Dispatch<SetStateAction<number | undefined>>;
    selectedStatus: string | undefined;
    setSelectedStatus: Dispatch<SetStateAction<string | undefined>>;
    selectedPaid: boolean | undefined;
    setSelectedPaid: Dispatch<SetStateAction<boolean | undefined>>;
    startDate: string;
    setStartDate: Dispatch<SetStateAction<string>>;
    endDate: string;
    setEndDate: Dispatch<SetStateAction<string>>;
    fetchInvoiceRequests: () => Promise<void>;
    updateInvoiceRequest: (id: number, data: UpdateInvoiceRequestPayload) => Promise<UpdateInvoiceRequestResult>;
}

function defaultStartDate(): string {
    const d = new Date();
    d.setMonth(d.getMonth() - 12);
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");

    return `${yyyy}-${mm}`;
}

export function useInvoiceRequests(): UseInvoiceRequestsResult {
    const { toast } = useToast();
    const { t } = useTranslation();
    const toastRef = useRef(toast);
    const tRef = useRef(t);
    toastRef.current = toast;
    tRef.current = t;

    const [invoiceRequests, setInvoiceRequests] = useState<InvoiceRequest[]>([]);
    const [loading, setLoading] = useState(false);
    const [updating, setUpdating] = useState<number | null>(null);

    const [filteredAgentId, setFilteredAgentId] = useState<number | undefined>();
    const [selectedStatus, setSelectedStatus] = useState<string | undefined>();
    const [selectedPaid, setSelectedPaid] = useState<boolean | undefined>();
    const [startDate, setStartDate] = useState(defaultStartDate);
    const [endDate, setEndDate] = useState("");

    const fetchInvoiceRequests = useCallback(async () => {
        setLoading(true);

        try {
            const params: Parameters<typeof getInvoiceRequests>[0] = {};

            if (filteredAgentId) params.agente_id = filteredAgentId;

            if (selectedStatus) params.stato = selectedStatus;

            if (selectedPaid !== undefined) params.pagato = selectedPaid;

            if (startDate) params.data_inizio = `${startDate}-01`;

            if (endDate) params.data_fine = `${endDate}-01`;

            const data = await getInvoiceRequests(params);
            setInvoiceRequests(data);
        } catch (err) {
            const errorMsg = err instanceof ApiError ? err.message : tRef.current("fetchError");
            toastRef.current({ title: tRef.current("error"), description: errorMsg, variant: "destructive" });
        } finally {
            setLoading(false);
        }
    }, [filteredAgentId, selectedStatus, selectedPaid, startDate, endDate]);

    useEffect(() => {
        fetchInvoiceRequests();
    }, [fetchInvoiceRequests]);

    const updateInvoiceRequest = useCallback(
        async (id: number, data: UpdateInvoiceRequestPayload): Promise<UpdateInvoiceRequestResult> => {
            setUpdating(id);
            const previous = invoiceRequests;

            setInvoiceRequests((prev) =>
                prev.map((invoiceRequest) => (invoiceRequest.id === id ? { ...invoiceRequest, ...data } : invoiceRequest)),
            );

            try {
                const updated = await updateInvoiceRequestApi(id, data);
                setInvoiceRequests((prev) =>
                    prev.map((invoiceRequest) => (invoiceRequest.id === id ? { ...invoiceRequest, ...updated } : invoiceRequest)),
                );
                toastRef.current({ title: tRef.current("success"), description: tRef.current("invitationUpdated") });

                return { ok: true, invoiceRequest: updated };
            } catch (err) {
                setInvoiceRequests(previous);
                const errorMsg = err instanceof ApiError ? err.message : tRef.current("invitationUpdateFailed");
                toastRef.current({ title: tRef.current("error"), description: errorMsg, variant: "destructive" });

                return { ok: false, error: errorMsg };
            } finally {
                setUpdating(null);
            }
        },
        [invoiceRequests],
    );

    return {
        invoiceRequests,
        loading,
        updating,
        filteredAgentId,
        setFilteredAgentId,
        selectedStatus,
        setSelectedStatus,
        selectedPaid,
        setSelectedPaid,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        fetchInvoiceRequests,
        updateInvoiceRequest,
    };
}
