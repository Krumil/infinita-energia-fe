import type { ImportExcelResponse, PendingOrdersResponse } from "@/types";
import { authFetch, createApiUrl, getApiUrl, handleResponse } from "./client";

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
