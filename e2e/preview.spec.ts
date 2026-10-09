import type { Locator, Page, Request } from "@playwright/test";

import { monthStart, uniqueToken, type Backend, type SettlementRow, type TestAgent } from "./support/backend";
import { agentRow, confirmButton, monthGroup, previewButton, recordRow } from "./support/calculation";
import { recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { attachWorkbook, importCompetence, monthLabel, openSettlements, openTab, pickMonth } from "./support/ui";

// Covers docs/frontend-calcolo-refactor/test-guides/03-calculation-preview.md.
const MONTH = "2031-08";

const OTHER_MONTH = "2031-09";

const EMPTY_MONTH_MESSAGE = "Nessuna liquidazione importata per questa competenza";

// The exact body the app sends for MONTH: the first day of the competence month and nothing else.
const PREVIEW_BODY = JSON.stringify({ competenza_liquidazione: "2031-08-01" });

const STALE_MESSAGE = "Le liquidazioni di questa competenza sono cambiate dopo l'anteprima. Ricalcola prima di salvare.";

interface Family {
    token: string;
    grandparent: TestAgent;
    parent: TestAgent;
    child: TestAgent;
}

// The parent keeps 50% of what the child earns. The grandparent has no configured share, so the backend gives it
// 100% of the parent's own sales and nothing from the child's, because overrides go up one level only.
async function createFamily(backend: Backend): Promise<Family> {
    const token = uniqueToken();
    const grandparent = await backend.createAgent({ name: `Nonno ${token}`, ruleValues: {} });

    const parent = await backend.createAgent({
        name: `Padre ${token}`,
        parentName: grandparent.name,
        childShare: 50,
        ruleValues: { "Gettone Residenziale Standard": 10, "Rinnovo Residenziale": 4 },
    });

    const child = await backend.createAgent({
        name: `Figlio ${token}`,
        parentName: parent.name,
        ruleValues: { "Gettone Residenziale Standard": 6, "Gettone SDD Residenziale": 2 },
    });

    return { token, grandparent, parent, child };
}

function childRows(family: Family): SettlementRow[] {
    return [
        { seller: family.child.name, rule: "Gettone Residenziale Standard", amount: 120, customer: `Cliente Figlio A ${family.token}`, orderId: 991_001 },
        { seller: family.child.name, rule: "Gettone SDD Residenziale", amount: 80, customer: `Cliente Figlio B ${family.token}`, orderId: 991_002 },
    ];
}

// Sellers already in the backend's normalized form (uppercase words, sorted), so the stored seller reads back unchanged.
function unmatchedRows(token: string): SettlementRow[] {
    return [
        { seller: `${token} IGNOTO`, rule: "Gettone Residenziale Standard", amount: 250.5, customer: `Cliente Ignoto A ${token}`, orderId: 991_005 },
        { seller: `${token} SCONOSCIUTO`, rule: "Rinnovo Residenziale", amount: 45.25, customer: `Cliente Ignoto B ${token}`, orderId: 991_006 },
    ];
}

// Row order sets each row's POD, from IT001E00000000 up. Expected commissions: child 8,00, parent 18,00, grandparent 14,00.
function mixedRows(family: Family): SettlementRow[] {
    return [
        ...childRows(family),
        // The spreadsheet spells the parent differently from the agent registry; the backend matches them by normalized name.
        { seller: `padre ${family.token.toLowerCase()}`, rule: "Gettone Residenziale Standard", amount: 150, customer: `Cliente Padre A ${family.token}`, orderId: 991_003 },
        { seller: `padre ${family.token.toLowerCase()}`, rule: "Rinnovo Residenziale", amount: 60, customer: `Cliente Padre B ${family.token}`, orderId: 991_004 },
        ...unmatchedRows(family.token),
    ];
}

function isPreviewOf(request: Request, month: string): boolean {
    return request.url().endsWith("/api/calcolo/anteprima") && (request.postData() ?? "").includes(monthStart(month));
}

async function openPreview(page: Page, month: string): Promise<void> {
    await openTab(page, "Provvigioni");
    await pickMonth(page, monthGroup(page), month);
}

function totalRow(page: Page): Locator {
    return page.getByRole("row").filter({ hasText: /^Totale/ });
}

// "failed" expects the dialog to report an error, for a request whose response a test makes the page lose.
async function deleteMonthInOrders(page: Page, month: string, outcome: number | "failed"): Promise<void> {
    const dialog = await openSettlements(page, month);

    await dialog.getByRole("button", { name: `Elimina liquidazioni di ${monthLabel(month)}` }).click();
    await dialog.getByRole("button", { name: `Elimina ${importCompetence(month)}` }).click();

    if (outcome === "failed") await expect(dialog.getByRole("alert")).toBeVisible();
    else await expect(dialog.getByRole("status")).toHaveText(`Liquidazioni eliminate: ${outcome}.`);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
}

async function importMonthInOrders(page: Page, month: string, fileName: string, rows: SettlementRow[], outcome: "imported" | "failed"): Promise<void> {
    const dialog = await openSettlements(page, month);

    await attachWorkbook(dialog, month, fileName, rows);
    await dialog.getByRole("button", { name: "Importa Liquidazioni" }).click();

    if (outcome === "failed") await expect(dialog.getByRole("alert")).toBeVisible();
    else await expect(dialog.getByRole("status")).toContainText(`${rows.length} record elaborati`);

    await page.keyboard.press("Escape");
    await expect(dialog).toBeHidden();
}

test.describe("calculation preview", () => {
    test("should show each beneficiary's commission from the stored liquidazioni and write nothing when the preview is requested", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));

        const invitesBefore = await backend.invitesSnapshot();
        const previewBodies: string[] = [];

        page.on("request", (request) => {
            if (request.url().endsWith("/api/calcolo/anteprima")) previewBodies.push(request.postData() ?? "");
        });

        await page.goto("/");
        await expect(page.getByText("Avvia l'anteprima per calcolare il totale. Non viene salvato nulla.")).toBeHidden();
        await openPreview(page, MONTH);
        await expect(page.getByText("Avvia l'anteprima per calcolare il totale. Non viene salvato nulla.")).toBeVisible();

        const writes = recordApiWrites(page);

        await previewButton(page).click();

        await expect(agentRow(page, family.parent).getByRole("cell")).toHaveText(["", "", `${family.parent.name}#${family.parent.id}`, "4", "18,00 €"]);
        await expect(agentRow(page, family.grandparent).getByRole("cell")).toHaveText(["", "", `${family.grandparent.name}#${family.grandparent.id}`, "2", "14,00 €"]);
        await expect(agentRow(page, family.child).getByRole("cell")).toHaveText(["", "", `${family.child.name}#${family.child.id}`, "2", "8,00 €"]);
        await expect(totalRow(page).getByRole("cell")).toHaveText(["Totale", "8", "40,00 €"]);
        await expect(page.getByText("3 beneficiari · 8 righe incluse", { exact: true })).toBeVisible();
        await expect(page.getByText("Solo anteprima: nulla è stato salvato")).toBeVisible();
        await expect(confirmButton(page)).toHaveAccessibleDescription("Solo anteprima: nulla è stato salvato");

        expect(previewBodies).toEqual([PREVIEW_BODY]);
        await expect.poll(() => writes).toEqual(["start POST /api/calcolo/anteprima", "end POST /api/calcolo/anteprima"]);
        expect(await backend.invitesSnapshot()).toBe(invitesBefore);
    });

    test("should label only the rows a parent earns from its child's sales when the beneficiaries are expanded", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);
        const { token } = family;

        await backend.importRows(MONTH, mixedRows(family));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        await page.getByRole("button", { name: family.parent.name, exact: true }).click();

        await expect(recordRow(page, `Cliente Figlio A ${token}`).getByRole("cell")).toHaveText([
            `Cliente Figlio A ${token}`,
            "IT001E00000000",
            "E2ETST80A01H501A",
            `Da vendite di ${family.child.name}`,
            "Gettone Residenziale Standard",
            "2031-08-31",
            "",
            "",
        ]);
        await expect(recordRow(page, `Cliente Figlio A ${token}`).getByRole("textbox")).toHaveValue("3,00");

        await expect(recordRow(page, `Cliente Figlio B ${token}`).getByRole("cell").nth(3)).toHaveText(`Da vendite di ${family.child.name}`);
        await expect(recordRow(page, `Cliente Figlio B ${token}`).getByRole("textbox")).toHaveValue("1,00");

        // Sold under a reordered spelling of the parent's own name, so these are direct sales with no child label.
        await expect(recordRow(page, `Cliente Padre A ${token}`).getByRole("cell")).toHaveText([
            `Cliente Padre A ${token}`,
            "IT001E00000002",
            "E2ETST80A01H501A",
            family.parent.name,
            "Gettone Residenziale Standard",
            "2031-08-31",
            "",
            "",
        ]);
        await expect(recordRow(page, `Cliente Padre A ${token}`).getByRole("textbox")).toHaveValue("10,00");

        await expect(recordRow(page, `Cliente Padre B ${token}`).getByRole("cell").nth(3)).toHaveText(family.parent.name);

        await page.getByRole("button", { name: family.grandparent.name, exact: true }).click();

        await expect(recordRow(page, `Cliente Padre A ${token}`).getByRole("cell").nth(3)).toHaveText(`Da vendite di ${family.parent.name}`);
        await expect(recordRow(page, `Cliente Padre B ${token}`).getByRole("textbox")).toHaveValue("4,00");
        await expect(recordRow(page, "Cliente Figlio")).toHaveCount(0);

        await page.getByRole("button", { name: family.child.name, exact: true }).click();

        await expect(recordRow(page, `Cliente Figlio A ${token}`).getByRole("cell").nth(3)).toHaveText(family.child.name);
        await expect(recordRow(page, `Cliente Figlio A ${token}`).getByRole("textbox")).toHaveValue("6,00");
        await expect(page.getByText(/^Da vendite di/)).toHaveCount(0);
    });

    test("should list unmatched rows apart and leave them out of every total when some sellers match no agent", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);
        const { token } = family;

        await backend.importRows(MONTH, mixedRows(family));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        const unmatched = page.getByRole("region", { name: "2 righe non associate, escluse dal calcolo" });

        await expect(unmatched.getByRole("status")).toHaveText("2 righe non associate, escluse dal calcolo");
        await expect(recordRow(unmatched, `Cliente Ignoto A ${token}`).getByRole("cell")).toHaveText([
            `${token} IGNOTO`,
            `Cliente Ignoto A ${token}`,
            "IT001E00000004",
            "E2ETST80A01H501A",
            "Gettone Residenziale Standard",
            "—",
            "2031-08-31",
            "250,50 €",
        ]);

        await expect(recordRow(unmatched, `Cliente Ignoto B ${token}`).getByRole("cell").nth(7)).toHaveText("45,25 €");
        await expect(totalRow(page).getByRole("cell")).toHaveText(["Totale", "8", "40,00 €"]);
    });

    test("should show the confirm action and the unmatched rows without scrolling when the preview has unmatched rows", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        const unmatched = page.getByRole("region", { name: "2 righe non associate, escluse dal calcolo" });

        await expect(confirmButton(page)).toBeEnabled();
        await expect(confirmButton(page)).toBeInViewport({ ratio: 1 });
        await expect(recordRow(unmatched, `Cliente Ignoto A ${family.token}`)).toBeInViewport({ ratio: 1 });
    });

    test("should show the unmatched rows instead of the empty state when no row in the month matches an agent", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();

        await backend.importRows(MONTH, unmatchedRows(token));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        const unmatched = page.getByRole("region", { name: "2 righe non associate, escluse dal calcolo" });

        await expect(unmatched.getByRole("status")).toHaveText("2 righe non associate, escluse dal calcolo");
        await expect(page.getByText("Nessun agente matura provvigioni dalle liquidazioni di questa competenza.")).toBeVisible();
        await expect(recordRow(unmatched, token)).toHaveCount(2);
        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toHaveCount(0);
    });

    test("should show the same results and write nothing when the preview is requested again", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));

        const invitesBefore = await backend.invitesSnapshot();

        await page.goto("/");
        await openPreview(page, MONTH);

        const writes = recordApiWrites(page);

        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");

        const firstResults = await page.getByRole("main").innerText();
        const repeated = page.waitForResponse((response) => isPreviewOf(response.request(), MONTH));

        await previewButton(page).click();
        await repeated;
        await expect(previewButton(page)).toBeEnabled();
        expect(await page.getByRole("main").innerText()).toBe(firstResults);

        await pickMonth(page, page.getByRole("group", { name: "Competenza", exact: true }), OTHER_MONTH);
        await pickMonth(page, page.getByRole("group", { name: "Competenza", exact: true }), MONTH);
        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");
        expect(await page.getByRole("main").innerText()).toBe(firstResults);

        await expect.poll(() => writes).toHaveLength(6);
        expect(new Set(writes)).toEqual(new Set(["start POST /api/calcolo/anteprima", "end POST /api/calcolo/anteprima"]));
        expect(await backend.invitesSnapshot()).toBe(invitesBefore);
    });

    test("should send the user to Ordini when the month has no liquidazioni", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();

        await page.getByRole("button", { name: "Vai a Ordini" }).click();

        await expect(page.getByRole("heading", { name: "Ordini", level: 2 })).toBeVisible();
        await expect(page).toHaveURL(/#ordini$/);
    });

    test("should show the outline of the results for the chosen month and link to Ordini when no preview has run", async ({ page }) => {
        const outlineTitle = (month: string): RegExp => new RegExp(`^Provvigione Totale — ${monthLabel(month)}$`, "i");

        await page.goto("/");
        await openPreview(page, MONTH);

        await expect(page.getByText(outlineTitle(MONTH))).toBeVisible();
        await expect(page.getByText("Avvia l'anteprima per calcolare il totale. Non viene salvato nulla.")).toBeVisible();
        await expect(page.getByRole("row")).toHaveCount(0);

        await pickMonth(page, monthGroup(page), OTHER_MONTH);

        await expect(page.getByText(outlineTitle(OTHER_MONTH))).toBeVisible();
        await expect(page.getByText(outlineTitle(MONTH))).toHaveCount(0);

        await page.getByRole("button", { name: "Vai a Ordini" }).click();

        await expect(page.getByRole("heading", { name: "Ordini", level: 2 })).toBeVisible();
        await expect(page).toHaveURL(/#ordini$/);
    });

    test("should report a setup problem and link to Regole when the commission configuration is missing", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        // An empty configuration table can't be arranged on a shared database, so the backend's 404 is simulated.
        await page.route("**/api/calcolo/anteprima", (route) =>
            route.fulfill({ status: 404, json: { error: "Nessuna configurazione provvigionale trovata nel database." } }),
        );

        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        const alert = page.getByRole("alert");

        await expect(alert).toContainText("Configurazione provvigionale mancante");
        await expect(alert).toContainText("È un problema di configurazione, non un mese vuoto.");
        await expect(alert).toContainText("Nessuna configurazione provvigionale trovata nel database.");
        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toHaveCount(0);

        await alert.getByRole("button", { name: "Vai a Regole" }).click();

        await expect(page.getByRole("heading", { name: "Regole", level: 2 })).toBeVisible();
        await expect(page).toHaveURL(/#regole$/);
    });

    test("should show the backend's message and request the same month again when the preview fails and the user retries", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);
        await page.route(
            "**/api/calcolo/anteprima",
            (route) => route.fulfill({ status: 500, json: { error: "Errore simulato: anteprima non riuscita" } }),
            { times: 1 },
        );

        const previewBodies: string[] = [];

        page.on("request", (request) => {
            if (request.url().endsWith("/api/calcolo/anteprima")) previewBodies.push(request.postData() ?? "");
        });

        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();

        const alert = page.getByRole("alert");

        await expect(alert).toContainText("Anteprima non riuscita");
        await expect(alert).toContainText("Errore simulato: anteprima non riuscita");

        await alert.getByRole("button", { name: "Riprova" }).click();

        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();
        await expect(alert).toBeHidden();
        expect(previewBodies).toEqual([PREVIEW_BODY, PREVIEW_BODY]);
    });

    test("should discard a late answer for an earlier month and keep the preview across tabs without refetching", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);
        await backend.claimMonth(OTHER_MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));

        const lateAnswer = Promise.withResolvers<void>();

        // The backend answers at once; the answer only reaches the page after the user has moved on to another month.
        await page.route("**/api/calcolo/anteprima", async (route) => {
            if (!isPreviewOf(route.request(), OTHER_MONTH)) return route.continue();

            const response = await route.fetch();

            await lateAnswer.promise;
            await route.fulfill({ response });
        });

        await page.goto("/");
        await openPreview(page, OTHER_MONTH);
        await previewButton(page).click();
        await expect(previewButton(page)).toBeDisabled();

        await pickMonth(page, page.getByRole("group", { name: "Competenza", exact: true }), MONTH);
        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");

        const lateFinished = page.waitForEvent("requestfinished", (request) => isPreviewOf(request, OTHER_MONTH));

        lateAnswer.resolve();
        await lateFinished;

        const previewRequests: string[] = [];

        page.on("request", (request) => {
            if (request.url().endsWith("/api/calcolo/anteprima")) previewRequests.push(request.postData() ?? "");
        });

        await openTab(page, "Dashboard");
        await expect(page).toHaveURL(/#dashboard$/);
        await expect(previewButton(page)).toBeHidden();
        await openTab(page, "Provvigioni");

        await expect(totalRow(page).getByRole("cell")).toHaveText(["Totale", "8", "40,00 €"]);
        await expect(page.getByRole("group", { name: "Competenza", exact: true })).toContainText(monthLabel(MONTH));
        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toHaveCount(0);
        expect(previewRequests).toEqual([]);
    });

    test("should mark the preview outdated until it is recalculated when the month's liquidazioni are deleted afterwards", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");

        await deleteMonthInOrders(page, MONTH, 6);
        await openTab(page, "Provvigioni");

        const stale = page.getByRole("alert").filter({ hasText: STALE_MESSAGE });

        await expect(stale).toBeVisible();
        await expect(totalRow(page)).toContainText("40,00 €");

        await stale.getByRole("button", { name: "Ricalcola" }).click();

        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();
        await expect(stale).toBeHidden();
    });

    test("should mark the preview outdated when the month's liquidazioni are deleted while it is loading", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));

        const computed = Promise.withResolvers<void>();
        const delivered = Promise.withResolvers<void>();

        // The backend computes the preview from the rows that exist now, and the page receives it after they are deleted.
        await page.route("**/api/calcolo/anteprima", async (route) => {
            const response = await route.fetch();

            computed.resolve();
            await delivered.promise;
            await route.fulfill({ response });
        });

        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();
        await computed.promise;

        await deleteMonthInOrders(page, MONTH, 6);
        await openTab(page, "Provvigioni");
        delivered.resolve();

        const stale = page.getByRole("alert").filter({ hasText: STALE_MESSAGE });

        await expect(totalRow(page)).toContainText("40,00 €");
        await expect(stale).toBeVisible();

        await stale.getByRole("button", { name: "Ricalcola" }).click();

        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();
        await expect(stale).toBeHidden();
    });

    test("should mark the preview outdated and block confirming when the month is deleted but the response to the deletion is lost", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");

        // The backend deletes the rows, but the page never receives its answer.
        await page.route("**/api/liquidazioni/*", async (route) => {
            if (route.request().method() !== "DELETE") return route.continue();

            await route.fetch();
            await route.abort("failed");
        });

        await deleteMonthInOrders(page, MONTH, "failed");
        await openTab(page, "Provvigioni");

        await expect(page.getByRole("alert").filter({ hasText: STALE_MESSAGE })).toBeVisible();
        await expect(confirmButton(page)).toBeDisabled();
        await expect(confirmButton(page)).toHaveAccessibleDescription("Ricalcola l'anteprima prima di confermare.");
        expect(await backend.storedUnmatchedRows(MONTH)).toBe(0);
    });

    test("should mark the preview outdated and show the imported commissions after recalculating when the response to an import is lost", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();
        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();

        // The backend imports the rows, but the page never receives its answer.
        await page.route("**/api/importa-liquidazioni", async (route) => {
            await route.fetch();
            await route.abort("failed");
        });

        await importMonthInOrders(page, MONTH, `importazione-persa-${family.token}.xlsx`, childRows(family), "failed");
        await openTab(page, "Provvigioni");

        const stale = page.getByRole("alert").filter({ hasText: STALE_MESSAGE });

        await expect(stale).toBeVisible();

        await stale.getByRole("button", { name: "Ricalcola" }).click();

        await expect(totalRow(page).getByRole("cell")).toHaveText(["Totale", "4", "12,00 €"]);
        await expect(stale).toBeHidden();
    });

    test("should mark an empty preview outdated and show the new commissions after recalculating when the month is imported afterwards", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();
        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();

        await importMonthInOrders(page, MONTH, `anteprima-${family.token}.xlsx`, childRows(family), "imported");
        await openTab(page, "Provvigioni");

        const stale = page.getByRole("alert").filter({ hasText: STALE_MESSAGE });

        await expect(stale).toBeVisible();
        await expect(page.getByText(EMPTY_MONTH_MESSAGE)).toBeVisible();

        await stale.getByRole("button", { name: "Ricalcola" }).click();

        // The child's own 8,00 plus the parent's 50% override of 4,00. The grandparent gets nothing from the child.
        await expect(totalRow(page).getByRole("cell")).toHaveText(["Totale", "4", "12,00 €"]);
        await expect(agentRow(page, family.grandparent)).toHaveCount(0);
        await expect(stale).toBeHidden();
    });

    test("should keep the previous results in place and lock the button while a recalculation is loading", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const family = await createFamily(backend);

        await backend.importRows(MONTH, mixedRows(family));
        await page.goto("/");
        await openPreview(page, MONTH);
        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");

        const before = await totalRow(page).boundingBox();
        const answer = Promise.withResolvers<void>();

        await page.route("**/api/calcolo/anteprima", async (route) => {
            await answer.promise;
            await route.continue();
        });

        await previewButton(page).click();

        await expect(previewButton(page)).toBeDisabled();
        await expect(page.getByText("Calcolo dell'anteprima...")).toBeAttached();
        await expect(totalRow(page)).toContainText("40,00 €");
        expect(await totalRow(page).boundingBox()).toEqual(before);

        answer.resolve();

        await expect(previewButton(page)).toBeEnabled();
        await expect(page.getByText("Calcolo dell'anteprima...")).toHaveCount(0);
        expect(await totalRow(page).boundingBox()).toEqual(before);
    });

    test.describe("in English", () => {
        test.use({ appLanguage: "en" });

        test("should translate the labels, the error and the results when the app is in English", async ({ page, backend }) => {
            await backend.claimMonth(MONTH);

            const family = await createFamily(backend);

            await backend.importRows(MONTH, mixedRows(family));
            await page.route(
                "**/api/calcolo/anteprima",
                (route) => route.fulfill({ status: 500, json: { error: "Simulated failure" } }),
                { times: 1 },
            );

            await page.goto("/");
            await openTab(page, "Provvigioni");
            await expect(page.getByText("Run the preview to calculate the total. Nothing is saved.")).toBeVisible();
            await pickMonth(page, page.getByRole("group", { name: "Competence month", exact: true }), MONTH);
            await page.getByRole("button", { name: "Preview", exact: true }).click();

            const alert = page.getByRole("alert");

            await expect(alert).toContainText("Preview failed");
            await expect(alert).toContainText("Simulated failure");

            await alert.getByRole("button", { name: "Retry" }).click();

            await expect(page.getByText("Preview only: nothing has been saved")).toBeVisible();
            await expect(page.getByText("3 beneficiaries · 8 included rows", { exact: true })).toBeVisible();
            await expect(
                page.getByRole("region", { name: "2 unmatched rows, excluded from the calculation" }).getByRole("status"),
            ).toHaveText("2 unmatched rows, excluded from the calculation");
            await expect(page.getByRole("row").filter({ hasText: /^Total/ }).getByRole("cell")).toHaveText(["Total", "8", "40,00 €"]);

            await page.getByRole("button", { name: family.parent.name, exact: true }).click();

            await expect(page.getByText(`From ${family.child.name}'s sales`)).toHaveCount(2);
        });
    });
});
