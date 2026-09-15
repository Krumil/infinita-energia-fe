import type {
    CalculationInput,
    UnpaidCalculationResponse,
    CalculationResult,
    CheckAgentsResponse,
} from "@/types";
import { z } from "zod";
import {
    authFetch,
    getApiUrl,
    handleResponse,
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

const calculationResultSchema = z.record(z.object({
    totale_provvigione: z.number(),
    dati_provvigione: z.array(commissionDataSchema),
}));

const unpaidResponseSchema = z.object({
    totale_provvigione: z.number().nullish(),
    dati_provvigione: z.array(commissionDataSchema).nullish(),
    message: z.string().optional(),
    data: z.object({}).passthrough().optional(),
    error: z.string().optional(),
});

export async function calculateCommissions(data: CalculationInput[]): Promise<CalculationResult> {
    const res = await authFetch(getApiUrl("/calcolo"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponseWithSanitization(res, calculationResultSchema);
}

export async function checkAgents(names: string[]): Promise<CheckAgentsResponse> {
    const res = await authFetch(getApiUrl("/check-agenti"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nomi: names }),
    });

    return handleResponse<CheckAgentsResponse>(res);
}

export async function getUnpaidCalculation(
    agentId: number,
    months: string[],
): Promise<UnpaidCalculationResponse> {
    const res = await authFetch(getApiUrl("/non-pagati"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ agente_id: agentId, mesi_competenza: months }),
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
