import { expect, type APIRequestContext } from "@playwright/test";
import pg from "pg";

import { uniqueToken } from "./backend";
import { APP_URL, AUTH_FILE, DATABASE_URL } from "./env";
import { test as base } from "./test";

export type PaymentMethod = "SEPA Direct Debit" | "Bonifico";

export interface SeededOrder {
    // Day of the month in `year`; the dashboard counts an order by its signing date.
    date: string;
    // Only these states count as contracts.
    state?: "Accettato" | "Annullato";
    payment?: PaymentMethod;
}

export interface DashboardAgent {
    id: number;
    name: string;
}

interface AgentBody {
    id: number;
    nome_cognome: string;
}

interface CreatedAgentBody {
    agente_id: number;
}

// Arranges orders for the dashboard: a statistics agent nobody else uses, and order rows signed by that agent, so
// every count can be isolated by selecting the agent in the filter.
export class DashboardSeed {
    private readonly agentIds: number[] = [];
    private readonly orderIds: string[] = [];
    private readonly podIds: string[] = [];
    private readonly taxIds: string[] = [];
    private readonly products: string[] = [];

    constructor(private readonly api: APIRequestContext) {}

    async createStatisticsAgent(): Promise<DashboardAgent> {
        const name = `Dash${uniqueToken()}`;

        const created = await this.api.post("/api/agenti", {
            data: { nome_cognome: name, agente_padre: null, mail: null, statistiche: true, percentuale_provvigione_figlio: null },
        });

        expect(created.status(), `POST /api/agenti for ${name}: ${await created.text()}`).toBe(201);

        const { agente_id: id }: CreatedAgentBody = await created.json();

        this.agentIds.push(id);

        // The API stores names upper-cased, and the filter lists and matches orders by that stored name.
        const listed = await this.api.get("/api/agenti");

        expect(listed.ok(), "GET /api/agenti").toBe(true);

        const agents: AgentBody[] = await listed.json();
        const stored = agents.find((agent) => agent.id === id);

        if (!stored) throw new Error(`Agent ${id} is missing from GET /api/agenti`);

        return { id, name: stored.nome_cognome };
    }

    // Each order gets its own POD, because orders join their technical data on it.
    async insertOrders(agent: DashboardAgent, orders: SeededOrder[]): Promise<void> {
        const token = uniqueToken();
        const taxId = token;
        const product = `Prodotto ${token}`;
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            await client.query("BEGIN");
            await client.query("INSERT INTO clienti (cod_fisc, cognome_rag_sociale) VALUES ($1, $2)", [taxId, `Cliente ${token}`]);
            this.taxIds.push(taxId);
            await client.query("INSERT INTO prodotti (prodotto) VALUES ($1)", [product]);
            this.products.push(product);

            for (const [index, order] of orders.entries()) {
                const pod = `${token}P${index}`;
                const rowId = `${token}R${index}`;

                await client.query(
                    "INSERT INTO dati_tecnici (pod__pdr, udm, tipologia_utenza, venditore_precedente) VALUES ($1, 'kWh', 'Domestico', $2)",
                    [pod, `Fornitore ${token}`],
                );
                this.podIds.push(pod);
                await client.query(
                    `INSERT INTO ordini (id_riga_ordine, id_ordine, n_riga, data_firma, stato, agente, prodotto, cod_fisc, pod__pdr, metodo_pagam)
                     VALUES ($1, $2, 1, $3, $4, $5, $6, $7, $8, $9)`,
                    [
                        rowId,
                        1_000_000_000 + Math.floor(Math.random() * 900_000_000),
                        order.date,
                        order.state ?? "Accettato",
                        agent.name,
                        product,
                        taxId,
                        pod,
                        order.payment ?? "Bonifico",
                    ],
                );
                this.orderIds.push(rowId);
            }

            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");

            throw new Error(`Inserting dashboard orders for agent ${agent.name} failed`, { cause: error });
        } finally {
            await client.end();
        }
    }

    async cleanUp(): Promise<void> {
        const client = new pg.Client({ connectionString: DATABASE_URL });

        await client.connect();

        try {
            await client.query("BEGIN");
            await client.query("DELETE FROM ordini WHERE id_riga_ordine = ANY($1::text[])", [this.orderIds]);
            await client.query("DELETE FROM dati_tecnici WHERE pod__pdr = ANY($1::text[])", [this.podIds]);
            await client.query("DELETE FROM clienti WHERE cod_fisc = ANY($1::text[])", [this.taxIds]);
            await client.query("DELETE FROM prodotti WHERE prodotto = ANY($1::text[])", [this.products]);
            await client.query("COMMIT");
        } catch (error) {
            await client.query("ROLLBACK");

            throw new Error("Deleting the dashboard test orders failed", { cause: error });
        } finally {
            await client.end();
        }

        const failures: string[] = [];

        for (const id of this.agentIds) {
            const response = await this.api.delete(`/api/agenti/${id}`);

            if (!response.ok()) failures.push(`DELETE /api/agenti/${id} returned ${response.status()}`);
        }

        if (failures.length > 0) throw new Error(`E2E cleanup left data behind: ${failures.join("; ")}`);
    }
}

interface Fixtures {
    seed: DashboardSeed;
}

export const test = base.extend<Fixtures>({
    seed: async ({ playwright, userAgent }, provide) => {
        const api = await playwright.request.newContext({ baseURL: APP_URL, storageState: AUTH_FILE, userAgent });

        try {
            const seed = new DashboardSeed(api);

            await provide(seed);
            await seed.cleanUp();
        } finally {
            await api.dispose();
        }
    },
});
