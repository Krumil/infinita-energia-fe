import { rowAmount, type CalculationDraft } from "@/lib/calculationDraft";
import type { ConfirmationAgent, ConfirmationRequest } from "@/types";

export interface SnapshotAgent {
    agente_id: number;
    nome_agente: string | null;
    rows: number;
    total: number;
}

// What was sent, kept so the outcome keeps describing the submitted draft after later edits.
export interface ConfirmationSnapshot {
    month: string;
    agents: SnapshotAgent[];
    rows: number;
    total: number;
}

export interface Confirmation {
    request: ConfirmationRequest;
    snapshot: ConfirmationSnapshot;
}

export function buildConfirmation(month: string, draft: CalculationDraft): Confirmation {
    const agenti: ConfirmationAgent[] = [];
    const snapshot: ConfirmationSnapshot = { month, agents: [], rows: 0, total: 0 };

    for (const agent of draft.agents) {
        if (!agent.included) continue;

        let total = 0;

        // Every included row goes out whatever the table filter shows, with only the fields the API accepts.
        const dettaglio = agent.rows.map((row) => {
            const amount = rowAmount(row);

            if (amount === undefined) {
                throw new Error(`Agent ${agent.agente_id} row ${row.id} has an invalid amount: "${row.amountText}"`);
            }

            total += amount;
            const { venditore, comp_al, regola, pod_pdr, cliente, cf_piva } = row.detail;

            return { venditore, comp_al, regola, importo_provvigione: amount, pod_pdr, cliente, cf_piva };
        });

        agenti.push({ agente_id: agent.agente_id, dettaglio });
        snapshot.agents.push({ agente_id: agent.agente_id, nome_agente: agent.nome_agente, rows: dettaglio.length, total });
        snapshot.rows += dettaglio.length;
        snapshot.total += total;
    }

    return { request: { mese_competenza: month, agenti }, snapshot };
}
