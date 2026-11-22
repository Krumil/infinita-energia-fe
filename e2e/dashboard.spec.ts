import { readFile } from "node:fs/promises";

import type { Locator, Page } from "@playwright/test";

import { test, type DashboardAgent } from "./support/dashboard";
import { expect } from "./support/test";

// The dashboard rejects future years and the app picks its default months from the clock, so these tests run on the
// real date. The default fixture clock sits in 2031, which would make every year the picker offers a past year.
const PAST_YEAR = 2024;

const REAL_NOW = new Date();

async function openDashboard(page: Page): Promise<void> {
    await page.clock.setFixedTime(REAL_NOW);
    await page.goto("/#dashboard");
    await expect(page.getByRole("combobox", { name: "Anno", exact: true })).toBeVisible();
}

async function pick(page: Page, filter: string, option: string | number): Promise<void> {
    await page.getByRole("combobox", { name: filter, exact: true }).click();
    await page.getByRole("option", { name: String(option), exact: true }).click();
}

function tile(page: Page, title: string): Locator {
    return page.getByRole("region", { name: title, exact: true });
}

async function selectAgentAndYear(page: Page, agent: DashboardAgent, year: number): Promise<void> {
    await pick(page, "Agente", agent.name);
    await pick(page, "Anno", year);
}

test.describe("dashboard", () => {
    test("should show the agent's contract totals and export them with the selected filters when the user picks a month range", async ({
        page,
        seed,
    }) => {
        const agent = await seed.createStatisticsAgent();

        const { previousSeller } = await seed.insertOrders(agent, [
            { date: `${PAST_YEAR}-03-05`, payment: "SEPA Direct Debit" },
            { date: `${PAST_YEAR}-04-10`, payment: "SEPA Direct Debit" },
            { date: `${PAST_YEAR}-04-20` },
            // Outside the picked range, or not a valid contract state, so none of these may be counted.
            { date: `${PAST_YEAR}-02-10` },
            { date: `${PAST_YEAR}-05-03` },
            { date: `${PAST_YEAR}-03-12`, state: "Annullato" },
            { date: `${PAST_YEAR - 1}-03-08` },
        ]);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, PAST_YEAR);
        await pick(page, "Da", "Marzo");
        await pick(page, "A", "Aprile");

        const contracts = tile(page, "Contratti firmati");

        await expect(contracts).toContainText("Mar–Apr 2024 vs 2023");
        await expect(contracts.getByText("3", { exact: true })).toBeVisible();
        await expect(contracts.getByText(`1 nel ${PAST_YEAR - 1}`)).toBeVisible();
        await expect(tile(page, "Pagati con SEPA").getByText("66,7%", { exact: true })).toBeVisible();
        await expect(contracts).toHaveAttribute("aria-busy", "false");
        // The previous-supplier card sits below the fold, and a chart only draws once its card scrolls into view.
        await expect(page.getByText(previousSeller, { exact: true })).toHaveCount(0);

        const exportButton = page.getByRole("button", { name: "Esporta HTML" });

        await expect(exportButton).toBeEnabled();

        const file = page.waitForEvent("download");

        await exportButton.click();

        const exported = await file;

        expect(exported.suggestedFilename()).toBe(`dashboard-vendite-${PAST_YEAR}-${agent.name.toLowerCase()}.html`);

        const html = await readFile(await exported.path(), "utf8");

        // The standalone file is opened on its own page, the way someone who receives it would read it.
        const reader = await page.context().newPage();

        await reader.route("**/*", (route) => (route.request().url().startsWith("file:") ? route.continue() : route.abort()));
        await reader.setContent(html, { waitUntil: "domcontentloaded" });

        await expect(reader.getByRole("heading", { name: "Dashboard", exact: true })).toBeVisible();

        for (const [label, value] of [
            ["Agente", agent.name],
            ["Anno", String(PAST_YEAR)],
            ["Da", "Marzo"],
            ["A", "Aprile"],
            ["Agenti mostrati", "10+ contratti"],
        ]) {
            await expect(reader.getByRole("term").getByText(label, { exact: true }), `export lists ${label}`).toBeVisible();
            await expect(reader.getByRole("definition").getByText(value, { exact: true }), `export lists ${value} for ${label}`).toBeVisible();
        }

        await expect(tile(reader, "Contratti firmati").getByText("3", { exact: true })).toBeVisible();
        await expect(reader.getByText(previousSeller, { exact: true }), "export holds the chart the user never scrolled to").toBeVisible();
        await expect(reader.getByRole("combobox")).toHaveCount(0);
        await expect(reader.getByRole("button")).toHaveCount(0);

        await reader.close();
    });

    test("should say the settlements aren't imported yet when the end month is past the last imported month", async ({ page, seed, backend }) => {
        // A year long before any real settlements, so the test owns every month of it.
        const year = 2001;
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${year}-01-15` }]);
        await backend.claimMonth(`${year}-03`);
        await backend.importRows(`${year}-03`, [
            { seller: agent.name, rule: "Gettone Residenziale Standard", amount: 100, customer: `Cliente ${agent.name}`, orderId: 998_001 },
        ]);
        expect(await seed.lastSettlementMonth(year), `settlements of ${year} should end in March`).toBe(3);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, year);
        await pick(page, "Da", "Marzo");
        await pick(page, "A", "Maggio");

        const revenue = tile(page, "Fatturato");

        await expect(revenue).toHaveAttribute("aria-busy", "false");
        await expect(revenue).toContainText(
            `Le liquidazioni da aprile ${year} non sono ancora state importate. Scegli un mese di fine precedente per vedere il fatturato.`,
        );
        await expect(revenue).not.toContainText("Nessun fatturato liquidato");

        await pick(page, "A", "Marzo");

        await expect(revenue).toContainText("Liquidazioni dal");
        await expect(revenue).not.toContainText("non sono ancora state importate");
    });

    test("should disable the HTML export when a section shows an error", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${PAST_YEAR}-01-15` }]);
        // The year picker no longer offers a year the backend refuses, so no real request fails; the section gets a server error.
        await page.route(/\/api\/dashboard\/vendite\/sintesi/, (route) => route.fulfill({ status: 500, json: { error: "Errore simulato" } }));

        await openDashboard(page);
        await selectAgentAndYear(page, agent, PAST_YEAR);

        await expect(tile(page, "Contratti firmati").getByRole("alert")).toBeVisible();
        await expect(page.getByRole("button", { name: "Esporta HTML" })).toBeDisabled();
    });

    test("should count only contracts with a previous supplier in the shares when some contracts have none", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        const { previousSeller } = await seed.insertOrders(agent, [
            { date: `${PAST_YEAR}-03-05` },
            { date: `${PAST_YEAR}-03-06` },
            { date: `${PAST_YEAR}-03-07` },
            { date: `${PAST_YEAR}-03-08`, withoutPreviousSeller: true },
        ]);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, PAST_YEAR);

        const card = tile(page, "Venditore precedente: contratti acquisiti");

        await expect(card).toContainText("Contratti senza venditore precedente, esclusi: 1 su 4.");

        await card.getByRole("button", { name: "Tabella" }).click();

        await expect(card.getByRole("row", { name: new RegExp(previousSeller) })).toContainText("100%");
    });

});
