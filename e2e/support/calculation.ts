import { expect, type Locator, type Page } from "@playwright/test";

import type { TestAgent } from "./backend";

// Locators for the Provvigioni tab, in Italian, found the way an operator reads the page.

export function monthGroup(page: Page): Locator {
    return page.getByRole("group", { name: "Competenza", exact: true });
}

export function previewButton(page: Page): Locator {
    return page.getByRole("button", { name: "Anteprima", exact: true });
}

export function confirmButton(page: Page): Locator {
    return page.getByRole("button", { name: "Conferma provvigioni" });
}

export function agentRow(page: Page, agent: TestAgent): Locator {
    return page.getByRole("row").filter({ has: page.getByRole("button", { name: agent.name, exact: true }) });
}

export function agentTotal(page: Page, agent: TestAgent): Locator {
    return agentRow(page, agent).getByRole("cell").nth(4);
}

export function overallTotal(page: Page): Locator {
    return page.getByRole("row").filter({ hasText: /^Totale/ }).getByRole("cell").nth(2);
}

export function includeBox(page: Page, agent: TestAgent): Locator {
    return page.getByRole("checkbox", { name: `Includi ${agent.name}`, exact: true });
}

export function amountInputs(page: Page, customer: string): Locator {
    return page.getByRole("textbox", { name: `Provvigione di ${customer}`, exact: true });
}

// Expanded details sit in a table nested inside the summary row, so a single record is a row with no rows inside it.
export function recordRow(scope: Page | Locator, text: string): Locator {
    return scope.getByRole("row").filter({ hasText: text }).filter({ hasNot: scope.getByRole("row") });
}

export function outcome(page: Page): Locator {
    return page.getByRole("region", { name: "Esito del salvataggio" });
}

export function outcomeRow(page: Page, agent: TestAgent): Locator {
    return outcome(page).getByRole("row").filter({ has: page.getByRole("cell", { name: agent.name, exact: true }) });
}

export async function expectAmounts(inputs: Locator, values: string[]): Promise<void> {
    await expect(inputs).toHaveCount(values.length);

    for (const [index, value] of values.entries()) await expect(inputs.nth(index)).toHaveValue(value);
}

export async function expand(page: Page, agent: TestAgent): Promise<void> {
    await page.getByRole("button", { name: agent.name, exact: true }).click();
}
