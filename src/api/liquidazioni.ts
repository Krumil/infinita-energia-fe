import { z } from "zod";
import { monthToStartDate } from "@/lib/competenceDates";
import { monthStartSchema } from "./calculationSchemas";
import type { DeleteSettlementsResponse, ImportSettlementsResponse, Settlement } from "@/types";
import { authFetch, getApiUrl, handleResponse, handleResponseWithSanitization } from "./client";

export async function importSettlements(data: Settlement[]): Promise<ImportSettlementsResponse> {
    const res = await authFetch(getApiUrl("/importa-liquidazioni"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<ImportSettlementsResponse>(res);
}

const deleteSettlementsResponseSchema = z.object({
    success: z.boolean(),
    competenza_liquidazione: monthStartSchema,
    righe_eliminate: z.number().int().nonnegative(),
}) satisfies z.ZodType<DeleteSettlementsResponse>;

export async function deleteSettlements(month: string): Promise<DeleteSettlementsResponse> {
    const res = await authFetch(getApiUrl(`/liquidazioni/${monthToStartDate(month)}`), {
        method: "DELETE",
    });

    return handleResponseWithSanitization(res, deleteSettlementsResponseSchema);
}
