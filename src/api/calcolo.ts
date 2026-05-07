import type { CalcoloInput, CalcoloResult, CheckAgentiResponse } from "@/types";
import { authFetch, getApiUrl, handleResponse, handleResponseWithSanitization } from "./client";

export async function calcolaProvvigioni(data: CalcoloInput[]): Promise<CalcoloResult> {
    const res = await authFetch(getApiUrl("/calcolo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponseWithSanitization<CalcoloResult>(res);
}

export async function checkAgenti(nomi: string[]): Promise<CheckAgentiResponse> {
    const res = await authFetch(getApiUrl("/check-agenti"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomi }),
    });
    return handleResponse<CheckAgentiResponse>(res);
}
