import type { Locator, Page, Request } from "@playwright/test";

import { monthStart, uniqueToken, type Backend, type SettlementRow, type TestAgent } from "./support/backend";
import { agentRow, confirmButton, monthGroup, previewButton, recordRow } from "./support/calculation";
import { recordApiWrites } from "./support/network";
import { expect, test } from "./support/test";
import { monthLabel, openTab, pickMonth } from "./support/ui";

// Covers docs/frontend-calcolo-refactor/test-guides/03-calculation-preview.md.
const MONTH = "2031-08";

const OTHER_MONTH = "2031-09";

const EMPTY_MONTH_MESSAGE = "Nessuna liquidazione importata per questa competenza";

// The exact body the app sends for MONTH: the first day of the competence month and nothing else.
const PREVIEW_BODY = JSON.stringify({ competenza_liquidazione: "2031-08-01" });

interface Family {
    token: string;
    grandparent: TestAgent;
    parent: TestAgent;
    child: TestAgent;
}

// The parent gets half of each of the child's rule values and the grandparent all of the parent's. The grandparent gets
// nothing from the child's sales, because parent values go up one level only.
async function createFamily(backend: Backend): Promise<Family> {
    const token = uniqueToken();
    const grandparent = await backend.createAgent({ name: `Nonno ${token}`, ruleValues: {} });

    const parent = await backend.createAgent({
        name: `Padre ${token}`,
        parentName: grandparent.name,
        parentShare: 100,
        ruleValues: { "Gettone Residenziale Standard": 10, "Rinnovo Residenziale": 4 },
    });

    const child = await backend.createAgent({
        name: `Figlio ${token}`,
        parentName: parent.name,
        parentShare: 50,
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

test.describe("calculation preview", () => {
    test("should show each beneficiary's commission, the same on every request, and write nothing when the preview is requested again and after a month switch", async ({
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

        const firstResults = await page.getByRole("main").innerText();
        const repeated = page.waitForResponse((response) => isPreviewOf(response.request(), MONTH));

        await previewButton(page).click();
        await repeated;
        await expect(previewButton(page)).toBeEnabled();
        expect(await page.getByRole("main").innerText()).toBe(firstResults);

        await pickMonth(page, monthGroup(page), OTHER_MONTH);
        await pickMonth(page, monthGroup(page), MONTH);
        await previewButton(page).click();
        await expect(totalRow(page)).toContainText("40,00 €");
        expect(await page.getByRole("main").innerText()).toBe(firstResults);

        await expect.poll(() => writes).toHaveLength(6);
        expect(new Set(writes)).toEqual(new Set(["start POST /api/calcolo/anteprima", "end POST /api/calcolo/anteprima"]));
        expect(previewBodies).toEqual([PREVIEW_BODY, PREVIEW_BODY, PREVIEW_BODY]);
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
            "31/08/2031",
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
            "31/08/2031",
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
        await unmatched.getByRole("button", { name: "Mostra righe" }).click();
        await expect(recordRow(unmatched, `Cliente Ignoto A ${token}`).getByRole("cell")).toHaveText([
            `${token} IGNOTO`,
            `Cliente Ignoto A ${token}`,
            "IT001E00000004",
            "E2ETST80A01H501A",
            "Gettone Residenziale Standard",
            "—",
            "31/08/2031",
            "250,50 €",
        ]);

        await expect(recordRow(unmatched, `Cliente Ignoto B ${token}`).getByRole("cell").nth(7)).toHaveText("45,25 €");
        await expect(totalRow(page).getByRole("cell")).toHaveText(["Totale", "8", "40,00 €"]);
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

});
