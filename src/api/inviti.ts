import type { InvoiceRequestDetailsResponse, InvoiceRequest, UpdateInvoiceRequestPayload } from "@/types";
import { ApiError, authFetch, createApiUrl, getApiUrl, handleResponse } from "./client";

interface GetInvoiceRequestsParams {
    agente_id?: number;
    stato?: string;
    pagato?: boolean;
    data_inizio?: string;
    data_fine?: string;
}

export async function getInvoiceRequests(params?: GetInvoiceRequestsParams): Promise<InvoiceRequest[]> {
    const url = createApiUrl("/storico-inviti");

    if (params?.agente_id) url.searchParams.set("agente_id", String(params.agente_id));

    if (params?.stato) url.searchParams.set("stato", params.stato);

    if (params?.pagato !== undefined) url.searchParams.set("pagato", String(params.pagato));

    if (params?.data_inizio) url.searchParams.set("data_inizio", params.data_inizio);

    if (params?.data_fine) url.searchParams.set("data_fine", params.data_fine);

    const res = await authFetch(url);

    return handleResponse<InvoiceRequest[]>(res);
}

export async function updateInvoiceRequest(id: number, data: UpdateInvoiceRequestPayload): Promise<InvoiceRequest> {
    const res = await authFetch(getApiUrl(`/storico-inviti/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<InvoiceRequest>(res);
}

export async function getInvoiceRequestDetails(id: number, signal?: AbortSignal): Promise<InvoiceRequestDetailsResponse> {
    const res = await authFetch(getApiUrl(`/storico-inviti/${id}/dettaglio`), { signal });

    return handleResponse<InvoiceRequestDetailsResponse>(res);
}

// A 500 can carry raw exception text, and an error without a body message is only a status line; neither means anything to the operator.
export function apiErrorMessage(error: Error, fallback: string, serverError: string): string {
    if (!(error instanceof ApiError)) return fallback;

    if (error.status >= 500) return error.status === 500 || !error.fromBody ? serverError : error.message;

    return error.fromBody ? error.message : fallback;
}
