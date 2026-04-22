import type { ImportLiquidazioniResponse, Liquidazione } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function importLiquidazioni(data: Liquidazione[]): Promise<ImportLiquidazioniResponse> {
    const res = await authFetch(getApiUrl("/importa-liquidazioni"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<ImportLiquidazioniResponse>(res);
}
