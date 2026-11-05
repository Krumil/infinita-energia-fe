import type { Locator, Page } from "@playwright/test";

import { uniqueToken, type Backend, type TestAgent } from "./support/backend";
import { agentRow, confirmButton, monthGroup, overallTotal, previewButton } from "./support/calculation";
import { recordApiWrites } from "./support/network";
import { test } from "./support/rules";
import { expect } from "./support/test";
import { openAgent, openTab, pickMonth } from "./support/ui";

// A rule with no tier and no customer type, so the tests change a row the commission examples don't use.
const DEFAULT_RULE = "Importo fisso euro mese";

const UNTYPED_RULE = "Regola che si basa sul consumo moltiplicato per un valore legato al prodotto di fornitura";

const TIER = "0-1.000 Smc";

const MONTH = "2031-07";

const STALE_MESSAGE = "Liquidazioni, agenti, regole o scaglioni usati da questa anteprima sono cambiati dopo il calcolo. Ricalcola prima di salvare.";

async function openRules(page: Page): Promise<void> {
    await page.goto("/#regole");
    await expect(page.getByRole("heading", { name: "Regole", level: 2 })).toBeVisible();
}

function tableRow(page: Page, description: string): Locator {
    return page.getByRole("row").filter({ hasText: description });
}

async function startEditingDefault(row: Locator, value: string): Promise<Locator> {
    await row.getByTitle("Clicca per modificare").click();

    const input = row.getByRole("textbox");

    await input.fill(value);

    return input;
}

test.describe("rules", () => {
    test("should keep the confirm dialog open with the rule, old and new value and save the default when Enter is pressed", async ({
        page,
        catalog,
    }) => {
        const rule = catalog.rule(DEFAULT_RULE);

        await openRules(page);
        await (await startEditingDefault(tableRow(page, DEFAULT_RULE), "2,5")).press("Enter");

        const dialog = page.getByRole("alertdialog", { name: "Conferma Modifica" });

        await expect(dialog).toContainText(`${DEFAULT_RULE}: Valore predefinito da 1,00 € a 2,50 €.`);
        expect((await catalog.current("regole", rule.id)).valore_default).toBe(1);

        await dialog.getByRole("button", { name: "Conferma" }).click();

        await expect(page.getByText("Valore predefinito aggiornato", { exact: true })).toBeVisible();
        await expect.poll(async () => (await catalog.current("regole", rule.id)).valore_default).toBe(2.5);

        await page.reload();

        await expect(tableRow(page, DEFAULT_RULE).getByTitle("Clicca per modificare")).toContainText("2,50 €");
    });

    test("should show an error and change nothing when the default value is not a number", async ({ page, catalog }) => {
        const rule = catalog.rule(DEFAULT_RULE);
        const writes = recordApiWrites(page);

        await openRules(page);

        const row = tableRow(page, DEFAULT_RULE);

        await (await startEditingDefault(row, "abc")).press("Enter");

        await expect(page.getByText("Inserisci un numero valido, per esempio 2,50.", { exact: true })).toBeVisible();
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect(row.getByTitle("Clicca per modificare")).toContainText("1,00 €");
        expect(writes).toEqual([]);
        expect((await catalog.current("regole", rule.id)).valore_default).toBe(1);
    });

    test("should name the type change in the toast instead of the default value when a rule's service type changes", async ({
        page,
        catalog,
    }) => {
        const rule = catalog.rule(UNTYPED_RULE);

        await openRules(page);
        await tableRow(page, UNTYPED_RULE).getByRole("combobox").nth(1).click();
        await page.getByRole("option", { name: "Gas" }).click();

        const dialog = page.getByRole("alertdialog", { name: "Conferma Modifica" });

        await expect(dialog).toContainText("Tipo Servizio da non impostato a Gas.");
        await dialog.getByRole("button", { name: "Conferma" }).click();

        await expect(page.getByText("Tipo aggiornato", { exact: true })).toBeVisible();
        await expect(page.getByText("Valore predefinito aggiornato")).toHaveCount(0);
        await expect.poll(async () => (await catalog.current("regole", rule.id)).tipo_servizio).toBe("gas");
    });

    test("should show the placeholder and mark no option as selected when a rule has no service type", async ({ page }) => {
        await openRules(page);

        const serviceType = tableRow(page, UNTYPED_RULE).getByRole("combobox").nth(1);

        await expect(serviceType).toHaveText("—");
        await serviceType.click();

        await expect(page.getByRole("option")).toHaveText(["Gas", "Luce"]);
        await expect(page.getByRole("option", { selected: true })).toHaveCount(0);
    });

    test("should explain why the switch is disabled when a rule has no user type", async ({ page }) => {
        await openRules(page);

        const toggle = tableRow(page, UNTYPED_RULE).getByRole("switch");

        await expect(toggle).toBeDisabled();
        await toggle.hover();

        await expect(page.getByRole("tooltip")).toHaveText("Imposta il tipo utenza per attivare questa regola.");
    });

    test("should write the active count in the plural when the rules page is shown", async ({ page }) => {
        await openRules(page);

        await expect(page.getByText(/^\d+\/\d+ attive$/)).toBeVisible();
    });
});

test.describe("tiers", () => {
    test("should name the tier and the change, send nothing and keep the old type when the type change is cancelled", async ({
        page,
        catalog,
    }) => {
        const tier = catalog.tier(TIER);
        const writes = recordApiWrites(page);

        await openRules(page);

        const select = tableRow(page, TIER).getByRole("combobox").nth(1);

        await select.click();
        await page.getByRole("option", { name: "Luce" }).click();

        const dialog = page.getByRole("alertdialog", { name: "Cambiare il tipo dello scaglione?" });

        await expect(dialog).toContainText(`${TIER}: Tipo Servizio da Gas a Luce.`);
        await expect(dialog).toContainText("I valori degli agenti per le regole non più compatibili con questo scaglione vengono eliminati.");
        await expect(dialog).toContainText(
            "vengono eliminate anche le righe Valore Fisso di tutti gli agenti, compresi i valori personalizzati e i valori padre.",
        );

        await dialog.getByRole("button", { name: "Annulla" }).click();

        await expect(dialog).toBeHidden();
        await expect(select).toHaveText("Gas");
        expect(writes).toEqual([]);
        expect((await catalog.current("scaglioni", tier.id)).tipo_servizio).toBe("gas");
    });

    test("should save the new type and say so when the type change is confirmed", async ({ page, catalog }) => {
        const tier = catalog.tier(TIER);

        await openRules(page);
        await tableRow(page, TIER).getByRole("combobox").nth(1).click();
        await page.getByRole("option", { name: "Luce" }).click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Conferma" }).click();

        await expect(page.getByText("Tipo aggiornato", { exact: true })).toBeVisible();
        await expect.poll(async () => (await catalog.current("scaglioni", tier.id)).tipo_servizio).toBe("luce");
        await expect(tableRow(page, TIER).getByRole("combobox").nth(1)).toHaveText("Luce");
    });

    test("should offer only the two user types when a tier's user type is opened", async ({ page }) => {
        await openRules(page);
        await tableRow(page, TIER).getByRole("combobox").first().click();

        await expect(page.getByRole("option")).toHaveText(["Residenziale", "Business"]);
    });
});

test.describe("preview after a configuration change", () => {
    async function loadPreview(page: Page, backend: Backend): Promise<TestAgent> {
        await backend.claimMonth(MONTH);

        const token = uniqueToken();
        const agent = await backend.createAgent({ name: `Agente ${token}`, ruleValues: { "Gettone Residenziale Standard": 6 } });

        await backend.importRows(MONTH, [
            { seller: agent.name, rule: "Gettone Residenziale Standard", amount: 100, customer: `Cliente ${token}`, orderId: 993_001 },
        ]);
        await page.goto("/");
        await openTab(page, "Provvigioni");
        await pickMonth(page, monthGroup(page), MONTH);
        await previewButton(page).click();
        await expect(overallTotal(page)).toHaveText("6,00 €");
        await expect(agentRow(page, agent)).toBeVisible();

        return agent;
    }

    test("should mark the preview outdated and block confirming when a rule's default value changes afterwards", async ({
        page,
        backend,
        catalog,
    }) => {
        const rule = catalog.rule(DEFAULT_RULE);

        await loadPreview(page, backend);
        await openTab(page, "Regole");
        await (await startEditingDefault(tableRow(page, rule.descrizione), "2,5")).press("Enter");
        await page.getByRole("alertdialog").getByRole("button", { name: "Conferma" }).click();
        await expect(page.getByText("Valore predefinito aggiornato", { exact: true })).toBeVisible();
        await openTab(page, "Provvigioni");

        await expect(page.getByRole("alert").filter({ hasText: STALE_MESSAGE })).toBeVisible();
        await expect(confirmButton(page)).toBeDisabled();
        await expect(confirmButton(page)).toHaveAccessibleDescription("Ricalcola l'anteprima prima di confermare.");
    });

    test("should mark the preview outdated and block confirming when an agent is saved afterwards", async ({ page, backend }) => {
        const agent = await loadPreview(page, backend);
        const dialog = await openAgent(page, agent);

        await dialog.getByRole("button", { name: "Salva" }).click();
        await expect(page.getByText("Agente aggiornato con successo", { exact: true })).toBeVisible();
        await openTab(page, "Provvigioni");

        await expect(page.getByRole("alert").filter({ hasText: STALE_MESSAGE })).toBeVisible();
        await expect(confirmButton(page)).toBeDisabled();
    });
});
