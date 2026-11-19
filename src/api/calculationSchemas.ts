import { z } from "zod";
import type { ConfirmationRequest, ConfirmationResponse, PreviewResponse } from "@/types";

export const monthStartSchema = z.string().regex(/^(?!0000)\d{4}-(0[1-9]|1[0-2])-01$/);

const detailMetadata = {
    venditore: z.string().nullable(),
    comp_al: z.string().nullable(),
    regola: z.string().nullable(),
    pod_pdr: z.string().nullable(),
    cliente: z.string().nullable(),
    cf_piva: z.string().nullable(),
};

const detailSchema = z.object({
    ...detailMetadata,
    importo_provvigione: z.number().finite(),
});

export const previewResponseSchema = z.object({
    competenza_liquidazione: monthStartSchema,
    agenti: z.array(z.object({
        agente_id: z.number().int(),
        nome_agente: z.string().nullable(),
        totale_provvigione: z.number().finite(),
        dettaglio: z.array(detailSchema),
    })),
    non_associati: z.array(z.object({
        ...detailMetadata,
        scaglione_consumo: z.string().nullable(),
        importo_euro: z.number().finite().nullable(),
    })),
}) satisfies z.ZodType<PreviewResponse>;

export const confirmationRequestSchema = z.object({
    mese_competenza: monthStartSchema,
    agenti: z.array(z.object({
        agente_id: z.number().int(),
        dettaglio: z.array(z.object(detailMetadata).partial().extend({
            importo_provvigione: z.number().finite(),
        })),
    })).min(1),
}) satisfies z.ZodType<ConfirmationRequest>;

export const confirmationResponseSchema = z.object({
    mese_competenza: monthStartSchema,
    risultati: z.array(z.discriminatedUnion("salvato", [
        z.object({
            salvato: z.literal(true),
            agente_id: z.number().int(),
            invito_id: z.number().int(),
            totale_invito: z.number().finite(),
        }),
        z.object({
            salvato: z.literal(false),
            agente_id: z.number().int(),
            invito_id: z.number().int(),
            motivo: z.string(),
        }),
    ])),
}) satisfies z.ZodType<ConfirmationResponse>;
