import type {
    CalcoloInput,
    CalcoloNonPagatiResponse,
    CalcoloResult,
    CheckAgentiResponse,
    ProvvigioneData,
} from "@/types";
import {
    ApiError,
    authFetch,
    getApiUrl,
    handleResponse,
    handleResponseWithSanitization,
} from "./client";

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

interface NonPagatiBody {
    totale_provvigione?: number;
    dati_provvigione?: ProvvigioneData[];
    message?: string;
    data?: Record<string, unknown>;
    error?: string;
}

export async function getCalcoloNonPagati(
    agenteId: number,
    mesi: string[],
): Promise<CalcoloNonPagatiResponse> {
    const res = await authFetch(getApiUrl("/non-pagati"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agente_id: agenteId, mesi_competenza: mesi }),
    });

    if (!res.ok) {
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
            const errorData = (await res.json()) as NonPagatiBody;
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // Ignore JSON parsing errors
        }
        throw new ApiError(res.status, errorMessage);
    }

    const body = (await res.json()) as NonPagatiBody;
    const emptyData = body.data && typeof body.data === "object" && Object.keys(body.data).length === 0;
    if (emptyData && body.message) {
        return { kind: "empty", message: body.message };
    }

    return {
        kind: "data",
        totale_provvigione: body.totale_provvigione ?? 0,
        dati_provvigione: body.dati_provvigione ?? [],
    };
}
