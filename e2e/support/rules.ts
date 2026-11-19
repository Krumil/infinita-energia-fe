import pg from "pg";

import { DATABASE_URL } from "./env";
import { test as base } from "./test";

export interface RuleRow {
    id: number;
    descrizione: string;
    utilizzato: boolean;
    valore_default: number;
    tipo_utenza: string | null;
    tipo_servizio: string | null;
}

export interface TierRow {
    id: number;
    descrizione: string;
    tipo_utenza: string;
    tipo_servizio: string | null;
}

interface ValueRow {
    id: number;
    agente_id: number;
    regola_id: number;
    scaglione_id: number | null;
    valore: number;
    valore_padre: number;
}

// Changing a rule or tier makes the backend realign every agent's values, so the whole configuration is put back afterwards.
export class Catalog {
    constructor(
        readonly rules: RuleRow[],
        readonly tiers: TierRow[],
        private readonly values: ValueRow[],
    ) {}

    rule(description: string): RuleRow {
        const rule = this.rules.find((item) => item.descrizione === description);

        if (!rule) throw new Error(`No rule named "${description}" in the database`);

        return rule;
    }

    tier(description: string): TierRow {
        const tier = this.tiers.find((item) => item.descrizione === description);

        if (!tier) throw new Error(`No tier named "${description}" in the database`);

        return tier;
    }

    async current<T extends "regole" | "scaglioni">(table: T, id: number): Promise<T extends "regole" ? RuleRow : TierRow> {
        return withClient(async (client) => {
            const result = await client.query(`SELECT * FROM ${table} WHERE id = $1`, [id]);

            return result.rows[0];
        });
    }

    async restore(): Promise<void> {
        await withClient(async (client) => {
            await client.query("BEGIN");

            try {
                for (const rule of this.rules) {
                    await client.query(
                        "UPDATE regole SET utilizzato = $2, valore_default = $3, tipo_utenza = $4, tipo_servizio = $5 WHERE id = $1",
                        [rule.id, rule.utilizzato, rule.valore_default, rule.tipo_utenza, rule.tipo_servizio],
                    );
                }

                for (const tier of this.tiers) {
                    await client.query("UPDATE scaglioni SET tipo_utenza = $2, tipo_servizio = $3 WHERE id = $1", [
                        tier.id,
                        tier.tipo_utenza,
                        tier.tipo_servizio,
                    ]);
                }

                const ids = this.values.map((value) => value.id);
                const agentIds = [...new Set(this.values.map((value) => value.agente_id))];

                await client.query("DELETE FROM valori_regole_agente WHERE agente_id = ANY($1::int[]) AND id <> ALL($2::int[])", [agentIds, ids]);

                // Another run on the shared database may have deleted its agents since the snapshot, and their values can't come back.
                const live = await client.query<{ id: number }>("SELECT id FROM agenti WHERE id = ANY($1::int[])", [agentIds]);
                const liveIds = new Set(live.rows.map((row) => row.id));

                for (const value of this.values.filter((item) => liveIds.has(item.agente_id))) {
                    await client.query(
                        `INSERT INTO valori_regole_agente (id, agente_id, regola_id, scaglione_id, valore, valore_padre)
                         VALUES ($1, $2, $3, $4, $5, $6)
                         ON CONFLICT (id) DO UPDATE SET agente_id = $2, regola_id = $3, scaglione_id = $4, valore = $5, valore_padre = $6`,
                        [value.id, value.agente_id, value.regola_id, value.scaglione_id, value.valore, value.valore_padre],
                    );
                }

                await client.query("COMMIT");
            } catch (error) {
                await client.query("ROLLBACK");

                throw new Error("Restoring the rules, tiers and agent values failed", { cause: error });
            }
        });
    }
}

async function withClient<T>(run: (client: pg.Client) => Promise<T>): Promise<T> {
    const client = new pg.Client({ connectionString: DATABASE_URL });

    await client.connect();

    try {
        return await run(client);
    } finally {
        await client.end();
    }
}

async function snapshot(): Promise<Catalog> {
    return withClient(async (client) => {
        const rules = await client.query("SELECT id, descrizione, utilizzato, valore_default, tipo_utenza, tipo_servizio FROM regole ORDER BY id");
        const tiers = await client.query("SELECT id, descrizione, tipo_utenza, tipo_servizio FROM scaglioni ORDER BY id");
        const values = await client.query("SELECT id, agente_id, regola_id, scaglione_id, valore, valore_padre FROM valori_regole_agente");

        return new Catalog(rules.rows, tiers.rows, values.rows);
    });
}

export const test = base.extend<{ catalog: Catalog }>({
    // eslint-disable-next-line no-empty-pattern -- Playwright reads a fixture's dependencies from this destructured argument, so it has to stay.
    catalog: async ({}, provide) => {
        const catalog = await snapshot();

        try {
            await provide(catalog);
        } finally {
            await catalog.restore();
        }
    },
});
