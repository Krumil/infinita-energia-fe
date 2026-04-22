import type { CalcoloInput, CalcoloResult } from "@/types";
import { authFetch, getApiUrl, handleResponseWithSanitization } from "./client";

export async function calcolaProvvigioni(data: CalcoloInput[]): Promise<CalcoloResult> {
    const res = await authFetch(getApiUrl("/calcolo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponseWithSanitization<CalcoloResult>(res);
}
