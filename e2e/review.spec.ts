import type { Page } from "@playwright/test";

import { uniqueToken, type Backend, type SettlementRow, type TestAgent } from "./support/backend";
import {
    agentRow,
    agentTotal,
    amountInputs,
    confirmButton,
    expand,
    expectAmounts,
    includeBox,
    monthGroup,
    overallTotal,
    previewButton,
    recordRow,
} from "./support/calculation";
import { recordApiRequests } from "./support/network";
import { expect, test } from "./support/test";
import { attachWorkbook, importCompetence, monthLabel, openSettlements, openTab, pickMonth } from "./support/ui";

// Covers docs/frontend-calcolo-refactor/test-guides/04-review-and-editing.md.
const MONTH = "2031-10";

const OTHER_MONTH = "2031-11";

const MONTH_BUTTONS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const EXCLUSION_NOTE =
    "Gli agenti esclusi non vengono salvati. Gli inviti già salvati per loro restano come sono: non vengono eliminati né azzerati.";

const STALE_MESSAGE = "Le liquidazioni di questa competenza sono cambiate dopo l'anteprima. Ricalcola prima di salvare.";

interface Fixture {
    twins: TestAgent;
    parent: TestAgent;
    child: TestAgent;
    twinCustomer: string;
    otherCustomer: string;
    parentCustomer: string;
    childCustomer: string;
}

// Expected commissions: twins 150 + 150 + 20 = 320, parent 10 + 3 (half of the child's 6) = 13, child 6. Overall 339.
async function createFixture(backend: Backend): Promise<Fixture> {
    const token = uniqueToken();

    const twins = await backend.createAgent({
        name: `Gemelli ${token}`,
        ruleValues: { "Gettone Residenziale Standard": 150, "Rinnovo Residenziale": 20 },
    });

    const parent = await backend.createAgent({ name: `Padre ${token}`, childShare: 50, ruleValues: { "Gettone Residenziale Standard": 10 } });

    const child = await backend.createAgent({
        name: `Figlio ${token}`,
        parentName: parent.name,
        ruleValues: { "Gettone Residenziale Standard": 6 },
    });

    return {
        twins,
        parent,
        child,
        twinCustomer: `Cliente Doppio ${token}`,
        otherCustomer: `Cliente Altro ${token}`,
        parentCustomer: `Cliente Padre ${token}`,
        childCustomer: `Cliente Figlio ${token}`,
    };
}

// The two twin rows are byte-identical. They come first, so sorting by customer moves the "Altro" row above them.
function fixtureRows(fixture: Fixture): SettlementRow[] {
    const twinRow: SettlementRow = {
        seller: fixture.twins.name,
        rule: "Gettone Residenziale Standard",
        amount: 100,
        customer: fixture.twinCustomer,
        orderId: 992_001,
        pod: "IT001E99000001",
    };

    return [
        twinRow,
        { ...twinRow },
        { seller: fixture.twins.name, rule: "Rinnovo Residenziale", amount: 40, customer: fixture.otherCustomer, orderId: 992_002 },
        { seller: fixture.parent.name, rule: "Gettone Residenziale Standard", amount: 100, customer: fixture.parentCustomer, orderId: 992_003 },
        { seller: fixture.child.name, rule: "Gettone Residenziale Standard", amount: 100, customer: fixture.childCustomer, orderId: 992_004 },
    ];
}

async function loadPreview(page: Page, backend: Backend): Promise<Fixture> {
    await backend.claimMonth(MONTH);

    const fixture = await createFixture(backend);

    await backend.importRows(MONTH, fixtureRows(fixture));
    await page.goto("/");
    await openTab(page, "Provvigioni");
    await pickMonth(page, monthGroup(page), MONTH);
    await previewButton(page).click();
    await expect(overallTotal(page)).toHaveText("339,00 €");

    return fixture;
}

// Unlike pickMonth, this doesn't expect the month to change, because the discard prompt may keep the current one.
async function chooseMonth(page: Page, month: string): Promise<void> {
    await monthGroup(page).getByRole("button", { name: /^[a-z]+ \d{4}$/ }).click();
    await page.getByRole("button", { name: MONTH_BUTTONS[Number(month.slice(5, 7)) - 1], exact: true }).click();
}

test.describe("preview review and editing", () => {
    test("should change the agent and overall totals by the exact delta and send no request when an amount is edited", async ({
        page,
        backend,
    }) => {
        const fixture = await loadPreview(page, backend);
        const requests = recordApiRequests(page);

        await expand(page, fixture.twins);
        await amountInputs(page, fixture.twinCustomer).first().fill("175.50");

        await expect(agentTotal(page, fixture.twins)).toHaveText("345,50 €");
        await expect(overallTotal(page)).toHaveText("364,50 €");
        await expect(page.getByText("364,50 €", { exact: true })).toHaveCount(2);
        await expect(agentTotal(page, fixture.parent)).toHaveText("13,00 €");
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175.50", "150,00"]);
        await expect(confirmButton(page)).toBeEnabled();
        expect(requests).toEqual([]);
    });

    test("should change only the targeted row when one of two identical rows is edited and removed under a filter", async ({ page, backend }) => {
        const fixture = await loadPreview(page, backend);
        const requests = recordApiRequests(page);

        await expand(page, fixture.twins);

        const details = page
            .getByRole("row")
            .filter({ has: page.getByRole("textbox", { name: /^Provvigione di / }) })
            .filter({ hasNot: page.getByRole("row") });

        // Sorted by customer, so the row that came last from the server is shown first.
        await expect(details.first().getByRole("cell").first()).toHaveText(fixture.otherCustomer);

        await page.getByRole("textbox", { name: "Filtra..." }).fill("Doppio");
        await expect(details).toHaveCount(2);
        await amountInputs(page, fixture.twinCustomer).nth(1).fill("99,75");

        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["150,00", "99,75"]);

        await page.getByRole("button", { name: "Cancella filtro" }).click();
        await expect(details).toHaveCount(3);
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["150,00", "99,75"]);
        await expect(agentTotal(page, fixture.twins)).toHaveText("269,75 €");

        await page.getByRole("textbox", { name: "Filtra..." }).fill("Doppio");
        await page.getByRole("button", { name: `Rimuovi la riga di ${fixture.twinCustomer}` }).nth(1).click();

        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["150,00"]);
        await expect(agentRow(page, fixture.twins).getByRole("cell").nth(3)).toHaveText("2");
        await expect(agentTotal(page, fixture.twins)).toHaveText("170,00 €");
        await expect(overallTotal(page)).toHaveText("189,00 €");
        expect(requests).toEqual([]);
    });

    test("should bring the edited amounts back into the totals when an excluded agent is included again", async ({ page, backend }) => {
        const fixture = await loadPreview(page, backend);

        await expand(page, fixture.twins);
        await amountInputs(page, fixture.otherCustomer).fill("30");
        await amountInputs(page, fixture.twinCustomer).first().fill("100");
        await expect(agentTotal(page, fixture.twins)).toHaveText("280,00 €");
        await expect(overallTotal(page)).toHaveText("299,00 €");

        await includeBox(page, fixture.twins).click();

        await expect(includeBox(page, fixture.twins)).not.toBeChecked();
        await expect(agentRow(page, fixture.twins).getByRole("cell").nth(2)).toHaveText(`${fixture.twins.name}#${fixture.twins.id}Escluso`);
        await expect(overallTotal(page)).toHaveText("19,00 €");
        await expect(page.getByText(EXCLUSION_NOTE)).toBeVisible();

        await includeBox(page, fixture.twins).click();

        await expect(includeBox(page, fixture.twins)).toBeChecked();
        await expect(agentTotal(page, fixture.twins)).toHaveText("280,00 €");
        await expect(overallTotal(page)).toHaveText("299,00 €");
        await expect(amountInputs(page, fixture.otherCustomer)).toHaveValue("30");
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["100", "150,00"]);
    });

    test("should exclude the agent for good and keep confirmation disabled for an empty selection when its last row is removed", async ({
        page,
        backend,
    }) => {
        const fixture = await loadPreview(page, backend);

        await expand(page, fixture.child);
        await page.getByRole("button", { name: `Rimuovi la riga di ${fixture.childCustomer}` }).click();

        await expect(agentRow(page, fixture.child).getByRole("cell").nth(2)).toHaveText(
            `${fixture.child.name}#${fixture.child.id}Escluso: nessuna riga rimasta`,
        );
        await expect(includeBox(page, fixture.child)).not.toBeChecked();
        await expect(includeBox(page, fixture.child)).toBeDisabled();
        await expect(page.getByText(EXCLUSION_NOTE)).toBeVisible();
        await expect(overallTotal(page)).toHaveText("333,00 €");
        await expect(confirmButton(page)).toBeEnabled();

        await includeBox(page, fixture.twins).click();
        await includeBox(page, fixture.parent).click();

        await expect(overallTotal(page)).toHaveText("0,00 €");
        await expect(confirmButton(page)).toBeDisabled();
        await expect(confirmButton(page)).toHaveAccessibleDescription("Nessun agente incluso: non c'è nulla da confermare.");
    });

    test("should total signed and comma amounts and block confirmation only while an included amount is invalid", async ({ page, backend }) => {
        const fixture = await loadPreview(page, backend);
        const provisional = page.getByText("Totale provvisorio: 1 importo non valido da correggere");

        await expand(page, fixture.twins);
        await amountInputs(page, fixture.otherCustomer).fill("0");
        await amountInputs(page, fixture.twinCustomer).first().fill("-25.40");
        await amountInputs(page, fixture.twinCustomer).nth(1).fill("99,75");

        // 0 - 25,40 + 99,75 for the twins, plus 13 + 6 for the others.
        await expect(agentTotal(page, fixture.twins)).toHaveText("74,35 €");
        await expect(overallTotal(page)).toHaveText("93,35 €");
        await expect(page.getByText("Importo non valido")).toHaveCount(0);
        await expect(confirmButton(page)).toBeEnabled();

        await expand(page, fixture.parent);

        for (const invalid of ["", "abc", "12,3.4"]) {
            await amountInputs(page, fixture.parentCustomer).fill(invalid);

            await expect(amountInputs(page, fixture.parentCustomer)).toHaveAccessibleDescription("Importo non valido");
            await expect(agentTotal(page, fixture.parent)).toHaveText("3,00 €Provvisorio");
            await expect(overallTotal(page)).toHaveText("83,35 €Provvisorio");
            await expect(provisional).toBeVisible();
            await expect(confirmButton(page)).toBeDisabled();
            await expect(confirmButton(page)).toHaveAccessibleDescription(
                "Correggi gli importi non validi degli agenti inclusi prima di confermare.",
            );
        }

        await includeBox(page, fixture.parent).click();

        await expect(overallTotal(page)).toHaveText("80,35 €");
        await expect(provisional).toBeHidden();
        await expect(page.getByText("Importo non valido")).toBeVisible();
        await expect(confirmButton(page)).toBeEnabled();

        await includeBox(page, fixture.parent).click();
        await expect(confirmButton(page)).toBeDisabled();

        await amountInputs(page, fixture.parentCustomer).fill("10");

        await expect(page.getByText("Importo non valido")).toHaveCount(0);
        await expect(agentTotal(page, fixture.parent)).toHaveText("13,00 €");
        await expect(overallTotal(page)).toHaveText("93,35 €");
        await expect(provisional).toBeHidden();
        await expect(confirmButton(page)).toBeEnabled();
    });

    test("should leave the parent's own row unchanged when the child's amount is edited or removed", async ({ page, backend }) => {
        const fixture = await loadPreview(page, backend);

        await expand(page, fixture.child);
        await amountInputs(page, fixture.childCustomer).fill("8");
        await expect(agentTotal(page, fixture.child)).toHaveText("8,00 €");

        await expand(page, fixture.parent);

        const overrideRow = recordRow(page, `Da vendite di ${fixture.child.name}`);

        await expect(overrideRow.getByRole("textbox")).toHaveValue("3,00");
        await expect(agentTotal(page, fixture.parent)).toHaveText("13,00 €");

        await expand(page, fixture.child);
        await page.getByRole("button", { name: `Rimuovi la riga di ${fixture.childCustomer}` }).click();
        await expand(page, fixture.parent);

        await expect(agentRow(page, fixture.parent).getByRole("cell").nth(3)).toHaveText("2");
        await expect(overrideRow.getByRole("textbox")).toHaveValue("3,00");

        await overrideRow.getByRole("textbox").fill("4");

        await expect(agentTotal(page, fixture.parent)).toHaveText("14,00 €");
        await expect(overallTotal(page)).toHaveText("334,00 €");
    });

    test("should keep the draft when switching tabs and when the discard prompt is cancelled for a month change or a recalculation", async ({
        page,
        backend,
    }) => {
        await backend.claimMonth(OTHER_MONTH);

        const fixture = await loadPreview(page, backend);
        const requests = recordApiRequests(page);

        await expand(page, fixture.twins);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");
        await expect(overallTotal(page)).toHaveText("364,50 €");

        await openTab(page, "Dashboard");
        await expect(previewButton(page)).toBeHidden();
        await openTab(page, "Provvigioni");

        await expect(overallTotal(page)).toHaveText("364,50 €");
        await expand(page, fixture.twins);
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175,50", "150,00"]);

        const prompt = page.getByRole("alertdialog", { name: "Scartare le modifiche?" });

        await chooseMonth(page, OTHER_MONTH);
        await expect(prompt).toContainText("Cambiando competenza le perdi.");
        await prompt.getByRole("button", { name: "Annulla" }).click();

        await expect(prompt).toBeHidden();
        await expect(monthGroup(page)).toContainText(monthLabel(MONTH));
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175,50", "150,00"]);

        await previewButton(page).click();
        await expect(prompt).toContainText("Ricalcolando le sostituisci con gli importi del server.");
        await prompt.getByRole("button", { name: "Annulla" }).click();

        await expect(prompt).toBeHidden();
        await expect(overallTotal(page)).toHaveText("364,50 €");
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["175,50", "150,00"]);
        await expect(confirmButton(page)).toBeEnabled();

        // The dashboard loads its own data; nothing may touch the preview or write anything.
        expect(requests.filter((request) => !request.startsWith("GET "))).toEqual([]);
    });

    test("should replace the edits with fresh backend rows and totals when the discard prompt is confirmed", async ({ page, backend }) => {
        await backend.claimMonth(OTHER_MONTH);

        const fixture = await loadPreview(page, backend);
        const prompt = page.getByRole("alertdialog", { name: "Scartare le modifiche?" });

        await expand(page, fixture.twins);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");
        await expect(overallTotal(page)).toHaveText("364,50 €");

        // The month changes behind the page's back: the twins lose their renewal row and the parent sells twice.
        const rows = fixtureRows(fixture).filter((row) => row.customer !== fixture.otherCustomer);

        await backend.deleteMonth(MONTH);
        await backend.importRows(MONTH, [...rows, { ...rows[2], customer: `${fixture.parentCustomer} Bis`, orderId: 992_005 }]);

        const recalculated = page.waitForResponse((response) => response.url().endsWith("/api/calcolo/anteprima"));

        await previewButton(page).click();
        await prompt.getByRole("button", { name: "Scarta modifiche" }).click();
        await recalculated;

        await expect(agentTotal(page, fixture.twins)).toHaveText("300,00 €");
        await expect(agentTotal(page, fixture.parent)).toHaveText("23,00 €");
        await expect(overallTotal(page)).toHaveText("329,00 €");
        await expand(page, fixture.twins);
        await expectAmounts(amountInputs(page, fixture.twinCustomer), ["150,00", "150,00"]);
        await expect(amountInputs(page, fixture.otherCustomer)).toHaveCount(0);

        await amountInputs(page, fixture.twinCustomer).first().fill("1");
        await chooseMonth(page, OTHER_MONTH);
        await prompt.getByRole("button", { name: "Scarta modifiche" }).click();

        await expect(monthGroup(page)).toContainText(monthLabel(OTHER_MONTH));
        await expect(page.getByText("Seleziona una competenza e avvia l'anteprima. Non viene salvato nulla.")).toBeVisible();
        await expect(confirmButton(page)).toHaveCount(0);

        await previewButton(page).click();

        await expect(page.getByText("Nessuna liquidazione importata per questa competenza")).toBeVisible();
        await expect(confirmButton(page)).toHaveCount(0);
    });

    test("should mark the edited draft stale and keep confirmation disabled until it is recalculated when the month is reimported", async ({
        page,
        backend,
    }) => {
        const fixture = await loadPreview(page, backend);

        await expand(page, fixture.twins);
        await amountInputs(page, fixture.twinCustomer).first().fill("175,50");
        await expect(overallTotal(page)).toHaveText("364,50 €");

        const dialog = await openSettlements(page, MONTH);

        await dialog.getByRole("button", { name: `Elimina liquidazioni di ${monthLabel(MONTH)}` }).click();
        await dialog.getByRole("button", { name: `Elimina ${importCompetence(MONTH)}` }).click();
        await expect(dialog.getByRole("status")).toHaveText("Liquidazioni eliminate: 5.");
        await page.keyboard.press("Escape");
        await expect(dialog).toBeHidden();

        const importDialog = await openSettlements(page, MONTH);

        // Only the child's sale comes back, which earns the child 6 and the parent 3.
        await attachWorkbook(importDialog, MONTH, `revisione-${fixture.child.id}.xlsx`, [
            { seller: fixture.child.name, rule: "Gettone Residenziale Standard", amount: 100, customer: fixture.childCustomer, orderId: 992_004 },
        ]);
        await importDialog.getByRole("button", { name: "Importa Liquidazioni" }).click();
        await expect(importDialog.getByRole("status")).toContainText("1 record elaborati");
        await page.keyboard.press("Escape");
        await expect(importDialog).toBeHidden();
        await openTab(page, "Provvigioni");

        const stale = page.getByRole("alert").filter({ hasText: STALE_MESSAGE });

        await expect(stale).toBeVisible();
        await expect(overallTotal(page)).toHaveText("364,50 €");
        await expect(confirmButton(page)).toBeDisabled();
        await expect(confirmButton(page)).toHaveAccessibleDescription("Ricalcola l'anteprima prima di confermare.");

        const prompt = page.getByRole("alertdialog", { name: "Scartare le modifiche?" });

        await stale.getByRole("button", { name: "Ricalcola" }).click();
        await prompt.getByRole("button", { name: "Annulla" }).click();

        await expect(stale).toBeVisible();
        await expect(overallTotal(page)).toHaveText("364,50 €");
        await expect(confirmButton(page)).toBeDisabled();

        await stale.getByRole("button", { name: "Ricalcola" }).click();
        await prompt.getByRole("button", { name: "Scarta modifiche" }).click();

        await expect(stale).toBeHidden();
        await expect(overallTotal(page)).toHaveText("9,00 €");
        await expect(agentRow(page, fixture.twins)).toHaveCount(0);
        await expect(confirmButton(page)).toBeEnabled();
    });

    test("should offer no way to add rows to the details or to the unmatched rows", async ({ page, backend }) => {
        await backend.claimMonth(MONTH);

        const fixture = await createFixture(backend);

        await backend.importRows(MONTH, [
            ...fixtureRows(fixture),
            { seller: `${fixture.twins.id} NESSUNO`, rule: "Rinnovo Residenziale", amount: 12, customer: "Cliente Senza Agente", orderId: 992_006 },
        ]);
        await page.goto("/");
        await openTab(page, "Provvigioni");
        await pickMonth(page, monthGroup(page), MONTH);
        await previewButton(page).click();
        await expand(page, fixture.twins);

        await expect(amountInputs(page, fixture.twinCustomer)).toHaveCount(2);
        await expect(page.getByRole("main").getByRole("button", { name: /aggiungi/i })).toHaveCount(0);

        const unmatched = page.getByRole("region", { name: "Righe non associate" });

        await expect(unmatched.getByRole("row").filter({ hasText: "Cliente Senza Agente" })).toBeVisible();
        await expect(unmatched.getByRole("textbox")).toHaveCount(0);
        await expect(unmatched.getByRole("button")).toHaveCount(0);
        await expect(unmatched.getByRole("checkbox")).toHaveCount(0);
    });
});
