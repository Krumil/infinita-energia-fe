import type { OrderExclusion, ImportExcelResponse, ExcludedOrdersResponse, PendingOrdersResponse } from "@/types";
import { authFetch, createApiUrl, getApiUrl, handleEmptyResponse, handleResponse } from "./client";

export async function uploadExcel(file: File): Promise<ImportExcelResponse> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await authFetch(getApiUrl("/upload-excel"), {
        method: "POST",
        body: formData,
    });

    return handleResponse<ImportExcelResponse>(res);
}

export async function getPendingOrders(startDate?: string, endDate?: string): Promise<PendingOrdersResponse> {
    const url = createApiUrl("/ordini-non-evasi");

    if (startDate) url.searchParams.set("start_date", startDate);

    if (endDate) url.searchParams.set("end_date", endDate);

    const res = await authFetch(url);

    return handleResponse<PendingOrdersResponse>(res);
}

export async function excludeOrder(orderLineId: string, reason: string): Promise<OrderExclusion> {
    const res = await authFetch(getApiUrl(`/ordini-non-evasi/${encodeURIComponent(orderLineId)}/escludi`), {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ motivo: reason }),
    });

    return handleResponse<OrderExclusion>(res);
}

export async function restoreOrder(orderLineId: string): Promise<void> {
    const res = await authFetch(getApiUrl(`/ordini-non-evasi/${encodeURIComponent(orderLineId)}/escludi`), {
        method: "DELETE",
    });

    await handleEmptyResponse(res);
}

export async function getExcludedOrders(): Promise<ExcludedOrdersResponse> {
    const res = await authFetch(getApiUrl("/ordini-esclusi"));

    return handleResponse<ExcludedOrdersResponse>(res);
}
