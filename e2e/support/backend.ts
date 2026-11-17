import { expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";

import { DATABASE_URL } from "./env";
import { importCompetence } from "./ui";

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
    // Comp. al as dd/mm/yyyy in an uploaded workbook, for a row that settles an earlier month.
    periodEnd?: string;
    // Stores the row with no Comp. al, as the import does for a workbook row whose cell is empty.
    withoutPeriodEnd?: boolean;
}

export interface NewAgent {
    name: string;
    parentName?: string;
    // Percentage of each of this agent's rule values that goes to its parent, set through the prefill endpoint.
    parentShare?: number;
    mail?: string;
    ruleValues: Partial<Record<RuleName, number>>;
}

export interface NewOrder {
    customer: string;
    orderId: number;
    // ISO date.
    signedOn: string;
    // Stored as given, like the import's agent key. Left out, the seller is no agent of ours.
    seller?: string;
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
    non_associati: Array<{ cliente: string | null; comp_al: string | null }>;
}

export function uniqueToken(): string {
    return `E2E${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
}

// The import stores a sale's seller as the backend's name key, uppercase words sorted, so "Uno E2E..." comes back as "E2E... UNO".
export function sellerKey(name: string): string {
    return name.toUpperCase().split(/\s+/).sort().join(" ");
}

// The fixture clock sits in 2031, and no real liquidazioni exist that far ahead.
const SUITE_YEAR = 2031;

export function monthStart(month: string): string {
    return `${month}-01`;
}

function monthEnd(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number);
    const lastDay = new Date(Date.UTC(year, monthNumber, 0)).getUTCDate();

    return `${month}-${String(lastDay).padStart(2, "0")}`;
}

// Cleanup goes straight to the database, so it must be the one the backend writes to. A copy of that database holds the
// same rows, so only an agent written through the API tells them apart. It is deleted through the API alone, never by SQL.
export async function expectBackendDatabase(api: APIRequestContext): Promise<void> {
    const token = uniqueToken();

    const created = await api.post("/api/agenti", {
        data: { nome_cognome: `Controllo ${token}`, agente_padre: null, mail: null, statistiche: false },
    });

    expect(created.status(), `POST /api/agenti for the database check: ${await created.text()}`).toBe(201);

    const { agente_id: id }: CreatedAgentBody = await created.json();

    try {
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            // The backend normalizes names, so the stored one is matched by its token.
            const result = await client.query("SELECT 1 FROM agenti WHERE id = $1 AND nome_cognome LIKE $2", [id, `%${token}%`]);
            const database = new URL(DATABASE_URL).pathname.slice(1);

            expect(
                result.rowCount,
                `The suite's database "${database}" is not the one the backend writes to. Set E2E_DATABASE_URL to the backend's database.`,
            ).toBe(1);
        } finally {
            await client.end();
        }
    } finally {
        const deleted = await api.delete(`/api/agenti/${id}`);

        expect(deleted.ok(), `DELETE /api/agenti/${id} after the database check: ${await deleted.text()}`).toBe(true);
    }
}

// Talks to the real backend through the Vite proxy with the signed-in session, to arrange data and check what was stored.
export class Backend {
    private readonly claimedMonths: string[] = [];
    private agentIds: number[] = [];
    private readonly orderTokens: string[] = [];

    constructor(private readonly api: APIRequestContext) {}

    // Cleanup deletes every claimed month, so a month is claimed only after proving it holds no liquidazioni. From 2031 on
    // the months belong to the suite, so rows an interrupted run left behind are deleted first instead of failing the test.
    async claimMonth(month: string): Promise<void> {
        if (Number(month.slice(0, 4)) >= SUITE_YEAR) await this.deleteMonth(month);

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

    async storedPeriodEnds(month: string): Promise<Array<string | null>> {
        const preview = await this.preview(month);

        return preview.non_associati.map((row) => row.comp_al).sort();
    }

    async createAgent(agent: NewAgent): Promise<TestAgent> {
        const created = await this.api.post("/api/agenti", {
            data: {
                nome_cognome: agent.name,
                agente_padre: agent.parentName ?? null,
                mail: agent.mail ?? null,
                statistiche: false,
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

        if (agent.parentShare !== undefined) {
            const prefilled = await this.api.post(`/api/${id}/configurazione-regole-padre/precompila`, {
                data: { percentuale: agent.parentShare },
            });

            expect(prefilled.ok(), `POST configurazione-regole-padre/precompila for agent ${id}: ${await prefilled.text()}`).toBe(true);
        }

        return { id, name: config.nome_agente };
    }

    // An agent the test creates through the UI, so cleanup deletes it too.
    trackAgent(id: number): void {
        this.agentIds.push(id);
    }

    // An agent the test deleted through the UI, so cleanup doesn't ask the API to delete it again.
    untrackAgent(id: number): void {
        this.agentIds = this.agentIds.filter((tracked) => tracked !== id);
    }

    // No API creates an order, so pending orders are written to the database. Each carries the token in its customer,
    // product, POD and tax code, which is how cleanup finds them again.
    async seedOrders(token: string, orders: NewOrder[]): Promise<void> {
        this.orderTokens.push(token);

        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            await client.query("BEGIN");
            await client.query("INSERT INTO prodotti (prodotto) VALUES ($1)", [`Prodotto ${token}`]);

            for (const [index, order] of orders.entries()) {
                const pod = `${token}P${index}`;
                // A tax code holds 16 characters, which leaves room for one digit after the token.
                const taxCode = `${token}${index}`;

                await client.query("INSERT INTO clienti (cod_fisc, nome, cognome_rag_sociale) VALUES ($1, 'Test', $2)", [taxCode, order.customer]);
                await client.query("INSERT INTO dati_tecnici (pod__pdr) VALUES ($1)", [pod]);
                await client.query(
                    `INSERT INTO ordini (id_riga_ordine, id_ordine, n_riga, data_firma, stato, agente, prodotto, cod_fisc, pod__pdr)
                     VALUES ($1, $2, 1, $3, 'Accettato', $4, $5, $6, $7)`,
                    [`${token}R${index}`, order.orderId, order.signedOn, order.seller ?? `Agente ${token}`, `Prodotto ${token}`, taxCode, pod],
                );
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");

            throw new Error(`Seeding the orders of ${token} failed`, { cause: error });
        } finally {
            await client.end();
        }
    }

    private async deleteOrders(tokens: string[]): Promise<void> {
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            await client.query("BEGIN");

            for (const token of tokens) {
                const like = `${token}%`;

                await client.query("DELETE FROM esclusioni_ordini WHERE id_riga_ordine LIKE $1", [like]);
                await client.query("DELETE FROM ordini WHERE id_riga_ordine LIKE $1", [like]);
                await client.query("DELETE FROM dati_tecnici WHERE pod__pdr LIKE $1", [like]);
                await client.query("DELETE FROM clienti WHERE cod_fisc LIKE $1", [like]);
                await client.query("DELETE FROM prodotti WHERE prodotto = $1", [`Prodotto ${token}`]);
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");

            throw new Error(`Deleting the orders of ${tokens.join(", ")} failed`, { cause: error });
        } finally {
            await client.end();
        }
    }

    // Stands in for another user changing the agent while the page still shows the old parent.
    async removeParent(agent: TestAgent): Promise<void> {
        const response = await this.api.put(`/api/agenti/${agent.id}`, { data: { agente_padre: null } });

        expect(response.ok(), `PUT /api/agenti/${agent.id} without a parent: ${await response.text()}`).toBe(true);
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
            comp_al: row.withoutPeriodEnd ? null : monthEnd(month),
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

    // Uploading goes through the storage bucket, so an uploaded attachment is written to the database with no file behind it.
    // Cleanup deletes it with the invite.
    async seedAttachment(inviteId: number, name: string): Promise<void> {
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            await client.query(
                `INSERT INTO allegati_invito (storico_invito_id, chiave_oggetto, nome_file, content_type, dimensione_bytes, stato, data_creazione, data_caricamento)
                 VALUES ($1, $2, $3, 'application/pdf', 10, 'caricato', now(), now())`,
                [inviteId, `e2e/${inviteId}/${name}`, name],
            );
        } finally {
            await client.end();
        }
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

        if (this.orderTokens.length > 0) await this.deleteOrders(this.orderTokens);

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
