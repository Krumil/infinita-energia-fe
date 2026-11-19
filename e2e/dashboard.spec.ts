import { readFile } from "node:fs/promises";

import type { Locator, Page } from "@playwright/test";

import { test, type DashboardAgent } from "./support/dashboard";
import { expect } from "./support/test";

// The dashboard rejects future years and the app picks its default months from the clock, so these tests run on the
// real date. The default fixture clock sits in 2031, which would make every year the picker offers a past year.
const PAST_YEAR = 2024;

const REAL_NOW = new Date();

const CURRENT_YEAR = REAL_NOW.getFullYear();

// Same rule as the app: the last month that is completely over, but never before January.
const LAST_COMPLETE_MONTH = Math.max(1, REAL_NOW.getMonth());

function monthName(month: number): string {
    const name = new Intl.DateTimeFormat("it", { month: "long" }).format(new Date(2000, month - 1, 1));

    return name.charAt(0).toUpperCase() + name.slice(1);
}

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

    test("should move the start month back to the last complete month when the user switches to the current year with a late start month", async ({
        page,
        seed,
    }) => {
        const agent = await seed.createStatisticsAgent();

        // The current year only appears in the year picker once an order was signed in it.
        await seed.insertOrders(agent, [{ date: `${PAST_YEAR}-12-05` }, { date: `${CURRENT_YEAR}-01-01` }]);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, PAST_YEAR);
        await pick(page, "Da", "Dicembre");
        await expect(page.getByRole("combobox", { name: "Da", exact: true })).toHaveText("Dicembre");

        await pick(page, "Anno", CURRENT_YEAR);

        await expect(page.getByRole("combobox", { name: "Da", exact: true })).toHaveText(monthName(LAST_COMPLETE_MONTH));
        await expect(page.getByRole("combobox", { name: "A", exact: true })).toHaveText("Ultimo mese completo");
        await expect(tile(page, "Contratti firmati")).toHaveAttribute("aria-busy", "false");
        await expect(tile(page, "Contratti firmati")).toContainText(`${CURRENT_YEAR} vs ${CURRENT_YEAR - 1}`);
        await expect(page.getByRole("alert")).toHaveCount(0);

        // Months after the last complete one aren't offered as a start while the end month is automatic.
        await page.getByRole("combobox", { name: "Da", exact: true }).click();
        await expect(page.getByRole("option", { name: monthName(LAST_COMPLETE_MONTH), exact: true })).toBeEnabled();
        await expect(page.getByRole("option", { name: monthName(LAST_COMPLETE_MONTH + 1), exact: true })).toBeDisabled();
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

    test("should not offer a year after the current one when the orders include one", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${CURRENT_YEAR}-01-15` }, { date: `${CURRENT_YEAR + 1}-01-15` }]);

        await openDashboard(page);
        await page.getByRole("combobox", { name: "Anno", exact: true }).click();

        await expect(page.getByRole("option", { name: String(CURRENT_YEAR), exact: true })).toBeVisible();
        await expect(page.getByRole("option", { name: String(CURRENT_YEAR + 1), exact: true })).toHaveCount(0);
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

    test("should open on the current year when the orders include a year after it", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${CURRENT_YEAR}-01-15` }, { date: `${CURRENT_YEAR + 1}-01-15` }]);

        await openDashboard(page);

        await expect(page.getByRole("combobox", { name: "Anno", exact: true })).toHaveText(String(CURRENT_YEAR));
        await expect(tile(page, "Contratti firmati")).toHaveAttribute("aria-busy", "false");
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("should not offer the current month as the end month when the user picks the current year", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${CURRENT_YEAR}-01-15` }]);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, CURRENT_YEAR);
        await page.getByRole("combobox", { name: "A", exact: true }).click();

        await expect(page.getByRole("option", { name: monthName(LAST_COMPLETE_MONTH), exact: true })).toBeEnabled();
        await expect(page.getByRole("option", { name: monthName(LAST_COMPLETE_MONTH + 1), exact: true })).toBeDisabled();
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

    test("should show the no-contracts message when the agent sold nothing in the picked months", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${PAST_YEAR}-01-15` }]);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, PAST_YEAR);
        await pick(page, "Da", "Marzo");
        await pick(page, "A", "Aprile");

        const contracts = tile(page, "Contratti firmati");

        await expect(contracts).toContainText("Mar–Apr 2024 vs 2023");
        await expect(contracts.getByText("0", { exact: true })).toBeVisible();
        await expect(tile(page, "Pagati con SEPA").getByText("Nessun contratto nel periodo.")).toBeVisible();
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("should push the end month up when the user raises the start month past it", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${PAST_YEAR}-06-15` }]);

        await openDashboard(page);
        await selectAgentAndYear(page, agent, PAST_YEAR);
        await pick(page, "A", "Marzo");
        await pick(page, "Da", "Maggio");

        await expect(page.getByRole("combobox", { name: "Da", exact: true })).toHaveText("Maggio");
        await expect(page.getByRole("combobox", { name: "A", exact: true })).toHaveText("Maggio");
        await expect(tile(page, "Contratti firmati")).toContainText("Mag 2024 vs 2023");
        await expect(page.getByRole("alert")).toHaveCount(0);
    });

    test("should disable the export button until every section has loaded when the user changes a filter", async ({ page, seed }) => {
        const agent = await seed.createStatisticsAgent();

        await seed.insertOrders(agent, [{ date: `${PAST_YEAR}-06-15` }]);

        await openDashboard(page);

        const exportButton = page.getByRole("button", { name: "Esporta HTML" });

        await expect(exportButton).toBeEnabled();

        // Holds one section's request at the browser so the loading state lasts long enough to observe.
        let release: () => void = () => undefined;

        const released = new Promise<void>((resolve) => {
            release = resolve;
        });

        await page.route(/\/api\/dashboard\/vendite\/prodotti-agenti/, async (route) => {
            await released;
            await route.continue();
        });

        await pick(page, "Anno", PAST_YEAR);
        await expect(exportButton).toBeDisabled();

        release();

        await expect(exportButton).toBeEnabled();
    });

    test.describe("in English", () => {
        test.use({ appLanguage: "en" });

        test("should mark the exported page as English when the app language is English", async ({ page, seed }) => {
            const agent = await seed.createStatisticsAgent();

            await seed.insertOrders(agent, [{ date: `${PAST_YEAR}-06-15` }]);
            await page.clock.setFixedTime(REAL_NOW);
            await page.goto("/#dashboard");
            await pick(page, "Agent", agent.name);
            await pick(page, "Year", PAST_YEAR);

            const exportButton = page.getByRole("button", { name: "Export HTML" });

            await expect(exportButton).toBeEnabled();

            const file = page.waitForEvent("download");

            await exportButton.click();

            const html = await readFile(await (await file).path(), "utf8");
            const reader = await page.context().newPage();

            await reader.route("**/*", (route) => (route.request().url().startsWith("file:") ? route.continue() : route.abort()));
            await reader.setContent(html, { waitUntil: "domcontentloaded" });

            await expect(tile(reader, "Signed contracts").getByText("1", { exact: true })).toBeVisible();
            // Screen readers pick their voice from the document language, which has no user-facing locator.
            await expect(reader.locator("html")).toHaveAttribute("lang", "en");

            await reader.close();
        });
    });
});
