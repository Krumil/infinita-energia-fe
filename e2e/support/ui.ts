import { expect, type Download, type Locator, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

import type { SettlementRow, TestAgent } from "./backend";

// The month grid shows capitalised short names in the app language, such as "Gen" or "Jan".
export function monthButtonName(month: string, language = "it"): string {
    const label = new Date(2000, Number(month.slice(5, 7)) - 1, 1).toLocaleDateString(language, { month: "short" });

    return label.charAt(0).toLocaleUpperCase(language) + label.slice(1);
}

const WORKBOOK_HEADER = [
    "Piano Provvigionale",
    "Regola",
    "Prezzo",
    "Importo €",
    "Comp. Dal",
    "Comp. Al",
    "Scaglione Consumo",
    "POD/PDR",
    "Venditore",
    "Cliente",
    "CF/P.IVA",
    "Competenza Liquidazione",
    "ID Ordine",
];

export function monthLabel(month: string, language = "it"): string {
    const [year, monthNumber] = month.split("-").map(Number);

    return new Date(year, monthNumber - 1, 1).toLocaleDateString(language, { month: "long", year: "numeric" });
}

export function importCompetence(month: string): string {
    const [year, monthNumber] = month.split("-");

    return `${monthNumber}/${year}`;
}

export async function openTab(page: Page, name: string): Promise<void> {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name, exact: true }).click();
}

// The parent's name also shows in its children's rows, so the row is found by the statistics switch only it carries.
export async function openAgent(page: Page, agent: TestAgent): Promise<Locator> {
    await page.goto("/#agenti");
    await page.getByPlaceholder("Filtra...").fill(agent.name);

    const row = page.getByRole("row").filter({ has: page.getByRole("checkbox", { name: `Statistiche ${agent.name}`, exact: true }) });

    await row.getByRole("cell").first().click();

    const dialog = page.getByRole("dialog", { name: "Modifica Agente" });

    await expect(dialog).toBeVisible();

    return dialog;
}

export async function download(page: Page, button: Locator): Promise<Download> {
    const file = page.waitForEvent("download");

    await button.click();

    return file;
}

export async function pickMonth(page: Page, group: Locator, month: string): Promise<void> {
    const language = (await page.locator("html").getAttribute("lang")) ?? "it";
    // The trigger's accessible name is the selected month, such as "giugno 2031" or "June 2031".
    const trigger = group.getByRole("button", { name: /^[a-z]+ \d{4}$/i });

    await trigger.click();
    await page.getByRole("button", { name: monthButtonName(month, language), exact: true }).click();
    await expect(trigger).toHaveText(monthLabel(month, language));
}

export async function openSettlements(page: Page, month: string): Promise<Locator> {
    await openTab(page, "Ordini");
    await page.getByRole("button", { name: "Liquidazioni", exact: true }).click();

    // The dialog's title changes while a deletion is being confirmed, so it is found by role alone.
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByRole("heading", { name: "Gestisci liquidazioni" })).toBeVisible();
    await pickMonth(page, dialog.getByRole("group", { name: "Mese di competenza" }), month);

    // The month picker's popover is also a dialog, and it stays on the page until its exit animation ends.
    await expect(dialog).toHaveCount(1);

    return dialog;
}

// Builds the spreadsheet with the supplier's column headers, for the month the file settles.
export async function attachWorkbook(dialog: Locator, month: string, fileName: string, rows: SettlementRow[]): Promise<void> {
    const periodEnds = rows.map((row) => row.periodEnd ?? `28/${importCompetence(month)}`);

    const sheet = XLSX.utils.aoa_to_sheet([
        WORKBOOK_HEADER,
        ...rows.map((row, index) => [
            "E2E Piano",
            row.rule,
            1,
            row.amount,
            `01${periodEnds[index].slice(2)}`,
            periodEnds[index],
            "",
            `IT001E${String(index).padStart(8, "0")}`,
            row.seller,
            row.customer,
            "E2ETST80A01H501A",
            importCompetence(month),
            row.orderId ?? "",
        ]),
    ]);

    const workbook = XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(workbook, sheet, "Liquidazioni");

    const buffer: Buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

    await dialog.getByLabel("Clicca per caricare").setInputFiles({
        name: fileName,
        mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        buffer,
    });

    await expect(dialog.getByText(fileName)).toBeVisible();
}
