import { parseEuroNumber } from "@/lib/numbers";
import type { CalculationDetail, PreviewResponse } from "@/types";

export interface DraftRow {
    id: string;
    detail: CalculationDetail;
    amountText: string;
}

export interface DraftAgent {
    agente_id: number;
    nome_agente: string | null;
    included: boolean;
    rows: DraftRow[];
}

export interface CalculationDraft {
    agents: DraftAgent[];
    dirty: boolean;
}

export interface DraftActions {
    setRowAmount: (agentId: number, rowId: string, amountText: string) => void;
    removeRow: (agentId: number, rowId: string) => void;
    setAgentIncluded: (agentId: number, included: boolean) => void;
}

export interface AgentTotals {
    total: number;
    invalidRows: number;
}

export interface DraftSummary {
    agentTotals: Map<number, AgentTotals>;
    includedAgents: number;
    excludedAgents: number;
    includedRows: number;
    invalidIncludedRows: number;
    total: number;
}

// The shortest text that parses back to the returned amount, so an untouched row keeps exactly what the server computed.
function amountToText(amount: number): string {
    const [whole, fraction = ""] = String(amount).split(".");

    return `${whole},${fraction.padEnd(2, "0")}`;
}

export function createDraft(preview: PreviewResponse): CalculationDraft {
    const agents = [...preview.agenti]
        // Ordered once by the server total, so agents don't move around while their amounts are edited.
        .sort((a, b) => b.totale_provvigione - a.totale_provvigione)
        .map((agent) => ({
            agente_id: agent.agente_id,
            nome_agente: agent.nome_agente,
            included: agent.dettaglio.length > 0,
            // Identical detail rows are legitimate, so a row's identity is its position in the server response.
            rows: agent.dettaglio.map((detail, index) => ({
                id: `${agent.agente_id}:${index}`,
                detail,
                amountText: amountToText(detail.importo_provvigione),
            })),
        }));

    return { agents, dirty: false };
}

// The backend rounds each row to cents before summing, so finer amounts would make the reviewed total differ from the saved one.
export function rowAmount(row: DraftRow): number | undefined {
    const amount = parseEuroNumber(row.amountText);

    return amount !== undefined && Number(amount.toFixed(2)) === amount ? amount : undefined;
}

export function summarizeDraft(draft: CalculationDraft): DraftSummary {
    const summary: DraftSummary = {
        agentTotals: new Map(),
        includedAgents: 0,
        excludedAgents: 0,
        includedRows: 0,
        invalidIncludedRows: 0,
        total: 0,
    };

    for (const agent of draft.agents) {
        const totals: AgentTotals = { total: 0, invalidRows: 0 };

        for (const row of agent.rows) {
            const amount = rowAmount(row);

            if (amount === undefined) totals.invalidRows += 1;
            else totals.total += amount;
        }

        summary.agentTotals.set(agent.agente_id, totals);

        if (!agent.included) {
            summary.excludedAgents += 1;
            continue;
        }

        summary.includedAgents += 1;
        summary.includedRows += agent.rows.length;
        summary.invalidIncludedRows += totals.invalidRows;
        summary.total += totals.total;
    }

    return summary;
}

function editAgent(draft: CalculationDraft, agentId: number, edit: (agent: DraftAgent) => DraftAgent): CalculationDraft {
    return { agents: draft.agents.map((agent) => (agent.agente_id === agentId ? edit(agent) : agent)), dirty: true };
}

export function setDraftRowAmount(draft: CalculationDraft, agentId: number, rowId: string, amountText: string): CalculationDraft {
    return editAgent(draft, agentId, (agent) => ({
        ...agent,
        rows: agent.rows.map((row) => (row.id === rowId ? { ...row, amountText } : row)),
    }));
}

export function removeDraftRow(draft: CalculationDraft, agentId: number, rowId: string): CalculationDraft {
    return editAgent(draft, agentId, (agent) => {
        const rows = agent.rows.filter((row) => row.id !== rowId);

        // An agent without rows has nothing to save, so it leaves the confirmation for good.
        return { ...agent, rows, included: agent.included && rows.length > 0 };
    });
}

export function setDraftAgentIncluded(draft: CalculationDraft, agentId: number, included: boolean): CalculationDraft {
    const agent = draft.agents.find((item) => item.agente_id === agentId);

    if (!agent || agent.included === included || (included && agent.rows.length === 0)) return draft;

    return editAgent(draft, agentId, (current) => ({ ...current, included }));
}
