import type { Locator, Page } from "@playwright/test";

import { uniqueToken, type Backend, type RuleName, type TestAgent } from "./support/backend";
import { expect, test } from "./support/test";
import { openAgent } from "./support/ui";

const STANDARD: RuleName = "Gettone Residenziale Standard";

const RENEWAL: RuleName = "Rinnovo Residenziale";

const NO_PARENT_ERROR = "L'agente non ha un agente padre: nessuna quota da configurare.";

interface Family {
    parent: TestAgent;
    child: TestAgent;
}

async function createFamily(backend: Backend): Promise<Family> {
    const token = uniqueToken();
    const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
    const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, ruleValues: { [STANDARD]: 6, [RENEWAL]: 4 } });

    return { parent, child };
}

async function openParentValues(page: Page, agent: TestAgent): Promise<Locator> {
    const dialog = await openAgent(page, agent);

    await dialog.getByRole("tab", { name: "Valori padre" }).click();

    return dialog;
}

function parentValue(dialog: Locator, rule: RuleName): Locator {
    return dialog.getByRole("textbox", { name: `Valore padre ${rule} Valore Fisso`, exact: true });
}

test.describe("parent values", () => {
    test("should explain that a parent has to be saved when the saved agent has no parent", async ({ page, backend }) => {
        const { parent } = await createFamily(backend);
        const dialog = await openParentValues(page, parent);

        await expect(dialog.getByRole("tabpanel", { name: "Valori padre" })).toHaveText("Questo agente non ha un agente padre. Selezionane uno e salva per configurare i valori padre.");
        await expect(dialog.getByRole("textbox", { name: /^Valore padre / })).toHaveCount(0);
    });

    test("should keep an edited parent value after a reload when it is saved", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);

        const standardRow = dialog.getByRole("row").filter({ has: page.getByRole("textbox", { name: `Valore padre ${STANDARD} Valore Fisso` }) });

        await expect(standardRow).toContainText("6,00");
        await expect(parentValue(dialog, STANDARD)).toHaveValue("0");

        await parentValue(dialog, STANDARD).fill("2,5");

        // The edit lives outside the tab, so switching tabs before saving must not drop it.
        await dialog.getByRole("tab", { name: "Valori agente" }).click();
        await dialog.getByRole("tab", { name: "Valori padre" }).click();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("2,5");

        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(dialog).toBeHidden();
        await expect(page.getByText("Agente aggiornato con successo", { exact: true })).toBeVisible();

        await page.reload();

        const reopened = await openParentValues(page, child);

        await expect(parentValue(reopened, STANDARD)).toHaveValue("2,5");
        await expect(parentValue(reopened, RENEWAL)).toHaveValue("0");
    });

    test("should discard the prefilled values when the dialog is cancelled", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);

        await dialog.getByLabel("Percentuale").fill("50");
        await dialog.getByRole("button", { name: "Precompila da percentuale" }).click();

        const confirm = page.getByRole("alertdialog", { name: "Sovrascrivere i valori padre?" });

        await expect(confirm).toContainText("Niente viene salvato finché non premi Salva");
        await confirm.getByRole("button", { name: "Precompila" }).click();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("3");
        await expect(parentValue(dialog, RENEWAL)).toHaveValue("2");

        await dialog.getByRole("button", { name: "Annulla" }).click();
        await expect(dialog).toBeHidden();

        const reopened = await openParentValues(page, child);

        await expect(parentValue(reopened, STANDARD)).toHaveValue("0");
        await expect(parentValue(reopened, RENEWAL)).toHaveValue("0");
    });

    test("should overwrite unsaved parent values and keep them after a reload when a prefill is confirmed and saved", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);

        await parentValue(dialog, STANDARD).fill("9");
        await dialog.getByLabel("Percentuale").fill("50");
        await dialog.getByRole("button", { name: "Precompila da percentuale" }).click();

        const confirm = page.getByRole("alertdialog", { name: "Sovrascrivere i valori padre?" });

        await confirm.getByRole("button", { name: "Annulla" }).click();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("9");

        await dialog.getByRole("button", { name: "Precompila da percentuale" }).click();
        await confirm.getByRole("button", { name: "Precompila" }).click();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("3");
        await expect(dialog.getByRole("status").filter({ hasText: "Premi Salva per mantenerli" })).toBeVisible();

        await dialog.getByRole("button", { name: "Salva" }).click();
        await expect(dialog).toBeHidden();

        await page.reload();

        const reopened = await openParentValues(page, child);

        await expect(parentValue(reopened, STANDARD)).toHaveValue("3");
        await expect(parentValue(reopened, RENEWAL)).toHaveValue("2");
    });

    test("should round half away from zero to the cent when a prefill is saved", async ({ page, backend }) => {
        const token = uniqueToken();
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, ruleValues: { [STANDARD]: 1.15, [RENEWAL]: 0.25 } });
        const dialog = await openParentValues(page, child);

        await dialog.getByLabel("Percentuale").fill("50");
        await dialog.getByRole("button", { name: "Precompila da percentuale" }).click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Precompila" }).click();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("0,58");
        await expect(parentValue(dialog, RENEWAL)).toHaveValue("0,13");

        await dialog.getByRole("button", { name: "Salva" }).click();
        await expect(dialog).toBeHidden();

        await page.reload();

        const reopened = await openParentValues(page, child);

        await expect(parentValue(reopened, STANDARD)).toHaveValue("0,58");
        await expect(parentValue(reopened, RENEWAL)).toHaveValue("0,13");
    });

    test("should show and prefill from the unsaved agent value when it was edited in the agent values tab", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openAgent(page, child);

        await dialog.getByRole("button", { name: STANDARD, exact: true }).click();
        await dialog.getByRole("tabpanel", { name: "Valori agente" }).getByRole("textbox").fill("8");
        await dialog.getByRole("tab", { name: "Valori padre" }).click();

        const row = dialog.getByRole("row").filter({ has: page.getByRole("textbox", { name: `Valore padre ${STANDARD} Valore Fisso` }) });

        await expect(row).toContainText("8,00");

        await dialog.getByLabel("Percentuale").fill("50");
        await dialog.getByRole("button", { name: "Precompila da percentuale" }).click();
        await page.getByRole("alertdialog").getByRole("button", { name: "Precompila" }).click();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("4");
    });

    test("should mark invalid values and refuse to prefill when a value is negative or not a number", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);
        const save = dialog.getByRole("button", { name: "Salva" });
        const border = (locator: Locator): Promise<string> => locator.evaluate((element) => getComputedStyle(element).borderTopColor);
        const validBorder = await border(parentValue(dialog, RENEWAL));

        await parentValue(dialog, STANDARD).fill("-1");
        await expect(parentValue(dialog, STANDARD)).toHaveAttribute("aria-invalid", "true");
        await expect(parentValue(dialog, STANDARD)).not.toHaveCSS("border-top-color", validBorder);
        await expect(dialog.getByRole("tab", { name: /^Valori padre/ })).toContainText("Non validi: 1");

        await parentValue(dialog, STANDARD).fill("abc");
        await expect(dialog.getByRole("tab", { name: /^Valori padre/ })).toContainText("Non validi: 1");

        await parentValue(dialog, STANDARD).fill("1,5");
        await expect(dialog.getByRole("tab", { name: /^Valori padre/ })).not.toContainText("Non validi");
        await expect(save).toBeEnabled();

        await dialog.getByLabel("Percentuale").fill("150");
        await expect(dialog.getByLabel("Percentuale")).toHaveAttribute("aria-invalid", "true");
        await expect(dialog.getByRole("button", { name: "Precompila da percentuale" })).toBeDisabled();
    });

    test("should focus the first invalid parent value instead of saving when Save is pressed with an error", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);

        await parentValue(dialog, RENEWAL).fill("abc");
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(parentValue(dialog, RENEWAL)).toBeFocused();
        await expect(dialog).toBeVisible();
    });

    test("should switch to the agent values tab and focus the invalid value when Save is pressed with an error there", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openAgent(page, child);

        await dialog.getByRole("button", { name: STANDARD, exact: true }).click();

        const agentValue = dialog.getByRole("tabpanel", { name: "Valori agente" }).getByRole("textbox");

        await expect(agentValue).toHaveAttribute("aria-invalid", "false");
        await agentValue.fill("abc");
        await expect(agentValue).toHaveAttribute("aria-invalid", "true");
        await dialog.getByRole("tab", { name: "Valori padre" }).click();
        await expect(dialog.getByRole("tab", { name: /^Valori agente/ })).toContainText("Non validi: 1");

        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(dialog.getByRole("tab", { name: /^Valori agente/ })).toHaveAttribute("aria-selected", "true");
        await expect(agentValue).toBeFocused();
        await expect(dialog).toBeVisible();
    });

    test("should format parent values with a comma when they have decimals", async ({ page, backend }) => {
        const token = uniqueToken();
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, parentShare: 25, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openParentValues(page, child);

        await expect(parentValue(dialog, STANDARD)).toHaveValue("1,5");
    });

    test("should explain that the new parent has to be saved when another parent is selected", async ({ page, backend }) => {
        const { parent, child } = await createFamily(backend);
        const other = await backend.createAgent({ name: `Altro ${uniqueToken()}`, ruleValues: { [STANDARD]: 1 } });
        const dialog = await openParentValues(page, child);

        await expect(parentValue(dialog, STANDARD)).toBeVisible();

        await dialog.getByRole("combobox", { name: parent.name }).click();
        await page.getByRole("option", { name: other.name, exact: true }).click();

        await expect(dialog.getByRole("tabpanel", { name: "Valori padre" })).toHaveText("Salva il nuovo padre per modificare i suoi valori");
        await expect(dialog.getByRole("textbox", { name: /^Valore padre / })).toHaveCount(0);
    });

    test("should keep the table header in view when the dialog is scrolled to the last row", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);
        const inputs = dialog.getByRole("textbox", { name: /^Valore padre / });

        await expect(inputs.first()).toBeVisible();
        await inputs.last().scrollIntoViewIfNeeded();

        const header = dialog.getByRole("columnheader", { name: "Valore padre", exact: true });
        const box = await dialog.boundingBox();
        const headerBox = await header.boundingBox();

        expect(box).not.toBeNull();
        expect(headerBox).not.toBeNull();
        expect(headerBox?.y).toBeGreaterThanOrEqual((box?.y ?? 0) + 60);
        expect(headerBox?.y).toBeLessThan((box?.y ?? 0) + (box?.height ?? 0));
    });

    test("should keep the dialog height when switching to a shorter tab", async ({ page, backend }) => {
        const { parent } = await createFamily(backend);
        const dialog = await openAgent(page, parent);

        await expect(dialog.getByRole("tabpanel", { name: "Valori agente" }).getByRole("button").first()).toBeVisible();

        const agentTabHeight = (await dialog.boundingBox())?.height;

        await dialog.getByRole("tab", { name: "Valori padre" }).click();
        await expect(dialog.getByRole("tabpanel", { name: "Valori padre" })).toBeVisible();

        expect((await dialog.boundingBox())?.height).toBe(agentTabHeight);
    });

    test("should show the server's reason when the parent is removed before the values load", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const agentDialog = await openAgent(page, child);

        await backend.removeParent(child);
        await agentDialog.getByRole("tab", { name: "Valori padre" }).click();

        await expect(agentDialog.getByRole("alert")).toHaveText(NO_PARENT_ERROR);
    });

    test("should keep the edits and show the server's reason when saving fails", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);

        await expect(parentValue(dialog, STANDARD)).toHaveValue("0");
        await backend.removeParent(child);

        await parentValue(dialog, STANDARD).fill("4");
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(dialog.getByRole("alert")).toHaveText(NO_PARENT_ERROR);
        await expect(dialog).toBeVisible();
        await expect(parentValue(dialog, STANDARD)).toHaveValue("4");
    });

    test("should not offer the agent's descendants as its parent when a parent is chosen", async ({ page, backend }) => {
        const { parent, child } = await createFamily(backend);
        const grandchild = await backend.createAgent({ name: `Nipote ${uniqueToken()}`, parentName: child.name, ruleValues: { [STANDARD]: 1 } });
        const other = await backend.createAgent({ name: `Altro ${uniqueToken()}`, ruleValues: { [STANDARD]: 1 } });
        const dialog = await openAgent(page, parent);

        await dialog.getByRole("combobox", { name: "Nessun agente padre" }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill(other.name);
        await expect(page.getByRole("option", { name: other.name, exact: true })).toBeVisible();

        for (const excluded of [parent, child, grandchild]) {
            await page.getByPlaceholder("Cerca agente padre...").fill(excluded.name);
            await expect(page.getByText("Nessun agente padre trovato", { exact: true })).toBeVisible();
        }
    });

    test("should return focus to the prefill button when the confirmation is closed", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const dialog = await openParentValues(page, child);
        const prefill = dialog.getByRole("button", { name: "Precompila da percentuale" });
        const confirm = page.getByRole("alertdialog", { name: "Sovrascrivere i valori padre?" });

        await dialog.getByLabel("Percentuale").fill("50");

        await prefill.click();
        await confirm.getByRole("button", { name: "Annulla" }).click();
        await expect(confirm).toBeHidden();
        await expect(prefill).toBeFocused();

        await prefill.click();
        await confirm.getByRole("button", { name: "Precompila" }).click();
        await expect(confirm).toBeHidden();
        await expect(prefill).toBeFocused();
    });
});
