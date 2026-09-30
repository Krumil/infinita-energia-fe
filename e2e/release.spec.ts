import { readFile } from "node:fs/promises";

import type { Locator, Page, Request } from "@playwright/test";

import { uniqueToken, type Backend, type RuleName, type SettlementRow, type TestAgent } from "./support/backend";
import {
    agentRow,
    agentTotal,
    amountInputs,
    confirmButton,
    expand,
    includeBox,
    monthGroup,
    outcome,
    overallTotal,
    previewButton,
} from "./support/calculation";
import { holdRequests, recordApiRequests, recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { attachWorkbook, download, openSettlements, openTab, pickMonth } from "./support/ui";
import { expectWorkbook, readWorkbookZip } from "./support/zip";

// Covers docs/frontend-calcolo-refactor/test-guides/08-legacy-removal-and-release.md. T-02 is covered by the confirmation spec.
const MONTH = "2031-05";

// The Liquidazioni dialog and the Provvigioni tab open on the current month, which the fixed clock puts in June 2031.
const CURRENT_MONTH = "2031-06";

// The import replaces each row's Comp. al with the last day of the competence month, as it did before this rework.
const COMP_AL = "2031-05-31";

const TAX_ID = "E2ETST80A01H501A";

// The page clock is fixed on this day, and the unpaid report's file name carries it.
const TODAY = "2031-06-15";

const PREVIEW_PATH = "/api/calcolo/anteprima";

const CONFIRM_PATH = "/api/calcolo/conferma";

const IMPORT_PATH = "/api/importa-liquidazioni";

const UNPAID_PATH = "/api/non-pagati";

const PREVIEW_FAILURE = "Anteprima non disponibile in questo momento";

const UNPAID_HEADER = "Cliente;CF/PIVA;POD/PDR;Comp. al;Regola;Importo Provvigione;Venditore;Origine";

const STANDARD: RuleName = "Gettone Residenziale Standard";

const RENEWAL: RuleName = "Rinnovo Residenziale";

interface Release {
    uno: TestAgent;
    due: TestAgent;
    escluso: TestAgent;
    unoStandard: string;
    unoRenewal: string;
    dueCustomer: string;
    rows: SettlementRow[];
}

interface SavedResult {
    agente_id: number;
    invito_id: number;
    totale_invito: number;
}

// Expected commissions: Uno 150 + 20 = 170, Due 40, Escluso 7. Overall 217.
async function createRelease(backend: Backend, month: string): Promise<Release> {
    await backend.claimMonth(month);

    const token = uniqueToken();
    const uno = await backend.createAgent({ name: `Uno ${token}`, ruleValues: { [STANDARD]: 150, [RENEWAL]: 20 } });
    const due = await backend.createAgent({ name: `Due ${token}`, ruleValues: { [STANDARD]: 40 } });
    const escluso = await backend.createAgent({ name: `Escluso ${token}`, ruleValues: { [STANDARD]: 7 } });
    const unoStandard = `Cliente Uno Standard ${token}`;
    const unoRenewal = `Cliente Uno Rinnovo ${token}`;
    const dueCustomer = `Cliente Due ${token}`;

    return {
        uno,
        due,
        escluso,
        unoStandard,
        unoRenewal,
        dueCustomer,
        rows: [
            { seller: uno.name, rule: STANDARD, amount: 100, customer: unoStandard, orderId: 995_001 },
            { seller: uno.name, rule: RENEWAL, amount: 40, customer: unoRenewal, orderId: 995_002 },
            { seller: due.name, rule: STANDARD, amount: 100, customer: dueCustomer, orderId: 995_003 },
            { seller: escluso.name, rule: STANDARD, amount: 100, customer: `Cliente Escluso ${token}`, orderId: 995_004 },
        ],
    };
}

// The workbook helper gives each row a POD from its position in the file.
function pod(index: number): string {
    return `IT001E${String(index).padStart(8, "0")}`;
}

function sentTo(page: Page, method: string, path: string): Promise<Request> {
    return page.waitForRequest((request) => request.method() === method && new URL(request.url()).pathname === path);
}

function reviewDialog(page: Page, monthLabel: string): Locator {
    return page.getByRole("alertdialog", { name: `Conferma le provvigioni di ${monthLabel}` });
}

// A dialog has to sit inside the viewport at any width. The page behind it isn't checked: the header navigation is wider than a phone screen.
async function expectInsideViewport(page: Page, dialog: Locator): Promise<void> {
    const width = page.viewportSize()?.width ?? 0;
    const box = await dialog.boundingBox();

    if (!box) throw new Error(`The dialog has no layout box at ${width}px`);

    expect(box.x).toBeGreaterThanOrEqual(0);
    expect(box.x + box.width).toBeLessThanOrEqual(width);
}

async function expectNamedButtons(dialog: Locator): Promise<void> {
    for (const button of await dialog.getByRole("button").all()) await expect(button).toHaveAccessibleName(/\S/);
}

// The backend stores agent names as sorted uppercase words, and file names join them with underscores.
function fileName(agent: TestAgent): string {
    return agent.name.split(" ").join("_");
}

// Imports through Ordini over an earlier import, previews after a month change and a failed attempt, edits, confirms,
// downloads the saved invites, opens them in Inviti and runs the unpaid report, checking the endpoint and month format of each step.
async function runRelease(page: Page, backend: Backend): Promise<void> {
    const release = await createRelease(backend, MONTH);
    const token = uniqueToken();

    await backend.importRows(MONTH, [
        { seller: `Venditore Precedente ${token}`, rule: STANDARD, amount: 100, customer: `Cliente Precedente ${token}`, orderId: 995_000 },
    ]);

    const calls = recordApiRequests(page);

    await page.goto("/");

    const dialog = await openSettlements(page, MONTH);

    await expectInsideViewport(page, dialog);
    await attachWorkbook(dialog, MONTH, `rilascio-${token}.xlsx`, release.rows);
    await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();
    await dialog.getByRole("alert").getByRole("button", { name: "Elimina competenza e reimporta" }).click();

    await expect(dialog.getByRole("heading", { name: "Eliminare le liquidazioni di maggio 2031?" })).toBeVisible();
    await expectInsideViewport(page, dialog);

    const imported = sentTo(page, "POST", IMPORT_PATH);

    await dialog.getByRole("button", { name: "Elimina competenza e reimporta" }).click();

    await expect(dialog.getByRole("status")).toContainText("Liquidazioni eliminate: 1.");
    await expect(dialog.getByRole("status")).toContainText("4 record elaborati · Importazione completata. Inserite 4 righe.");

    const importedRows: Array<{ competenza_liquidazione: string; comp_al: string }> = (await imported).postDataJSON();

    expect(importedRows.map((row) => [row.competenza_liquidazione, row.comp_al])).toEqual(release.rows.map(() => ["05/2031", COMP_AL]));

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();

    await openTab(page, "Provvigioni");
    await pickMonth(page, monthGroup(page), MONTH);
    await page.route(`**${PREVIEW_PATH}`, (route) => route.fulfill({ status: 500, json: { error: PREVIEW_FAILURE } }), { times: 1 });
    await previewButton(page).click();

    const failure = page.getByRole("alert").filter({ hasText: "Anteprima non riuscita" });

    await expect(failure).toContainText(PREVIEW_FAILURE);

    const previewed = sentTo(page, "POST", PREVIEW_PATH);

    await failure.getByRole("button", { name: "Riprova" }).click();

    await expect(overallTotal(page)).toHaveText("217,00 €");
    expect((await previewed).postDataJSON()).toEqual({ competenza_liquidazione: "2031-05-01" });

    await expand(page, release.uno);
    await amountInputs(page, release.unoStandard).fill("175,50");
    await includeBox(page, release.escluso).click();

    await expect(overallTotal(page)).toHaveText("235,50 €");

    await confirmButton(page).click();

    const review = reviewDialog(page, "Maggio 2031");

    await expect(review.getByRole("definition")).toHaveText(["2", "3", "235,50 €", "1", "0"]);
    await expectInsideViewport(page, review);

    const confirmed = sentTo(page, "POST", CONFIRM_PATH);
    const answered = page.waitForResponse((response) => new URL(response.url()).pathname === CONFIRM_PATH);

    await review.getByRole("button", { name: "Salva provvigioni" }).click();

    await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 2.");
    expect((await confirmed).postDataJSON()).toMatchObject({ mese_competenza: "2031-05-01" });

    const { risultati }: { risultati: SavedResult[] } = await (await answered).json();
    const unoSaved = risultati.find((result) => result.agente_id === release.uno.id);
    const dueSaved = risultati.find((result) => result.agente_id === release.due.id);

    expect([unoSaved?.totale_invito, dueSaved?.totale_invito]).toEqual([195.5, 40]);

    const zip = await download(page, outcome(page).getByRole("button", { name: "Scarica inviti salvati ZIP" }));

    expect(zip.suggestedFilename()).toBe("inviti-salvati-2031-05.zip");

    const workbooks = await readWorkbookZip(zip);
    const unoMember = `${MONTH}/${fileName(release.uno)}-${release.uno.id}.xlsx`;
    const dueMember = `${MONTH}/${fileName(release.due)}-${release.due.id}.xlsx`;

    expect([...workbooks.keys()].sort()).toEqual([unoMember, dueMember].sort());
    expectWorkbook(
        workbooks.get(unoMember),
        [
            [release.unoStandard, TAX_ID, pod(0), COMP_AL, STANDARD, 175.5, release.uno.name],
            [release.unoRenewal, TAX_ID, pod(1), COMP_AL, RENEWAL, 20, release.uno.name],
        ],
        ["TOTALE", "", "", "", "", 195.5, release.uno.name],
    );
    expectWorkbook(
        workbooks.get(dueMember),
        [[release.dueCustomer, TAX_ID, pod(2), COMP_AL, STANDARD, 40, release.due.name]],
        ["TOTALE", "", "", "", "", 40, release.due.name],
    );

    await outcome(page).getByRole("button", { name: "Apri Inviti" }).click();

    await expect(agentRow(page, release.uno).getByRole("cell").nth(1)).toHaveText("Maggio 2031");
    await expect(agentRow(page, release.uno).getByRole("cell").nth(2)).toHaveText("195,50 €");
    await expect(agentRow(page, release.uno).getByRole("cell").nth(3)).toHaveText("Bozza");
    await expect(agentRow(page, release.escluso)).toHaveCount(0);

    await page.getByRole("button", { name: "Calcolo non liquidati", exact: true }).click();
    await page.getByRole("radio", { name: release.uno.name, exact: true }).click();

    await expect(page.getByRole("checkbox", { name: "Maggio 2031", exact: true })).toBeChecked();

    const unpaidSent = sentTo(page, "POST", UNPAID_PATH);
    const report = await download(page, page.getByRole("button", { name: "Calcola e scarica CSV (1)" }));

    expect((await unpaidSent).postDataJSON()).toEqual({ agente_id: release.uno.id, mesi_competenza: ["2031-05-01"] });
    expect(report.suggestedFilename()).toBe(`non-liquidati_${fileName(release.uno)}_${TODAY}.csv`);

    // The report recalculates from the liquidazioni, so it shows the configured 150 rather than the confirmed 175,50.
    const [header, ...lines] = (await readFile(await report.path(), "utf8")).replace(/^\uFEFF/, "").split("\r\n");

    expect([header, ...lines.sort()]).toEqual([
        UNPAID_HEADER,
        ...[
            [release.unoStandard, TAX_ID, pod(0), COMP_AL, STANDARD, "150", release.uno.name, "Vendita diretta"].join(";"),
            [release.unoRenewal, TAX_ID, pod(1), COMP_AL, RENEWAL, "20", release.uno.name, "Vendita diretta"].join(";"),
        ].sort(),
    ]);

    expect(calls).not.toContain("POST /api/calcolo");
    expect(calls.filter((call) => !call.startsWith("GET "))).toEqual([
        `POST ${IMPORT_PATH}`,
        "DELETE /api/liquidazioni/2031-05-01",
        `POST ${IMPORT_PATH}`,
        `POST ${PREVIEW_PATH}`,
        `POST ${PREVIEW_PATH}`,
        `POST ${CONFIRM_PATH}`,
        `POST ${UNPAID_PATH}`,
    ]);
    expect(calls).toEqual(
        expect.arrayContaining([`GET /api/storico-inviti/${unoSaved?.invito_id}/dettaglio`, `GET /api/storico-inviti/${dueSaved?.invito_id}/dettaglio`]),
    );
}

test.describe("release", () => {
    test("should reach each step through its new endpoint with month-start dates when a month is imported, previewed, edited, confirmed, exported and reported", async ({
        page,
        backend,
    }) => {
        await runRelease(page, backend);
    });

    test.describe("on a narrow phone", () => {
        test.use({ viewport: { width: 390, height: 844 } });

        test("should keep every dialog inside the screen and finish the release flow when the viewport is 390 pixels wide", async ({ page, backend }) => {
            await runRelease(page, backend);
        });
    });

    test("should keep focus inside each dialog, send no deletion on cancel and return focus to the opener when the dialogs are used from the keyboard", async ({
        page,
        backend,
    }) => {
        const release = await createRelease(backend, CURRENT_MONTH);

        await backend.importRows(CURRENT_MONTH, release.rows);

        const writes = recordApiWrites(page);

        await page.goto("/");
        await openTab(page, "Ordini");

        const opener = page.getByRole("button", { name: "Liquidazioni", exact: true });

        await opener.focus();
        await page.keyboard.press("Enter");

        const dialog = page.getByRole("dialog");
        const monthTrigger = dialog.getByRole("button", { name: "giugno 2031", exact: true });
        const deleteButton = dialog.getByRole("button", { name: "Elimina liquidazioni di giugno 2031" });

        await expect(dialog.getByRole("heading", { name: "Gestisci liquidazioni" })).toBeVisible();
        await expect(monthTrigger).toBeFocused();
        await expectNamedButtons(dialog);

        await page.keyboard.press("Tab");
        await expect(deleteButton).toBeFocused();
        await page.keyboard.press("Enter");

        const cancel = dialog.getByRole("button", { name: "Annulla" });

        await expect(dialog.getByRole("heading", { name: "Eliminare le liquidazioni di giugno 2031?" })).toBeVisible();
        await expect(cancel).toBeFocused();
        await expectNamedButtons(dialog);

        await page.keyboard.press("Tab");
        await expect(dialog.getByRole("button", { name: "Elimina 06/2031" })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(dialog.getByRole("button", { name: "Chiudi" })).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(cancel).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(dialog.getByRole("button", { name: "Chiudi" })).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await page.keyboard.press("Shift+Tab");
        await expect(cancel).toBeFocused();
        await page.keyboard.press("Enter");

        await expect(dialog.getByRole("heading", { name: "Gestisci liquidazioni" })).toBeVisible();

        // The cancel button is gone, so the dialog holds focus itself and the next Tab lands on its first control.
        await page.keyboard.press("Tab");
        await expect(monthTrigger).toBeFocused();

        await page.keyboard.press("Escape");

        await expect(dialog).toBeHidden();
        await expect(opener).toBeFocused();
        expect(writes).toEqual([]);

        const settingsButton = page.getByRole("button", { name: "Impostazioni", exact: true });
        const settings = page.getByRole("dialog", { name: "Impostazioni" });

        await settingsButton.focus();
        await page.keyboard.press("Enter");

        await expect(settings).toBeVisible();
        await expectNamedButtons(settings);

        await page.keyboard.press("Escape");

        await expect(settings).toBeHidden();
        await expect(settingsButton).toBeFocused();

        await openTab(page, "Provvigioni");
        await previewButton(page).focus();
        await page.keyboard.press("Enter");

        await expect(agentTotal(page, release.uno)).toHaveText("170,00 €");
        await expect(overallTotal(page)).toHaveText("217,00 €");

        await confirmButton(page).focus();
        await page.keyboard.press("Enter");

        const review = reviewDialog(page, "Giugno 2031");
        const reviewCancel = review.getByRole("button", { name: "Annulla" });
        const save = review.getByRole("button", { name: "Salva provvigioni" });

        await expect(reviewCancel).toBeFocused();
        await expectNamedButtons(review);
        await page.keyboard.press("Tab");
        await expect(save).toBeFocused();
        await page.keyboard.press("Tab");
        await expect(reviewCancel).toBeFocused();
        await page.keyboard.press("Shift+Tab");
        await expect(save).toBeFocused();
        await page.keyboard.press("Escape");

        await expect(review).toBeHidden();
        await expect(confirmButton(page)).toBeFocused();
        // The preview is a POST too, but it saves nothing. Escape must not add a confirmation after it.
        expect(writes).toEqual([`start POST ${PREVIEW_PATH}`, `end POST ${PREVIEW_PATH}`]);

        await page.keyboard.press("Enter");
        await expect(reviewCancel).toBeFocused();
        await page.keyboard.press("Tab");
        await page.keyboard.press("Enter");

        await expect(outcome(page).getByRole("status")).toHaveText("Salvataggio completato. Agenti salvati: 3.");
        expect(writes.filter((write) => write.startsWith("start "))).toEqual([`start POST ${PREVIEW_PATH}`, `start POST ${CONFIRM_PATH}`]);
    });

    test("should keep the controls and the previous results in place while the preview loads", async ({ page, backend }) => {
        const release = await createRelease(backend, MONTH);

        await backend.importRows(MONTH, release.rows);
        await page.goto("/");
        await openTab(page, "Provvigioni");
        await pickMonth(page, monthGroup(page), MONTH);

        const monthTrigger = monthGroup(page).getByRole("button", { name: "maggio 2031" });
        const controls = async (): Promise<unknown[]> => [await previewButton(page).boundingBox(), await monthTrigger.boundingBox()];
        const idle = await controls();

        let releasePreview = await holdRequests(page, PREVIEW_PATH);

        await previewButton(page).click();

        // The placeholder shows the message, and a screen-reader-only live region announces the same text.
        await expect(page.getByText("Calcolo dell'anteprima...")).toHaveCount(2);
        await expect(previewButton(page)).toBeDisabled();
        expect(await controls()).toEqual(idle);

        releasePreview();

        await expect(overallTotal(page)).toHaveText("217,00 €");
        expect(await controls()).toEqual(idle);

        const row = agentRow(page, release.uno);
        const shown = await row.boundingBox();

        await page.unroute(`**${PREVIEW_PATH}`);
        releasePreview = await holdRequests(page, PREVIEW_PATH);
        await previewButton(page).click();

        await expect(previewButton(page)).toBeDisabled();
        await expect(agentTotal(page, release.uno)).toHaveText("170,00 €");
        expect(await row.boundingBox()).toEqual(shown);
        expect(await controls()).toEqual(idle);

        releasePreview();

        await expect(previewButton(page)).toBeEnabled();
        expect(await row.boundingBox()).toEqual(shown);
        expect(await controls()).toEqual(idle);
    });

    test.describe("in English", () => {
        test.use({ appLanguage: "en" });

        test("should describe preview, review, confirmation, deletion and both exports in English when the app language is English", async ({
            page,
            backend,
        }) => {
            const release = await createRelease(backend, MONTH);

            await backend.importRows(MONTH, release.rows);
            await page.goto("/");
            await openTab(page, "Ordini");
            await page.getByRole("button", { name: "Liquidations", exact: true }).click();

            const dialog = page.getByRole("dialog");

            await expect(dialog.getByRole("heading", { name: "Manage liquidations" })).toBeVisible();
            await pickMonth(page, dialog.getByRole("group", { name: "Competence month" }), MONTH);
            await dialog.getByRole("button", { name: "Delete liquidations for May 2031" }).click();

            await expect(dialog.getByRole("heading", { name: "Delete the liquidations for May 2031?" })).toBeVisible();
            await expect(dialog.getByRole("button", { name: "Delete 05/2031" })).toBeVisible();

            await dialog.getByRole("button", { name: "Cancel" }).click();
            await page.keyboard.press("Escape");
            await expect(dialog).toBeHidden();

            await openTab(page, "Provvigioni");

            await expect(page.getByText("Select a competence month and run the preview. Nothing is saved.")).toBeVisible();
            await expect(page.getByText("Liquidations are imported in Ordini.")).toBeVisible();
            await expect(page.getByRole("button", { name: "Go to Ordini" })).toBeVisible();
            await expect(page.getByText("Click to upload")).toHaveCount(0);

            await pickMonth(page, page.getByRole("group", { name: "Competence month", exact: true }), MONTH);
            await page.route(`**${PREVIEW_PATH}`, (route) => route.fulfill({ status: 500, json: { error: PREVIEW_FAILURE } }), { times: 1 });
            await page.getByRole("button", { name: "Preview", exact: true }).click();

            const failure = page.getByRole("alert").filter({ hasText: "Preview failed" });

            await expect(failure).toContainText(PREVIEW_FAILURE);

            await failure.getByRole("button", { name: "Retry" }).click();

            await expect(page.getByText("Preview only: nothing has been saved")).toBeVisible();
            await expect(page.getByRole("checkbox", { name: `Include ${release.escluso.name}`, exact: true })).toBeChecked();
            await expect(page.getByRole("button", { name: "Download preview ZIP" })).toHaveAccessibleDescription(
                "Unsaved preview: the file holds the current draft.",
            );

            await page.getByRole("checkbox", { name: `Include ${release.escluso.name}`, exact: true }).click();
            await page.getByRole("button", { name: "Confirm commissions" }).click();

            const review = page.getByRole("alertdialog", { name: "Confirm the commissions for May 2031" });

            await expect(review.getByRole("term")).toHaveText(["Included agents", "Included rows", "Total", "Excluded agents", "Unmatched rows"]);
            await expect(review).toContainText(
                "For each included agent, this month's draft invite is replaced with these rows. Excluded agents' invites don't change. Invites that are no longer drafts aren't modified.",
            );
            await expect(review.getByRole("button", { name: "Cancel" })).toBeVisible();

            await review.getByRole("button", { name: "Save commissions" }).click();

            const saved = page.getByRole("region", { name: "Save outcome" });

            await expect(saved.getByRole("status")).toHaveText("Save complete. Agents saved: 2.");
            await expect(saved.getByRole("button", { name: "Download saved invites ZIP" })).toHaveAccessibleDescription(
                "The file holds the saved invites, read back from the server.",
            );

            await saved.getByRole("button", { name: "Open Inviti" }).click();
            await page.getByRole("button", { name: "Unpaid commissions report", exact: true }).click();
            await page.getByRole("radio", { name: release.uno.name, exact: true }).click();
            await download(page, page.getByRole("button", { name: "Calculate & download CSV (1)" }));

            await expect(page.getByRole("region", { name: "Notifications (F8)" }).getByRole("listitem")).toContainText(
                `Downloaded 2 rows for ${release.uno.name}.`,
            );
        });
    });
});
