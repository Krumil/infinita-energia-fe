import type { InvoiceRequestDetailsResponse, InvoiceRequest, UpdateInvoiceRequestPayload } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

interface GetInvoiceRequestsParams {
    agente_id?: number;
    stato?: string;
    pagato?: boolean;
    data_inizio?: string;
    data_fine?: string;
}

export async function getInvoiceRequests(params?: GetInvoiceRequestsParams): Promise<InvoiceRequest[]> {
    const url = new URL(getApiUrl("/storico-inviti"));

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
