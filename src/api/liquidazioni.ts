import type { ImportSettlementsResponse, Settlement } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function importSettlements(data: Settlement[]): Promise<ImportSettlementsResponse> {
    const res = await authFetch(getApiUrl("/importa-liquidazioni"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<ImportSettlementsResponse>(res);
}
