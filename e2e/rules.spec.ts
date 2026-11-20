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

// A rule with a customer type, so its switch is enabled.
const TOGGLED_RULE = "Gettone Business Standard";

const TIER = "0-1.000 Smc";

const MONTH = "2031-07";

const STALE_MESSAGE = "Liquidazioni, agenti, regole o scaglioni usati da questa anteprima sono cambiati dopo il calcolo. Ricalcola prima di salvare.";

async function openRules(page: Page): Promise<void> {
    await page.goto("/#regole");
    await expect(page.getByRole("heading", { name: "Regole", level: 2 })).toBeVisible();
}

async function openTiers(page: Page): Promise<void> {
    await openRules(page);
    // The tab name includes the tier count.
    await page.getByRole("tab", { name: /^Scaglioni/ }).click();
}

function tableRow(page: Page, description: string): Locator {
    return page.getByRole("row").filter({ hasText: description });
}

// Saved rule and tier edits show in the row itself. Only failures raise a notice.
async function expectNoSuccessNotice(page: Page): Promise<void> {
    await expect(page.getByText("Successo", { exact: true })).toHaveCount(0);
}

async function startEditingDefault(row: Locator, value: string): Promise<Locator> {
    await row.getByTitle("Clicca per modificare").click();

    const input = row.getByRole("textbox");

    await input.fill(value);

    return input;
}

test.describe("rules", () => {
    test("should save the default once without asking when Enter is pressed", async ({ page, catalog }) => {
        const rule = catalog.rule(DEFAULT_RULE);

        await openRules(page);

        const writes = recordApiWrites(page);

        await (await startEditingDefault(tableRow(page, DEFAULT_RULE), "2,5")).press("Enter");

        await expect(tableRow(page, DEFAULT_RULE).getByTitle("Clicca per modificare")).toContainText("2,50 €");
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect.poll(async () => (await catalog.current("regole", rule.id)).valore_default).toBe(2.5);
        // Enter and the blur that follows it both commit the edit, and only one of them may save.
        expect(writes.filter((write) => write.startsWith("start "))).toEqual([`start PUT /api/regole/${rule.id}`]);
        await expectNoSuccessNotice(page);

        await page.reload();

        await expect(tableRow(page, DEFAULT_RULE).getByTitle("Clicca per modificare")).toContainText("2,50 €");
    });

    for (const [value, condition] of [
        ["abc", "not a number"],
        ["-1", "negative"],
    ]) {
        test(`should show an error and change nothing when the default value is ${condition}`, async ({ page, catalog }) => {
            const rule = catalog.rule(DEFAULT_RULE);
            const writes = recordApiWrites(page);

            await openRules(page);

            const row = tableRow(page, DEFAULT_RULE);

            await (await startEditingDefault(row, value)).press("Enter");

            await expect(page.getByText("Inserisci un numero non negativo, per esempio 2,50.", { exact: true })).toBeVisible();
            await expect(page.getByRole("alertdialog")).toHaveCount(0);
            await expect(row.getByTitle("Clicca per modificare")).toContainText("1,00 €");
            expect(writes).toEqual([]);
            expect((await catalog.current("regole", rule.id)).valore_default).toBe(1);
        });
    }

    test("should save the type without asking when a rule's empty service type is set", async ({ page, catalog }) => {
        const rule = catalog.rule(UNTYPED_RULE);

        await openRules(page);

        const serviceType = tableRow(page, UNTYPED_RULE).getByRole("combobox").nth(1);

        await serviceType.click();
        await page.getByRole("option", { name: "Gas" }).click();

        await expect(serviceType).toHaveText("Gas");
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect.poll(async () => (await catalog.current("regole", rule.id)).tipo_servizio).toBe("gas");
        await expectNoSuccessNotice(page);
    });

    test("should name the old and new type in the confirm dialog and save only after confirming when a rule's user type is overwritten", async ({
        page,
        catalog,
    }) => {
        const rule = catalog.rule(TOGGLED_RULE);
        const userType = tableRow(page, TOGGLED_RULE).getByRole("combobox").first();
        const dialog = page.getByRole("alertdialog", { name: "Conferma Modifica" });

        await openRules(page);
        await userType.click();
        await page.getByRole("option", { name: "Residenziale" }).click();

        await expect(dialog).toContainText(`${TOGGLED_RULE}: Tipo Utenza da Business a Residenziale.`);
        expect((await catalog.current("regole", rule.id)).tipo_utenza).toBe("business");

        await dialog.getByRole("button", { name: "Conferma" }).click();

        await expect(userType).toHaveText("Residenziale");
        await expect.poll(async () => (await catalog.current("regole", rule.id)).tipo_utenza).toBe("residenziale");
        await expectNoSuccessNotice(page);
    });

    test("should keep asking to confirm a type overwrite after a cancel and stop asking after a confirm when Non mostrare più is ticked", async ({
        page,
        catalog,
    }) => {
        const rule = catalog.rule(TOGGLED_RULE);
        const userType = tableRow(page, TOGGLED_RULE).getByRole("combobox").first();
        const dialog = page.getByRole("alertdialog", { name: "Conferma Modifica" });
        const savedType = async (): Promise<string | null> => (await catalog.current("regole", rule.id)).tipo_utenza;

        const pick = async (name: string): Promise<void> => {
            await userType.click();
            await page.getByRole("option", { name }).click();
        };

        await openRules(page);
        await pick("Residenziale");
        await dialog.getByRole("checkbox", { name: "Non mostrare più" }).check();
        await dialog.getByRole("button", { name: "Annulla" }).click();
        await expect(dialog).toBeHidden();
        await expect(userType).toHaveText("Business");

        await pick("Residenziale");

        await expect(dialog).toBeVisible();
        expect(await savedType()).toBe("business");

        await dialog.getByRole("checkbox", { name: "Non mostrare più" }).check();
        await dialog.getByRole("button", { name: "Conferma" }).click();
        await expect.poll(savedType).toBe("residenziale");

        await pick("Business");

        await expect(userType).toHaveText("Business");
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect.poll(savedType).toBe("business");

        // The choice lives in the browser's storage, so it outlasts a reload.
        await page.reload();
        await pick("Residenziale");

        await expect(userType).toHaveText("Residenziale");
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect.poll(savedType).toBe("residenziale");
    });

    test("should switch a rule off without a success notice when its switch is clicked", async ({ page, catalog }) => {
        const rule = catalog.rule(TOGGLED_RULE);

        await openRules(page);

        const toggle = tableRow(page, TOGGLED_RULE).getByRole("switch");
        const saved = page.waitForResponse((response) => response.request().method() === "PUT" && response.url().endsWith(`/api/regole/${rule.id}`));

        await toggle.click();
        await saved;

        await expect(toggle).not.toBeChecked();
        expect((await catalog.current("regole", rule.id)).utilizzato).toBe(false);
        await expectNoSuccessNotice(page);
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
});

test.describe("tiers", () => {
    test("should save the new type without asking and without a success notice when a tier's type is changed", async ({ page, catalog }) => {
        const tier = catalog.tier(TIER);

        await openTiers(page);
        await tableRow(page, TIER).getByRole("combobox").nth(1).click();
        await page.getByRole("option", { name: "Luce" }).click();

        await expect(tableRow(page, TIER).getByRole("combobox").nth(1)).toHaveText("Luce");
        await expect(page.getByRole("alertdialog")).toHaveCount(0);
        await expect.poll(async () => (await catalog.current("scaglioni", tier.id)).tipo_servizio).toBe("luce");
        await expectNoSuccessNotice(page);
    });

    test("should offer only the two user types when a tier's user type is opened", async ({ page }) => {
        await openTiers(page);
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

    test("should mark the preview outdated and block confirming when a rule's default value changes or an agent is saved afterwards", async ({
        page,
        backend,
        catalog,
    }) => {
        const rule = catalog.rule(DEFAULT_RULE);
        const stale = page.getByRole("alert").filter({ hasText: STALE_MESSAGE });
        const agent = await loadPreview(page, backend);

        await openTab(page, "Regole");
        await (await startEditingDefault(tableRow(page, rule.descrizione), "2,5")).press("Enter");
        await expect.poll(async () => (await catalog.current("regole", rule.id)).valore_default).toBe(2.5);
        await openTab(page, "Provvigioni");

        await expect(stale).toBeVisible();
        await expect(confirmButton(page)).toBeDisabled();
        await expect(confirmButton(page)).toHaveAccessibleDescription("Ricalcola l'anteprima prima di confermare.");

        await stale.getByRole("button", { name: "Ricalcola" }).click();
        await expect(stale).toBeHidden();
        await expect(confirmButton(page)).toBeEnabled();

        const dialog = await openAgent(page, agent);

        await dialog.getByRole("button", { name: "Salva" }).click();
        await expect(page.getByText("Agente aggiornato con successo", { exact: true })).toBeVisible();
        await openTab(page, "Provvigioni");

        await expect(stale).toBeVisible();
        await expect(confirmButton(page)).toBeDisabled();
    });
});
