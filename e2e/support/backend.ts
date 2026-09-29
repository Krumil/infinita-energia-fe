import { expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";

import { DATABASE_URL } from "./env";

// Rules that already exist with a fixed-value entry, so imports never create new rules or tiers.
export type RuleName = "Gettone Residenziale Standard" | "Gettone SDD Residenziale" | "Rinnovo Residenziale";

export interface SettlementRow {
    seller: string;
    rule: RuleName;
    amount: number;
    customer: string;
    orderId: number | null;
    // Rows get distinct PODs by position unless a test needs two rows with the same one.
    pod?: string;
}

export interface NewAgent {
    name: string;
    parentName?: string;
    childShare?: number;
    ruleValues: Partial<Record<RuleName, number>>;
}

export interface TestAgent {
    id: number;
    name: string;
}

interface CreatedAgentBody {
    agente_id: number;
}

interface RuleConfigEntry {
    regola_id: number;
    regola_nome: string;
    scaglione_id: number | null;
}

interface RuleConfigBody {
    nome_agente: string;
    configurazione: RuleConfigEntry[];
}

// One saved invite row, in the shape the confirmation request sends and the invite detail returns.
export interface InviteDetail {
    venditore: string;
    comp_al: string;
    regola: string;
    importo_provvigione: number;
    pod_pdr: string;
    cliente: string;
    cf_piva: string;
}

export interface StoredInvite {
    id: number;
    agente_id: number;
    mese_competenza: string;
    totale_invito: number;
    stato: string;
}

interface ConfirmationBody {
    risultati: Array<{ agente_id: number; invito_id: number; salvato: boolean }>;
}

interface PreviewBody {
    agenti: Array<{ agente_id: number }>;
    non_associati: Array<{ cliente: string | null }>;
}

export function uniqueToken(): string {
    return `E2E${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

export function monthStart(month: string): string {
    return `${month}-01`;
}

function monthEnd(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

    return `${month}-${String(lastDay).padStart(2, "0")}`;
}

function importCompetence(month: string): string {
    const [year, monthNumber] = month.split("-");

    return `${monthNumber}/${year}`;
}

// Talks to the real backend through the Vite proxy with the signed-in session, to arrange data and check what was stored.
export class Backend {
    private readonly claimedMonths: string[] = [];
    private readonly agentIds: number[] = [];

    constructor(private readonly api: APIRequestContext) {}

    // Cleanup deletes every claimed month, so a month is claimed only after proving it holds no liquidazioni.
    async claimMonth(month: string): Promise<void> {
        const preview = await this.preview(month);

        expect(
            preview.agenti.length + preview.non_associati.length,
            `${month} already has liquidazioni, so the suite refuses to use it`,
        ).toBe(0);

        this.claimedMonths.push(month);
    }

    async preview(month: string): Promise<PreviewBody> {
        const response = await this.api.post("/api/calcolo/anteprima", { data: { competenza_liquidazione: monthStart(month) } });

        expect(response.status(), `POST /api/calcolo/anteprima for ${month}: ${await response.text()}`).toBe(200);

        return response.json();
    }

    // Settlement tests use sellers that match no agent, so every stored row comes back as unmatched.
    async storedUnmatchedRows(month: string): Promise<number> {
        const preview = await this.preview(month);

        expect(preview.agenti, `${month} should have no matched rows in settlement tests`).toEqual([]);

        return preview.non_associati.length;
    }

    async createAgent(agent: NewAgent): Promise<TestAgent> {
        const created = await this.api.post("/api/agenti", {
            data: {
                nome_cognome: agent.name,
                agente_padre: agent.parentName ?? null,
                mail: null,
                statistiche: false,
                percentuale_provvigione_figlio: agent.childShare ?? null,
            },
        });

        expect(created.status(), `POST /api/agenti for ${agent.name}: ${await created.text()}`).toBe(201);

        const { agente_id: id }: CreatedAgentBody = await created.json();

        this.agentIds.push(id);

        const configResponse = await this.api.get(`/api/${id}/configurazione-regole`);

        expect(configResponse.ok(), `GET configurazione-regole for agent ${id}`).toBe(true);

        const config: RuleConfigBody = await configResponse.json();

        const valori = Object.entries(agent.ruleValues).map(([rule, valore]) => {
            const entry = config.configurazione.find((item) => item.regola_nome === rule && item.scaglione_id === null);

            if (!entry) throw new Error(`Rule "${rule}" has no fixed-value entry for agent ${id}`);

            return { regola_id: entry.regola_id, scaglione_id: null, valore };
        });

        const saved = await this.api.post(`/api/${id}/configurazione-regole`, { data: { valori } });

        expect(saved.ok(), `POST configurazione-regole for agent ${id}: ${await saved.text()}`).toBe(true);

        return { id, name: config.nome_agente };
    }

    async importRows(month: string, rows: SettlementRow[]): Promise<void> {
        const data = rows.map((row, index) => ({
            piano_provvigionale: "E2E Piano",
            prezzo: 1,
            venditore: row.seller,
            regola: row.rule,
            importo_euro: row.amount,
            pod_pdr: row.pod ?? `IT001E${String(index).padStart(8, "0")}`,
            cliente: row.customer,
            cf_piva: "E2ETST80A01H501A",
            comp_dal: monthStart(month),
            comp_al: monthEnd(month),
            competenza_liquidazione: importCompetence(month),
            id_ordine: row.orderId,
        }));

        const response = await this.api.post("/api/importa-liquidazioni", { data });

        expect(response.status(), `POST /api/importa-liquidazioni for ${month}: ${await response.text()}`).toBe(201);
    }

    async deleteMonth(month: string): Promise<void> {
        const response = await this.api.delete(`/api/liquidazioni/${monthStart(month)}`);

        expect(response.ok(), `DELETE /api/liquidazioni for ${month}: ${await response.text()}`).toBe(true);
    }

    async invitesSnapshot(): Promise<string> {
        const response = await this.api.get("/api/storico-inviti");

        expect(response.ok(), "GET /api/storico-inviti").toBe(true);

        return response.text();
    }

    // Saves an invite through the confirmation API, then moves it on when the test needs one that is no longer a draft.
    async seedInvite(month: string, agent: TestAgent, dettaglio: InviteDetail[], stato: "bozza" | "inviato"): Promise<number> {
        const response = await this.api.post("/api/calcolo/conferma", {
            data: { mese_competenza: monthStart(month), agenti: [{ agente_id: agent.id, dettaglio }] },
        });

        expect(response.status(), `POST /api/calcolo/conferma for agent ${agent.id}: ${await response.text()}`).toBe(200);

        const body: ConfirmationBody = await response.json();

        expect(body.risultati[0], `saved invite for agent ${agent.id}`).toMatchObject({ agente_id: agent.id, salvato: true });

        const inviteId = body.risultati[0].invito_id;

        if (stato !== "bozza") {
            const updated = await this.api.put(`/api/storico-inviti/${inviteId}`, { data: { stato } });

            expect(updated.ok(), `PUT /api/storico-inviti/${inviteId} to ${stato}: ${await updated.text()}`).toBe(true);
        }

        return inviteId;
    }

    async invites(agent: TestAgent): Promise<StoredInvite[]> {
        const response = await this.api.get(`/api/storico-inviti?agente_id=${agent.id}`);

        expect(response.ok(), `GET /api/storico-inviti for agent ${agent.id}`).toBe(true);

        const invites: StoredInvite[] = await response.json();

        return invites.map(({ id, agente_id, mese_competenza, totale_invito, stato }) => ({ id, agente_id, mese_competenza, totale_invito, stato }));
    }

    // The API normalizes names on every write, so a name saved before normalization existed can only be set in the database.
    async renameAgentInDatabase(agent: TestAgent, name: string): Promise<void> {
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            const result = await client.query("UPDATE agenti SET nome_cognome = $1 WHERE id = $2", [name, agent.id]);

            expect(result.rowCount, `renaming agent ${agent.id} to "${name}"`).toBe(1);
        } finally {
            await client.end();
        }
    }

    private async deleteInvites(agentIds: number[]): Promise<void> {
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            await client.query("BEGIN");

            const ownInvites = "SELECT id FROM storico_inviti WHERE agente_id = ANY($1::int[])";

            await client.query(`DELETE FROM dettagli_invito WHERE storico_invito_id IN (${ownInvites})`, [agentIds]);
            await client.query(`DELETE FROM allegati_invito WHERE storico_invito_id IN (${ownInvites})`, [agentIds]);
            await client.query("DELETE FROM storico_inviti WHERE agente_id = ANY($1::int[])", [agentIds]);
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");

            throw new Error(`Deleting the invites of agents ${agentIds.join(", ")} failed`, { cause: error });
        } finally {
            await client.end();
        }
    }

    async cleanUp(): Promise<void> {
        const failures: string[] = [];

        for (const month of this.claimedMonths) {
            const response = await this.api.delete(`/api/liquidazioni/${monthStart(month)}`);

            if (!response.ok()) failures.push(`DELETE /api/liquidazioni/${monthStart(month)} returned ${response.status()}`);
        }

        // An agent with invites can't be deleted, so its invites go first.
        if (this.agentIds.length > 0) await this.deleteInvites(this.agentIds);

        // Children go first so no agent is removed while another still names it as parent.
        for (const id of [...this.agentIds].reverse()) {
            const response = await this.api.delete(`/api/agenti/${id}`);

            if (!response.ok()) failures.push(`DELETE /api/agenti/${id} returned ${response.status()}`);
        }

        if (failures.length > 0) throw new Error(`E2E cleanup left data behind: ${failures.join("; ")}`);
    }
}
