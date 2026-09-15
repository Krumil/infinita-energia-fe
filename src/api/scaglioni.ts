import type { Tier, UpdateTierRequest, ImportTiersResponse } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function getTiers(): Promise<Tier[]> {
    const res = await authFetch(getApiUrl("/scaglioni"));

    return handleResponse<Tier[]>(res);
}

export async function importTiers(): Promise<ImportTiersResponse> {
    const res = await authFetch(getApiUrl("/scaglioni"), { method: "POST" });

    return handleResponse<ImportTiersResponse>(res);
}

export async function updateTier(id: number, data: UpdateTierRequest): Promise<Tier> {
    const res = await authFetch(getApiUrl(`/scaglioni/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<Tier>(res);
}
