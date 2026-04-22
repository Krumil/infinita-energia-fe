import type { Scaglione, UpdateScaglioneRequest, ImportScaglioniResponse } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function getScaglioni(): Promise<Scaglione[]> {
    const res = await authFetch(getApiUrl("/scaglioni"));
    return handleResponse<Scaglione[]>(res);
}

export async function importScaglioni(): Promise<ImportScaglioniResponse> {
    const res = await authFetch(getApiUrl("/scaglioni"), { method: "POST" });
    return handleResponse<ImportScaglioniResponse>(res);
}

export async function updateScaglione(id: number, data: UpdateScaglioneRequest): Promise<Scaglione> {
    const res = await authFetch(getApiUrl(`/scaglioni/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<Scaglione>(res);
}
