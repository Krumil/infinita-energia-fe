import { getInvoiceRequestDetails } from "@/api/inviti";
import type { ConfirmationSnapshot } from "@/lib/calculationConfirmation";
import { rowAmount, type CalculationDraft } from "@/lib/calculationDraft";
import { zipAgentWorkbooks, type AgentWorkbook } from "@/lib/exportUtils";
import type { ConfirmationResult, SavedConfirmationResult } from "@/types";

export interface ZipDownload {
    blob: Blob;
    filename: string;
}

// Carries the invite and agent, so the operator knows which one to check before retrying.
export class SavedInviteDetailError extends Error {
    constructor(
        readonly inviteId: number,
        readonly agentId: number,
        readonly cause: unknown,
    ) {
        super(`Loading the details of invite ${inviteId} for agent ${agentId} failed`);
        this.name = "SavedInviteDetailError";
    }
}

// Summing decimal amounts leaves float noise, which a spreadsheet would show.
function roundCents(value: number): number {
    return Math.round(value * 100) / 100;
}

export async function buildPreviewZip(month: string, draft: CalculationDraft): Promise<ZipDownload> {
    const workbooks: AgentWorkbook[] = draft.agents
        .filter((agent) => agent.included)
        .map((agent) => {
            const rows = agent.rows.map((row) => {
                const amount = rowAmount(row);

                if (amount === undefined) {
                    throw new Error(`Agent ${agent.agente_id} row ${row.id} has an invalid amount: "${row.amountText}"`);
                }

                return { ...row.detail, importo_provvigione: amount };
            });

            const total = roundCents(rows.reduce((sum, row) => sum + row.importo_provvigione, 0));

            return { agentId: agent.agente_id, agentName: agent.nome_agente, rows, total };
        });

    return { blob: await zipAgentWorkbooks(month, workbooks), filename: `anteprima-provvigioni-${month}.zip` };
}

export async function buildSavedZip(snapshot: ConfirmationSnapshot, results: ConfirmationResult[]): Promise<ZipDownload> {
    const saved = results.filter((result): result is SavedConfirmationResult => result.salvato);

    const workbooks = await Promise.all(
        saved.map(async (result): Promise<AgentWorkbook> => {
            const agentName = snapshot.agents.find((agent) => agent.agente_id === result.agente_id)?.nome_agente ?? null;

            try {
                const details = await getInvoiceRequestDetails(result.invito_id);

                // Rows and total come from the same response, so an invite changed since the save never mixes new rows with an old total.
                return { agentId: result.agente_id, agentName, rows: details.dati, total: details.totale_invito };
            } catch (error) {
                throw new SavedInviteDetailError(result.invito_id, result.agente_id, error);
            }
        }),
    );

    return { blob: await zipAgentWorkbooks(snapshot.month, workbooks), filename: `inviti-salvati-${snapshot.month}.zip` };
}
