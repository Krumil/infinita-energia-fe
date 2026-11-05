import { uniqueToken, type RuleName } from "./support/backend";
import { expect, test } from "./support/test";
import { openAgent } from "./support/ui";

const STANDARD: RuleName = "Gettone Residenziale Standard";

test.describe("agents", () => {
    test("should keep the parent and email cleared after a reload when they are removed and saved", async ({ page, backend }) => {
        const token = uniqueToken();
        const mail = `figlio-${token.toLowerCase()}@example.com`;
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, parentName: parent.name, mail, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, child);

        await expect(dialog.getByLabel("Email")).toHaveValue(mail);
        await dialog.getByLabel("Email").clear();
        await dialog.getByRole("combobox", { name: parent.name }).click();
        await page.getByRole("option", { name: "Nessun agente padre" }).click();
        await expect(dialog.getByRole("combobox", { name: "Nessun agente padre" })).toBeVisible();
        await dialog.getByRole("button", { name: "Salva" }).click();

        await expect(page.getByText("Agente aggiornato con successo", { exact: true })).toBeVisible();

        await page.reload();

        const reopened = await openAgent(page, child);

        await expect(reopened.getByRole("combobox", { name: "Nessun agente padre" })).toBeVisible();
        await expect(reopened.getByLabel("Email")).toHaveValue("");
    });

    test("should describe the agent form in the dialog subtitle when the dialog opens", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, agent);

        await expect(dialog.getByText("Dati dell'agente e valori provvigionali", { exact: true })).toBeVisible();
        await expect(dialog.getByText("Visualizza tutti gli agenti di vendita e le loro tariffe provvigionali")).toHaveCount(0);
    });

    test("should select the highlighted option when Enter is pressed in the parent search", async ({ page, backend }) => {
        const token = uniqueToken();
        const parent = await backend.createAgent({ name: `Padre ${token}`, ruleValues: { [STANDARD]: 10 } });
        const child = await backend.createAgent({ name: `Figlio ${token}`, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, child);

        await dialog.getByRole("combobox", { name: "Nessun agente padre" }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill(parent.name);
        await page.keyboard.press("Enter");

        await expect(dialog.getByRole("combobox", { name: parent.name })).toBeVisible();

        await dialog.getByRole("combobox", { name: parent.name }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill("nessun");
        await page.keyboard.press("Enter");

        await expect(dialog.getByRole("combobox", { name: "Nessun agente padre" })).toBeVisible();
    });

    test("should show the clear option without the empty message when the search matches it", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });
        const dialog = await openAgent(page, agent);

        await dialog.getByRole("combobox", { name: "Nessun agente padre" }).click();
        await page.getByPlaceholder("Cerca agente padre...").fill("nessun");

        await expect(page.getByRole("option", { name: "Nessun agente padre", exact: true })).toBeVisible();
        await expect(page.getByText("Nessun agente padre trovato", { exact: true })).toHaveCount(0);

        await page.getByPlaceholder("Cerca agente padre...").fill("zzzz-no-match");

        await expect(page.getByText("Nessun agente padre trovato", { exact: true })).toBeVisible();
    });

    test("should open the agent dialog from the keyboard when Enter is pressed on the agent name", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });

        await page.goto("/#agenti");
        await page.getByPlaceholder("Filtra...").fill(agent.name);
        await page.getByRole("button", { name: agent.name, exact: true }).focus();
        await page.keyboard.press("Enter");

        await expect(page.getByRole("dialog", { name: "Modifica Agente" })).toBeVisible();
    });

    test("should return focus to the agent name when the edit dialog is closed", async ({ page, backend }) => {
        const agent = await backend.createAgent({ name: `Agente ${uniqueToken()}`, ruleValues: { [STANDARD]: 6 } });

        await page.goto("/#agenti");
        await page.getByPlaceholder("Filtra...").fill(agent.name);

        const name = page.getByRole("button", { name: agent.name, exact: true });

        await name.click();
        await expect(page.getByRole("dialog", { name: "Modifica Agente" })).toBeVisible();
        await page.keyboard.press("Escape");

        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(name).toBeFocused();
    });

    test("should return focus to the add button when the new agent dialog is closed", async ({ page }) => {
        await page.goto("/#agenti");

        const add = page.getByRole("button", { name: "Aggiungi Agente" });

        await add.click();
        await expect(page.getByRole("dialog", { name: "Aggiungi Agente" })).toBeVisible();
        await page.keyboard.press("Escape");

        await expect(page.getByRole("dialog")).toBeHidden();
        await expect(add).toBeFocused();
    });
});
