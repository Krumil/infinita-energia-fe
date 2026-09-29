import type { Download, Locator, Page } from "@playwright/test";

import { uniqueToken, type Backend, type InviteDetail, type RuleName, type SettlementRow, type TestAgent } from "./support/backend";
import { agentTotal, amountInputs, confirmButton, expand, includeBox, monthGroup, overallTotal, previewButton } from "./support/calculation";
import { recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { openTab, pickMonth } from "./support/ui";
import { readWorkbookZip, type SheetRow } from "./support/zip";

// Covers docs/frontend-calcolo-refactor/test-guides/06-calculation-exports.md. T-02 stays manual: the backend merges agents that share a name.
const PREVIEW_MONTH = "2031-04";

const SAVED_MONTH = "2031-03";

type TestMonth = typeof PREVIEW_MONTH | typeof SAVED_MONTH;

const COMP_AL = { [PREVIEW_MONTH]: "2031-04-30", [SAVED_MONTH]: "2031-03-31" };

const MONTH_LABEL = { [PREVIEW_MONTH]: "Aprile 2031", [SAVED_MONTH]: "Marzo 2031" };

const TAX_ID = "E2ETST80A01H501A";

const CONFIRM_PATH = "/api/calcolo/conferma";

const SKIPPED_REASON = "invito non più in bozza";

const HEADERS: SheetRow = ["Cliente", "CF/PIVA", "POD/PDR", "Comp. al", "Regola", "Importo Provvigione", "Venditore"];

const PREVIEW_NOTE = "Anteprima non salvata: il file contiene la bozza attuale.";

const SAVED_NOTE = "Il file contiene gli inviti salvati, riletti dal server.";

const SAVED_NONE = "Nessun invito salvato da scaricare.";

const STANDARD: RuleName = "Gettone Residenziale Standard";

const RENEWAL: RuleName = "Rinnovo Residenziale";

const PODS = {
    twin: "IT001E99000021",
    hidden: "IT001E99000022",
    dueA: "IT001E99000023",
    dueB: "IT001E99000024",
    excluded: "IT001E99000025",
    unmatched: "IT001E99000026",
    stored: "IT001E99000027",
};

interface Fixture {
    month: TestMonth;
    uno: TestAgent;
    due: TestAgent;
    escluso: TestAgent;
    twinCustomer: string;
    hiddenCustomer: string;
    dueACustomer: string;
    dueBCustomer: string;
    storedCustomer: string;
}

interface SavedResult {
    agente_id: number;
    invito_id: number;
}

// Expected commissions: Uno 150 + 150 + 20 = 320, Due 40 + 40 = 80, Escluso 7. Overall 407. One row matches no agent.
async function createAndPreview(page: Page, backend: Backend, month: TestMonth, seed?: (fixture: Fixture) => Promise<void>): Promise<Fixture> {
    await backend.claimMonth(month);

    const token = uniqueToken();

    const fixture: Fixture = {
        month,
        uno: await backend.createAgent({ name: `Uno ${token}`, ruleValues: { [STANDARD]: 150, [RENEWAL]: 20 } }),
        due: await backend.createAgent({ name: `Due ${token}`, ruleValues: { [STANDARD]: 40 } }),
        escluso: await backend.createAgent({ name: `Escluso ${token}`, ruleValues: { [STANDARD]: 7 } }),
        twinCustomer: `Cliente Doppio ${token}`,
        hiddenCustomer: `Cliente Nascosto ${token}`,
        dueACustomer: `Cliente Due A ${token}`,
        dueBCustomer: `Cliente Due B ${token}`,
        storedCustomer: `Cliente Salvato ${token}`,
    };

    const twinRow: SettlementRow = { seller: fixture.uno.name, rule: STANDARD, amount: 100, customer: fixture.twinCustomer, orderId: 994_001, pod: PODS.twin };

    await backend.importRows(month, [
        twinRow,
        { ...twinRow },
        { seller: fixture.uno.name, rule: RENEWAL, amount: 40, customer: fixture.hiddenCustomer, orderId: 994_002, pod: PODS.hidden },
        { seller: fixture.due.name, rule: STANDARD, amount: 100, customer: fixture.dueACustomer, orderId: 994_003, pod: PODS.dueA },
        { seller: fixture.due.name, rule: STANDARD, amount: 100, customer: fixture.dueBCustomer, orderId: 994_004, pod: PODS.dueB },
        { seller: fixture.escluso.name, rule: STANDARD, amount: 100, customer: `Cliente Escluso ${token}`, orderId: 994_005, pod: PODS.excluded },
        { seller: `Nessuno ${token}`, rule: STANDARD, amount: 100, customer: `Cliente Orfano ${token}`, orderId: 994_006, pod: PODS.unmatched },
    ]);
    await seed?.(fixture);
    await page.goto("/");
    await openTab(page, "Provvigioni");
    await pickMonth(page, monthGroup(page), month);
    await previewButton(page).click();
    await expect(overallTotal(page)).toHaveText("407,00 €");

    return fixture;
}

function storedRow(fixture: Fixture, agent: TestAgent, importo_provvigione: number): InviteDetail {
    return {
        venditore: agent.name,
        comp_al: COMP_AL[fixture.month],
        regola: STANDARD,
        importo_provvigione,
        pod_pdr: PODS.stored,
        cliente: fixture.storedCustomer,
        cf_piva: TAX_ID,
    };
}

// A spreadsheet row as the workbook holds it, in the column order of HEADERS.
function sheetRow(fixture: Fixture, agent: TestAgent, rule: RuleName, amount: number, customer: string, pod: string): SheetRow {
    return [customer, TAX_ID, pod, COMP_AL[fixture.month], rule, amount, agent.name];
}

function totalRow(agent: TestAgent, total: number): SheetRow {
    return ["TOTALE", "", "", "", "", total, agent.name];
}

// The backend stores agent names as sorted uppercase words, and the file name joins them with underscores.
function member(fixture: Fixture, agent: TestAgent): string {
    return `${fixture.month}/${agent.name.split(" ").join("_")}-${agent.id}.xlsx`;
}

// Data rows follow the server's order, which the tests don't pin down, so both sides sort them between the header and the total.
function expectWorkbook(rows: SheetRow[] | undefined, dataRows: SheetRow[], total: SheetRow): void {
    const sorted = (list: SheetRow[]): SheetRow[] => [...list].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const shown = rows ?? [];

    expect([shown[0], ...sorted(shown.slice(1, -1)), shown.at(-1)]).toEqual([HEADERS, ...sorted(dataRows), total]);
}

async function download(page: Page, button: Locator): Promise<Download> {
    const file = page.waitForEvent("download");

    await button.click();

    return file;
}

function previewZipButton(page: Page): Locator {
    return page.getByRole("button", { name: "Scarica anteprima ZIP" });
}

function outcome(page: Page): Locator {
    return page.getByRole("region", { name: "Esito del salvataggio" });
}

function savedZipButton(page: Page): Locator {
    return outcome(page).getByRole("button", { name: "Scarica inviti salvati ZIP" });
}

function outcomeRow(page: Page, agent: TestAgent): Locator {
    return outcome(page).getByRole("row").filter({ has: page.getByRole("cell", { name: agent.name, exact: true }) });
}

async function confirmDraft(page: Page, fixture: Fixture): Promise<SavedResult[]> {
    const response = page.waitForResponse((candidate) => candidate.url().endsWith(CONFIRM_PATH));

    await confirmButton(page).click();
    await page.getByRole("alertdialog", { name: `Conferma le provvigioni di ${MONTH_LABEL[fixture.month]}` }).getByRole("button", { name: "Salva provvigioni" }).click();

    const { risultati }: { risultati: SavedResult[] } = await (await response).json();

    return risultati;
}

function resultOf(results: SavedResult[], agent: TestAgent): SavedResult {
    const result = results.find((candidate) => candidate.agente_id === agent.id);

    if (!result) throw new Error(`The confirmation returned no result for ${agent.name} (${agent.id}): ${JSON.stringify(results)}`);

    return result;
}

test.describe("calculation exports", () => {
    test("should download one workbook per included agent with the edited rows and totals when the preview ZIP is requested on an edited draft", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend, PREVIEW_MONTH);
        const writes = recordApiWrites(page);

        await expand(page, fixture.due);
        await page.getByRole("button", { name: `Rimuovi la riga di ${fixture.dueBCustomer}` }).click();
        await includeBox(page, fixture.escluso).click();
        await expand(page, fixture.uno);
        await page.getByRole("textbox", { name: "Filtra..." }).fill("Doppio");
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");

        await expect(amountInputs(page, fixture.hiddenCustomer)).toHaveCount(0);
        await expect(overallTotal(page)).toHaveText("385,50 €");
        await expect(previewZipButton(page)).toHaveAccessibleDescription(PREVIEW_NOTE);

        const file = await download(page, previewZipButton(page));

        expect(file.suggestedFilename()).toBe("anteprima-provvigioni-2031-04.zip");

        const workbooks = await readWorkbookZip(file);

        expect([...workbooks.keys()].sort()).toEqual([member(fixture, fixture.uno), member(fixture, fixture.due)].sort());
        expectWorkbook(
            workbooks.get(member(fixture, fixture.uno)),
            [
                sheetRow(fixture, fixture.uno, STANDARD, 175.5, fixture.twinCustomer, PODS.twin),
                sheetRow(fixture, fixture.uno, STANDARD, 150, fixture.twinCustomer, PODS.twin),
                sheetRow(fixture, fixture.uno, RENEWAL, 20, fixture.hiddenCustomer, PODS.hidden),
            ],
            totalRow(fixture.uno, 345.5),
        );
        expectWorkbook(
            workbooks.get(member(fixture, fixture.due)),
            [sheetRow(fixture, fixture.due, STANDARD, 40, fixture.dueACustomer, PODS.dueA)],
            totalRow(fixture.due, 40),
        );
        expect(writes).toEqual([]);
    });

    test("should export zero, negative and decimal amounts as numbers with their exact sum when the preview ZIP is requested", async ({ page, backend }) => {
        const fixture = await createAndPreview(page, backend, PREVIEW_MONTH);

        await includeBox(page, fixture.escluso).click();

        // 0.1 + 0.2 is 0.30000000000000004 in floating point, which the sheet must not show.
        await expand(page, fixture.due);
        await amountInputs(page, fixture.dueACustomer).fill("0,1");
        await amountInputs(page, fixture.dueBCustomer).fill("0,2");

        await expect(agentTotal(page, fixture.due)).toHaveText("0,30 €");

        await expand(page, fixture.uno);

        const twins = amountInputs(page, fixture.twinCustomer);

        await twins.nth(0).fill("0");
        await twins.nth(1).fill("-40,25");
        await amountInputs(page, fixture.hiddenCustomer).fill("12,34");

        await expect(agentTotal(page, fixture.uno)).toHaveText("-27,91 €");

        const workbooks = await readWorkbookZip(await download(page, previewZipButton(page)));

        expect([...workbooks.keys()].sort()).toEqual([member(fixture, fixture.uno), member(fixture, fixture.due)].sort());
        expectWorkbook(
            workbooks.get(member(fixture, fixture.due)),
            [
                sheetRow(fixture, fixture.due, STANDARD, 0.1, fixture.dueACustomer, PODS.dueA),
                sheetRow(fixture, fixture.due, STANDARD, 0.2, fixture.dueBCustomer, PODS.dueB),
            ],
            totalRow(fixture.due, 0.3),
        );
        expectWorkbook(
            workbooks.get(member(fixture, fixture.uno)),
            [
                sheetRow(fixture, fixture.uno, STANDARD, 0, fixture.twinCustomer, PODS.twin),
                sheetRow(fixture, fixture.uno, STANDARD, -40.25, fixture.twinCustomer, PODS.twin),
                sheetRow(fixture, fixture.uno, RENEWAL, 12.34, fixture.hiddenCustomer, PODS.hidden),
            ],
            totalRow(fixture.uno, -27.91),
        );
    });

    test("should disable the preview download when an included amount is invalid or no agent is included, and offer no saved download before a confirmation", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend, PREVIEW_MONTH);

        await expect(previewZipButton(page)).toBeEnabled();
        await expect(page.getByRole("button", { name: "Scarica inviti salvati ZIP" })).toHaveCount(0);

        await expand(page, fixture.due);
        await amountInputs(page, fixture.dueACustomer).fill("abc");

        await expect(previewZipButton(page)).toBeDisabled();

        // The invalid amount belongs to an excluded agent now, so it no longer blocks the export.
        await includeBox(page, fixture.due).click();

        await expect(previewZipButton(page)).toBeEnabled();

        await includeBox(page, fixture.uno).click();
        await includeBox(page, fixture.escluso).click();

        await expect(previewZipButton(page)).toBeDisabled();
        await expect(previewZipButton(page)).toHaveAccessibleDescription(PREVIEW_NOTE);
    });

    test("should download only the saved agent's stored rows and total, then the invite's current version, when one agent was skipped", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend, SAVED_MONTH, async (created) => {
            await backend.seedInvite(SAVED_MONTH, created.due, [storedRow(created, created.due, 11)], "inviato");
        });

        await includeBox(page, fixture.escluso).click();

        const results = await confirmDraft(page, fixture);
        const uno = resultOf(results, fixture.uno);
        const due = resultOf(results, fixture.due);

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio parziale. Agenti salvati: 1. Agenti saltati: 1.");
        await expect(outcomeRow(page, fixture.due).getByRole("cell")).toHaveText([fixture.due.name, "Saltato", `#${due.invito_id}`, "—", SKIPPED_REASON]);
        await expect(savedZipButton(page)).toHaveAccessibleDescription(SAVED_NOTE);

        const first = await download(page, savedZipButton(page));

        expect(first.suggestedFilename()).toBe("inviti-salvati-2031-03.zip");

        let workbooks = await readWorkbookZip(first);

        expect([...workbooks.keys()]).toEqual([member(fixture, fixture.uno)]);
        expectWorkbook(
            workbooks.get(member(fixture, fixture.uno)),
            [
                sheetRow(fixture, fixture.uno, STANDARD, 150, fixture.twinCustomer, PODS.twin),
                sheetRow(fixture, fixture.uno, STANDARD, 150, fixture.twinCustomer, PODS.twin),
                sheetRow(fixture, fixture.uno, RENEWAL, 20, fixture.hiddenCustomer, PODS.hidden),
            ],
            totalRow(fixture.uno, 320),
        );

        // Another save replaces the stored rows of the same draft invite after this confirmation.
        expect(await backend.seedInvite(SAVED_MONTH, fixture.uno, [storedRow(fixture, fixture.uno, 99.99)], "bozza")).toBe(uno.invito_id);

        workbooks = await readWorkbookZip(await download(page, savedZipButton(page)));

        expect([...workbooks.keys()]).toEqual([member(fixture, fixture.uno)]);
        expectWorkbook(
            workbooks.get(member(fixture, fixture.uno)),
            [sheetRow(fixture, fixture.uno, STANDARD, 99.99, fixture.storedCustomer, PODS.stored)],
            totalRow(fixture.uno, 99.99),
        );
        await expect(outcomeRow(page, fixture.uno).getByRole("cell")).toHaveText([fixture.uno.name, "Salvato", `#${uno.invito_id}`, "320,00 €", "—"]);
    });

    test("should download nothing and name the invite and agent when one saved invite's details fail to load, then the full ZIP on retry", async ({
        page,
        backend,
    }) => {
        const fixture = await createAndPreview(page, backend, SAVED_MONTH);

        await includeBox(page, fixture.escluso).click();

        const due = resultOf(await confirmDraft(page, fixture), fixture.due);
        const detailPath = `/api/storico-inviti/${due.invito_id}/dettaglio`;
        const downloads: Download[] = [];

        page.on("download", (file) => downloads.push(file));

        let release: () => void = () => undefined;

        const released = new Promise<void>((resolve) => {
            release = resolve;
        });

        // The backend can't fail a detail read on demand, so this one response is replaced with a server error after the progress check.
        await page.route(`**${detailPath}`, async (route) => {
            await released;
            await route.fulfill({ status: 500, json: { error: "Errore di lettura simulato" } });
        });

        // The click scrolls the button into view, so the idle box is measured from the same scroll position.
        await savedZipButton(page).scrollIntoViewIfNeeded();

        const idleBox = await savedZipButton(page).boundingBox();
        const held = page.waitForRequest((request) => request.url().endsWith(detailPath));

        await savedZipButton(page).click();
        await held;

        await expect(savedZipButton(page)).toBeDisabled();
        await expect(previewZipButton(page)).toBeEnabled();
        expect(await savedZipButton(page).boundingBox()).toEqual(idleBox);

        release();

        await expect(outcome(page).getByRole("alert")).toHaveText(
            `Download non riuscito: non è stato possibile leggere il dettaglio dell'invito #${due.invito_id} di ${fixture.due.name}. Nessun file è stato scaricato. Riprova.`,
        );
        await expect(savedZipButton(page)).toBeEnabled();
        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 2.");
        expect(downloads).toEqual([]);

        await page.unroute(`**${detailPath}`);

        const workbooks = await readWorkbookZip(await download(page, savedZipButton(page)));

        expect([...workbooks.keys()].sort()).toEqual([member(fixture, fixture.uno), member(fixture, fixture.due)].sort());
        expectWorkbook(
            workbooks.get(member(fixture, fixture.due)),
            [
                sheetRow(fixture, fixture.due, STANDARD, 40, fixture.dueACustomer, PODS.dueA),
                sheetRow(fixture, fixture.due, STANDARD, 40, fixture.dueBCustomer, PODS.dueB),
            ],
            totalRow(fixture.due, 80),
        );
        await expect(outcome(page).getByRole("alert")).toHaveCount(0);
    });

    test("should disable the saved download and explain why when every agent was skipped", async ({ page, backend }) => {
        const fixture = await createAndPreview(page, backend, SAVED_MONTH, async (created) => {
            await backend.seedInvite(SAVED_MONTH, created.uno, [storedRow(created, created.uno, 11)], "inviato");
            await backend.seedInvite(SAVED_MONTH, created.due, [storedRow(created, created.due, 12)], "inviato");
        });

        await includeBox(page, fixture.escluso).click();
        await confirmDraft(page, fixture);

        await expect(outcome(page).getByRole("status")).toHaveText("Nessun invito salvato: tutti gli agenti sono stati saltati. Agenti saltati: 2.");
        await expect(savedZipButton(page)).toBeDisabled();
        await expect(savedZipButton(page)).toHaveAccessibleDescription(SAVED_NONE);
    });
});
