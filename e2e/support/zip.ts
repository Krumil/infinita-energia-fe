import { readFile } from "node:fs/promises";

import { expect, type Download } from "@playwright/test";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export type SheetRow = Array<string | number>;

const HEADERS: SheetRow = ["Cliente", "CF/PIVA", "POD/PDR", "Comp. al", "Regola", "Importo Provvigione", "Venditore"];

const COMP_AL_COLUMN = HEADERS.indexOf("Comp. al");

// Reads the Provvigioni sheet as raw cell values, so numbers stay numbers.
function commissionSheet(data: Uint8Array, source: string): SheetRow[] {
    const book = XLSX.read(data, { type: "array" });
    const sheet = book.Sheets["Provvigioni"];

    if (!sheet) throw new Error(`${source} has no Provvigioni sheet, only: ${book.SheetNames.join(", ")}`);

    return XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, raw: true, defval: "" });
}

export async function readWorkbook(download: Download): Promise<SheetRow[]> {
    return commissionSheet(await readFile(await download.path()), download.suggestedFilename());
}

export async function readWorkbookZip(download: Download): Promise<Map<string, SheetRow[]>> {
    const zip = await JSZip.loadAsync(await readFile(await download.path()));
    const workbooks = new Map<string, SheetRow[]>();

    for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;

        workbooks.set(entry.name, commissionSheet(await entry.async("uint8array"), `${entry.name} in ${download.suggestedFilename()}`));
    }

    return workbooks;
}

// Excel stores a date as days since 1899-12-30, so a text cell holding the ISO date fails the comparison.
function excelSerial(isoDate: string | number): number {
    return Date.parse(`${isoDate}T00:00:00Z`) / 86_400_000 + 25_569;
}

// Data rows follow the server's order, which the tests don't pin down, so both sides sort them between the header and the total.
// Callers give Comp. al as the ISO date the backend returns.
export function expectWorkbook(rows: SheetRow[] | undefined, dataRows: SheetRow[], total: SheetRow): void {
    const sorted = (list: SheetRow[]): SheetRow[] => [...list].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const shown = rows ?? [];
    const expected = dataRows.map((row) => row.map((cell, column) => (column === COMP_AL_COLUMN ? excelSerial(cell) : cell)));

    expect([shown[0], ...sorted(shown.slice(1, -1)), shown.at(-1)]).toEqual([HEADERS, ...sorted(expected), total]);
}
