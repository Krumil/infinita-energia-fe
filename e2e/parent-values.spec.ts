import type { Locator, Page } from "@playwright/test";

import { uniqueToken, type Backend, type RuleName, type TestAgent } from "./support/backend";
import { expect, test } from "./support/test";
import { openAgent } from "./support/ui";

const STANDARD: RuleName = "Gettone Residenziale Standard";

const RENEWAL: RuleName = "Rinnovo Residenziale";

const NO_PARENT_ERROR = "L'agente non ha un agente padre: nessuna quota da configurare.";

function linkedNotice(parent: TestAgent): string {
    return `${parent.name} è ora l'agente padre. Controlla i valori padre, o precompilali da una percentuale, e premi Salva: su una regola con valore 0 il padre non matura nulla.`;
}

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

    test("should keep a negative agent value after a reload when it is saved", async ({ page, backend }) => {
        const { child } = await createFamily(backend);
        const agentValue = (dialog: Locator): Locator => dialog.getByRole("tabpanel", { name: "Valori agente" }).getByRole("textbox");
        const dialog = await openAgent(page, child);

        await dialog.getByRole("tab", { name: "Valori agente" }).click();
        await dialog.getByRole("button", { name: STANDARD, exact: true }).click();
        await agentValue(dialog).fill("-2");

        await expect(agentValue(dialog)).toHaveAttribute("aria-invalid", "false");

        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(dialog).toBeHidden();

        await page.reload();

        const reopened = await openAgent(page, child);

        await reopened.getByRole("tab", { name: "Valori agente" }).click();
        await reopened.getByRole("button", { name: STANDARD, exact: true }).click();
        await expect(agentValue(reopened)).toHaveValue("-2");
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

    test("should open the parent values with a notice when a parent is linked to an agent that had none", async ({ page, backend }) => {
        const token = uniqueToken();
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, child);

        await dialog.getByRole("combobox", { name: "Nessun agente padre" }).click();
        await page.getByRole("option", { name: parent.name, exact: true }).click();
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(page.getByText("Agente aggiornato con successo", { exact: true })).toBeVisible();
        await expect(dialog.getByRole("tab", { name: "Valori padre" })).toHaveAttribute("aria-selected", "true");
        await expect(dialog.getByRole("status").filter({ hasText: parent.name })).toHaveText(linkedNotice(parent));

        await parentValue(dialog, STANDARD).fill("2");
        await dialog.getByRole("button", { name: "Salva" }).click();
        await expect(dialog).toBeHidden();

        await page.reload();

        const reopened = await openParentValues(page, child);

        await expect(parentValue(reopened, STANDARD)).toHaveValue("2");
        await expect(reopened.getByText(linkedNotice(parent), { exact: true })).toHaveCount(0);
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
});
