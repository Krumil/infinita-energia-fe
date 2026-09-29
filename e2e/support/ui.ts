import { expect, type Locator, type Page } from "@playwright/test";
import * as XLSX from "xlsx";

import type { SettlementRow } from "./backend";

const MONTH_BUTTONS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

const WORKBOOK_HEADER = [
    "Piano Provvigionale",
    "Regola",
    "Prezzo",
    "Importo €",
    "Comp. Al",
    "Scaglione Consumo",
    "POD/PDR",
    "Venditore",
    "Cliente",
    "CF/P.IVA",
    "Competenza Liquidazione",
    "ID Ordine",
];

// The month picker always formats its trigger in Italian, whatever the app language.
export function monthLabel(month: string): string {
    const [year, monthNumber] = month.split("-").map(Number);

    return new Date(year, monthNumber - 1, 1).toLocaleDateString("it-IT", { month: "long", year: "numeric" });
}

export function importCompetence(month: string): string {
    const [year, monthNumber] = month.split("-");

    return `${monthNumber}/${year}`;
}

export async function openTab(page: Page, name: string): Promise<void> {
    await page.getByRole("navigation", { name: "Main navigation" }).getByRole("button", { name, exact: true }).click();
}

export async function pickMonth(page: Page, group: Locator, month: string): Promise<void> {
    // The trigger's accessible name is the selected month, such as "giugno 2031".
    const trigger = group.getByRole("button", { name: /^[a-z]+ \d{4}$/ });

    await trigger.click();
    await page.getByRole("button", { name: MONTH_BUTTONS[Number(month.slice(5, 7)) - 1], exact: true }).click();
    await expect(trigger).toHaveText(monthLabel(month));
}

export async function openSettlements(page: Page, month: string): Promise<Locator> {
    await openTab(page, "Ordini");
    await page.getByRole("button", { name: "Liquidazioni", exact: true }).click();

    // The dialog's title changes while a deletion is being confirmed, so it is found by role alone.
    const dialog = page.getByRole("dialog");

    await expect(dialog.getByRole("heading", { name: "Gestisci liquidazioni" })).toBeVisible();
    await pickMonth(page, dialog.getByRole("group", { name: "Mese di competenza" }), month);

    return dialog;
}

// Builds the spreadsheet with the supplier's column headers, for the same month the dialog imports into.
export async function attachWorkbook(dialog: Locator, month: string, fileName: string, rows: SettlementRow[]): Promise<void> {
    const sheet = XLSX.utils.aoa_to_sheet([
        WORKBOOK_HEADER,
        ...rows.map((row, index) => [
            "E2E Piano",
            row.rule,
            1,
            row.amount,
            `28/${importCompetence(month)}`,
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
