import type {
    PreviewRequest,
    PreviewResponse,
    ConfirmationRequest,
    ConfirmationResponse,
    UnpaidCalculationRequest,
    UnpaidCalculationResponse,
} from "@/types";
import { z } from "zod";
import { monthToStartDate } from "@/lib/competenceDates";
import { previewResponseSchema, confirmationRequestSchema, confirmationResponseSchema } from "./calculationSchemas";
import {
    authFetch,
    getApiUrl,
    handleEmptyResponse,
    handleResponseWithSanitization,
} from "./client";

const commissionDataSchema = z.object({
    cf_piva: z.string(),
    cliente: z.string(),
    comp_al: z.string(),
    importo_provvigione: z.number().nullable(),
    pod_pdr: z.string(),
    regola: z.string(),
    venditore: z.string(),
});

const unpaidResponseSchema = z.object({
    totale_provvigione: z.number().nullish(),
    dati_provvigione: z.array(commissionDataSchema).nullish(),
    message: z.string().optional(),
    data: z.object({}).passthrough().optional(),
    error: z.string().optional(),
});

export async function getUnpaidCalculation(
    agentId: number,
    months: string[],
): Promise<UnpaidCalculationResponse> {
    // Older invites carry full dates, so two invites of one month must become a single month start.
    const payload: UnpaidCalculationRequest = { agente_id: agentId, mesi_competenza: [...new Set(months.map(monthToStartDate))] };

    const res = await authFetch(getApiUrl("/non-pagati"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    await handleEmptyResponse(res);

    const body = unpaidResponseSchema.parse(await res.json());
    const emptyData = body.data && Object.keys(body.data).length === 0;

    if (emptyData && body.message) {
        return { kind: "empty", message: body.message };
    }

    return {
        kind: "data",
        totale_provvigione: body.totale_provvigione ?? 0,
        dati_provvigione: body.dati_provvigione ?? [],
    };
}

export async function previewCommissions(month: string): Promise<PreviewResponse> {
    const payload: PreviewRequest = { competenza_liquidazione: monthToStartDate(month) };

    const res = await authFetch(getApiUrl("/calcolo/anteprima"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return handleResponseWithSanitization(res, previewResponseSchema);
}

export async function confirmCommissions(data: ConfirmationRequest): Promise<ConfirmationResponse> {
    const payload = confirmationRequestSchema.parse({
        ...data,
        mese_competenza: monthToStartDate(data.mese_competenza),
    });

    const res = await authFetch(getApiUrl("/calcolo/conferma"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
    });

    return handleResponseWithSanitization(res, confirmationResponseSchema);
}
