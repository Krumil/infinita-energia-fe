import { readFile } from "node:fs/promises";

import type { Download, Locator, Page } from "@playwright/test";

import { uniqueToken, type Backend, type RuleName, type TestAgent } from "./support/backend";
import { expect, test } from "./support/test";
import { openTab } from "./support/ui";

// Covers docs/frontend-calcolo-refactor/test-guides/07-unpaid-reports.md. T-08 is covered by the 06 export spec, which still checks the shared workbook columns.
const FEBRUARY = "2031-02";

const JANUARY = "2031-01";

type TestMonth = typeof FEBRUARY | typeof JANUARY;

const COMP_AL = { [FEBRUARY]: "2031-02-28", [JANUARY]: "2031-01-31" };

const FEBRUARY_LABEL = "Febbraio 2031";

const JANUARY_LABEL = "Gennaio 2031";

const TAX_ID = "E2ETST80A01H501A";

const UNPAID_PATH = "/api/non-pagati";

// The page clock is fixed on this day, and the file name carries it.
const TODAY = "2031-06-15";

const HEADER = "Cliente;CF/PIVA;POD/PDR;Comp. al;Regola;Importo Provvigione;Venditore;Origine";

const DIRECT = "Vendita diretta";

const OVERRIDE = "Provvigione figlio";

const EMPTY_TITLE = "Nessun CSV scaricato";

const EMPTY_MESSAGE = "Nessuna liquidazione trovata per i mesi specificati.";

const STANDARD: RuleName = "Gettone Residenziale Standard";

const RENEWAL: RuleName = "Rinnovo Residenziale";

const SDD: RuleName = "Gettone SDD Residenziale";

interface Sale {
    month: TestMonth;
    seller: TestAgent;
    rule: RuleName;
    customer: string;
    pod: string;
}

interface Hierarchy {
    padre: TestAgent;
    figlio: TestAgent;
    solo: TestAgent;
    padreFebruary: Sale;
    padreJanuary: Sale;
    figlioA: Sale;
    figlioB: Sale;
    figlioRenewalFebruary: Sale;
    figlioRenewalJanuary: Sale;
    soloStandard: Sale;
    soloSdd: Sale;
}

interface UnpaidRequestBody {
    agente_id: number;
    mesi_competenza: string[];
}

interface ListedInvite {
    id: number;
    mese_competenza: string;
}

// The import drops rows without an order ID. Every sale in this spec has its own POD, so the POD's last digits give each one its own ID.
async function importSales(backend: Backend, month: TestMonth, sales: Sale[]): Promise<void> {
    await backend.importRows(
        month,
        sales.map((sale) => ({
            seller: sale.seller.name,
            rule: sale.rule,
            amount: 100,
            customer: sale.customer,
            orderId: 996_000 + Number(sale.pod.slice(-2)),
            pod: sale.pod,
        })),
    );
}

// One draft invite per agent and month puts the agent in the unpaid selection. Its rows don't matter, since the report recalculates from liquidazioni.
async function seedDraft(backend: Backend, month: TestMonth, agent: TestAgent): Promise<number> {
    return backend.seedInvite(
        month,
        agent,
        [{ venditore: agent.name, comp_al: COMP_AL[month], regola: STANDARD, importo_provvigione: 1, pod_pdr: "IT001E07000099", cliente: "Invito", cf_piva: TAX_ID }],
        "bozza",
    );
}

// Padre keeps a quarter of Figlio's commissions. Expected: Padre 100 + 20 direct plus 12,5 + 12,5 + 2,5 + 2,5 of override,
// Figlio 50 + 50 + 10 + 10, Solo 70 + 12,5.
async function createHierarchy(backend: Backend): Promise<Hierarchy> {
    await backend.claimMonth(FEBRUARY);
    await backend.claimMonth(JANUARY);

    const token = uniqueToken();
    const padre = await backend.createAgent({ name: `Padre ${token}`, childShare: 25, ruleValues: { [STANDARD]: 100, [RENEWAL]: 20 } });
    const figlio = await backend.createAgent({ name: `Figlio ${token}`, parentName: padre.name, ruleValues: { [STANDARD]: 50, [RENEWAL]: 10 } });
    const solo = await backend.createAgent({ name: `Solo ${token}`, ruleValues: { [STANDARD]: 70, [SDD]: 12.5 } });

    const sale = (month: TestMonth, seller: TestAgent, rule: RuleName, customer: string, pod: string): Sale => ({
        month,
        seller,
        rule,
        customer: `${customer} ${token}`,
        pod,
    });

    const hierarchy: Hierarchy = {
        padre,
        figlio,
        solo,
        padreFebruary: sale(FEBRUARY, padre, STANDARD, "Cliente Padre Febbraio", "IT001E07000001"),
        padreJanuary: sale(JANUARY, padre, RENEWAL, "Cliente Padre Gennaio", "IT001E07000002"),
        figlioA: sale(FEBRUARY, figlio, STANDARD, "Cliente Figlio A", "IT001E07000003"),
        figlioB: sale(FEBRUARY, figlio, STANDARD, "Cliente Figlio B", "IT001E07000004"),
        figlioRenewalFebruary: sale(FEBRUARY, figlio, RENEWAL, "Cliente Figlio Rinnovo Febbraio", "IT001E07000005"),
        figlioRenewalJanuary: sale(JANUARY, figlio, RENEWAL, "Cliente Figlio Rinnovo Gennaio", "IT001E07000006"),
        soloStandard: sale(FEBRUARY, solo, STANDARD, "Cliente Solo", "IT001E07000007"),
        soloSdd: sale(FEBRUARY, solo, SDD, "Cliente Solo SDD", "IT001E07000008"),
    };

    await importSales(backend, FEBRUARY, [
        hierarchy.padreFebruary,
        hierarchy.figlioA,
        hierarchy.figlioB,
        hierarchy.figlioRenewalFebruary,
        hierarchy.soloStandard,
        hierarchy.soloSdd,
    ]);
    await importSales(backend, JANUARY, [hierarchy.padreJanuary, hierarchy.figlioRenewalJanuary]);

    for (const agent of [padre, figlio]) {
        await seedDraft(backend, FEBRUARY, agent);
        await seedDraft(backend, JANUARY, agent);
    }

    await seedDraft(backend, FEBRUARY, solo);

    return hierarchy;
}

// A CSV line as the report writes it, with the amount as the file shows it.
function csvLine(sale: Sale, amount: string, origin: string): string {
    return [sale.customer, TAX_ID, sale.pod, COMP_AL[sale.month], sale.rule, amount, sale.seller.name, origin].join(";");
}

function reportName(agentName: string): string {
    return `non-liquidati_${agentName.trim().split(/\s+/).join("_")}_${TODAY}.csv`;
}

function unpaidButton(page: Page): Locator {
    return page.getByRole("button", { name: "Calcolo non liquidati", exact: true });
}

function runButton(page: Page): Locator {
    return page.getByRole("button", { name: /^Calcola e scarica CSV/ });
}

function toast(page: Page): Locator {
    return page.getByRole("region", { name: "Notifications (F8)" }).getByRole("listitem");
}

function monthBoxes(page: Page, label: string): Locator {
    return page.getByRole("checkbox", { name: label, exact: true });
}

async function openUnpaidSelection(page: Page): Promise<void> {
    await page.goto("/");
    await openTab(page, "Inviti");
    await unpaidButton(page).click();
    await expect(runButton(page)).toBeDisabled();
}

// Choosing an agent selects every eligible invite of that agent.
async function selectAgent(page: Page, agentName: string, monthLabels: string[]): Promise<void> {
    const radio = page.getByRole("radio", { name: agentName, exact: true });

    await radio.click();
    await expect(radio).toBeChecked();

    for (const label of monthLabels) await expect(monthBoxes(page, label)).toBeChecked();

    await expect(runButton(page)).toHaveText(`Calcola e scarica CSV (${monthLabels.length})`);
}

// Data rows follow the server's order, which the tests don't pin down, so both sides are sorted below the header.
async function expectReport(download: Download, agentName: string, lines: string[]): Promise<void> {
    expect(download.suggestedFilename()).toBe(reportName(agentName));

    const [header, ...rows] = (await readFile(await download.path(), "utf8")).replace(/^\uFEFF/, "").split("\r\n");

    expect([header, ...rows.sort()]).toEqual([HEADER, ...[...lines].sort()]);
}

async function runAndDownload(page: Page): Promise<{ download: Download; body: UnpaidRequestBody }> {
    const file = page.waitForEvent("download");
    const request = page.waitForRequest((sent) => new URL(sent.url()).pathname === UNPAID_PATH);

    await runButton(page).click();

    return { download: await file, body: (await request).postDataJSON() };
}

async function expectSelectionClosed(page: Page, rows: number, agentName: string): Promise<void> {
    await expect(toast(page).getByText(`Scaricate ${rows} righe per ${agentName}.`)).toBeVisible();
    await expect(runButton(page)).toBeHidden();
    await expect(unpaidButton(page)).toBeEnabled();
}

test.describe("Unpaid report", () => {
    test("should send each selected month once, as its first day, when two selected invites fall in the same month", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Mese ${uniqueToken()}`, ruleValues: { [STANDARD]: 30 } });
        const februaryInvite = await seedDraft(backend, FEBRUARY, agent);
        const januaryInvite = await seedDraft(backend, JANUARY, agent);

        const legacyDates = new Map([
            [februaryInvite, "2031-02-15"],
            [januaryInvite, "2031-02-28"],
        ]);

        // The database holds only first-of-month invites, one per agent and month, so the full dates older invites carry are patched into the list the browser receives.
        await page.route(
            (url) => url.pathname === "/api/storico-inviti" && url.searchParams.get("pagato") === "false",
            async (route) => {
                const response = await route.fetch();
                const invites: ListedInvite[] = await response.json();

                await route.fulfill({
                    response,
                    json: invites.map((invite) => ({ ...invite, mese_competenza: legacyDates.get(invite.id) ?? invite.mese_competenza })),
                });
            },
        );

        await openUnpaidSelection(page);
        await page.getByRole("radio", { name: agent.name, exact: true }).click();
        await expect(monthBoxes(page, FEBRUARY_LABEL)).toHaveCount(2);

        for (const box of await monthBoxes(page, FEBRUARY_LABEL).all()) await expect(box).toBeChecked();

        await expect(runButton(page)).toHaveText("Calcola e scarica CSV (2)");

        const request = page.waitForRequest((sent) => new URL(sent.url()).pathname === UNPAID_PATH);

        await runButton(page).click();

        expect((await request).postDataJSON()).toEqual({ agente_id: agent.id, mesi_competenza: ["2031-02-01"] });
        await expect(toast(page).getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
    });

    test("should mark direct sales and child overrides and include only the parent's share when the parent is exported", async ({ page, backend }) => {
        const hierarchy = await createHierarchy(backend);

        await openUnpaidSelection(page);
        await selectAgent(page, hierarchy.padre.name, [FEBRUARY_LABEL, JANUARY_LABEL]);

        const { download, body } = await runAndDownload(page);

        expect(body.agente_id).toBe(hierarchy.padre.id);
        expect([...body.mesi_competenza].sort()).toEqual(["2031-01-01", "2031-02-01"]);
        await expectReport(download, hierarchy.padre.name, [
            csvLine(hierarchy.padreFebruary, "100", DIRECT),
            csvLine(hierarchy.padreJanuary, "20", DIRECT),
            csvLine(hierarchy.figlioA, "12,5", OVERRIDE),
            csvLine(hierarchy.figlioB, "12,5", OVERRIDE),
            csvLine(hierarchy.figlioRenewalFebruary, "2,5", OVERRIDE),
            csvLine(hierarchy.figlioRenewalJanuary, "2,5", OVERRIDE),
        ]);
        await expectSelectionClosed(page, 6, hierarchy.padre.name);
    });

    test("should export the child's full commission as direct sales when the child is exported for the same months", async ({ page, backend }) => {
        const hierarchy = await createHierarchy(backend);

        await openUnpaidSelection(page);
        await selectAgent(page, hierarchy.figlio.name, [FEBRUARY_LABEL, JANUARY_LABEL]);

        const { download } = await runAndDownload(page);

        await expectReport(download, hierarchy.figlio.name, [
            csvLine(hierarchy.figlioA, "50", DIRECT),
            csvLine(hierarchy.figlioB, "50", DIRECT),
            csvLine(hierarchy.figlioRenewalFebruary, "10", DIRECT),
            csvLine(hierarchy.figlioRenewalJanuary, "10", DIRECT),
        ]);
        await expectSelectionClosed(page, 4, hierarchy.figlio.name);
    });

    test("should export every row as a direct sale with its configured value when an agent without children is exported", async ({ page, backend }) => {
        const hierarchy = await createHierarchy(backend);

        await openUnpaidSelection(page);
        await selectAgent(page, hierarchy.solo.name, [FEBRUARY_LABEL]);

        const { download } = await runAndDownload(page);

        await expectReport(download, hierarchy.solo.name, [csvLine(hierarchy.soloStandard, "70", DIRECT), csvLine(hierarchy.soloSdd, "12,5", DIRECT)]);
        await expectSelectionClosed(page, 2, hierarchy.solo.name);
    });

    test("should mark rows as direct sales when the agent's stored name differs from the seller only in case, spacing and word order", async ({ page, backend }) => {
        await backend.claimMonth(FEBRUARY);

        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Rossi ${token}`, ruleValues: { [STANDARD]: 30 } });
        const legacyName = `rossi  ${token.toLowerCase()}`;
        const sale: Sale = { month: FEBRUARY, seller: agent, rule: STANDARD, customer: `Cliente Rossi ${token}`, pod: "IT001E07000009" };

        await importSales(backend, FEBRUARY, [sale]);
        await seedDraft(backend, FEBRUARY, agent);
        await backend.renameAgentInDatabase(agent, legacyName);

        await openUnpaidSelection(page);
        await selectAgent(page, legacyName, [FEBRUARY_LABEL]);

        const { download } = await runAndDownload(page);

        await expectReport(download, legacyName, [csvLine(sale, "30", DIRECT)]);
    });

    test("should show the backend message, download nothing and keep the selection when no liquidazioni match the selected months", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Vuoto ${uniqueToken()}`, ruleValues: { [STANDARD]: 30 } });
        const downloads: Download[] = [];

        await seedDraft(backend, FEBRUARY, agent);
        page.on("download", (download) => downloads.push(download));

        await openUnpaidSelection(page);
        await selectAgent(page, agent.name, [FEBRUARY_LABEL]);

        const response = page.waitForResponse((received) => new URL(received.url()).pathname === UNPAID_PATH);

        await runButton(page).click();
        expect((await response).status()).toBe(200);

        await expect(toast(page).getByText(EMPTY_TITLE, { exact: true })).toBeVisible();
        await expect(toast(page).getByText(EMPTY_MESSAGE, { exact: true })).toBeVisible();
        expect(downloads).toEqual([]);
        await expect(page.getByRole("radio", { name: agent.name, exact: true })).toBeChecked();
        await expect(monthBoxes(page, FEBRUARY_LABEL)).toBeChecked();
        await expect(runButton(page)).toBeEnabled();

        // The operator can adjust the selection without leaving the mode.
        await monthBoxes(page, FEBRUARY_LABEL).click();
        await expect(runButton(page)).toHaveText("Calcola e scarica CSV");
        await expect(runButton(page)).toBeDisabled();
        await monthBoxes(page, FEBRUARY_LABEL).click();
        await expect(runButton(page)).toHaveText("Calcola e scarica CSV (1)");
        await expect(runButton(page)).toBeEnabled();
    });

    test("should show the error, keep the selection and download nothing when the unpaid calculation fails, then download the CSV on retry", async ({ page, backend }) => {
        await backend.claimMonth(FEBRUARY);

        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Riprova ${token}`, ruleValues: { [STANDARD]: 30 } });
        const sale: Sale = { month: FEBRUARY, seller: agent, rule: STANDARD, customer: `Cliente Riprova ${token}`, pod: "IT001E07000010" };
        const failure = "Errore durante l'elaborazione: connessione al database persa";
        const downloads: Download[] = [];

        await importSales(backend, FEBRUARY, [sale]);
        await seedDraft(backend, FEBRUARY, agent);
        page.on("download", (download) => downloads.push(download));

        // The real backend can't fail on demand, so only the first request is answered with the error it returns for unexpected failures.
        await page.route(`**${UNPAID_PATH}`, (route) => route.fulfill({ status: 500, json: { error: failure } }), { times: 1 });

        await openUnpaidSelection(page);
        await selectAgent(page, agent.name, [FEBRUARY_LABEL]);
        await runButton(page).click();

        await expect(toast(page).getByText("Errore", { exact: true })).toBeVisible();
        await expect(toast(page).getByText(failure, { exact: true })).toBeVisible();
        expect(downloads).toEqual([]);
        await expect(page.getByRole("radio", { name: agent.name, exact: true })).toBeChecked();
        await expect(monthBoxes(page, FEBRUARY_LABEL)).toBeChecked();
        await expect(runButton(page)).toHaveText("Calcola e scarica CSV (1)");

        const { download } = await runAndDownload(page);

        await expectReport(download, agent.name, [csvLine(sale, "30", DIRECT)]);
        await expectSelectionClosed(page, 1, agent.name);
    });
});
