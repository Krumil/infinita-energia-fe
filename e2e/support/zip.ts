import { readFile } from "node:fs/promises";

import { expect, type Download } from "@playwright/test";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export type SheetRow = Array<string | number>;

const HEADERS: SheetRow = ["Cliente", "CF/PIVA", "POD/PDR", "Comp. al", "Regola", "Importo Provvigione", "Venditore"];

// Opens every workbook in a downloaded ZIP and reads its Provvigioni sheet as raw cell values, so numbers stay numbers.
export async function readWorkbookZip(download: Download): Promise<Map<string, SheetRow[]>> {
    const zip = await JSZip.loadAsync(await readFile(await download.path()));
    const workbooks = new Map<string, SheetRow[]>();

    for (const entry of Object.values(zip.files)) {
        if (entry.dir) continue;

        const book = XLSX.read(await entry.async("uint8array"), { type: "array" });
        const sheet = book.Sheets["Provvigioni"];

        if (!sheet) throw new Error(`${entry.name} in ${download.suggestedFilename()} has no Provvigioni sheet, only: ${book.SheetNames.join(", ")}`);

        workbooks.set(entry.name, XLSX.utils.sheet_to_json<SheetRow>(sheet, { header: 1, raw: true, defval: "" }));
    }

    return workbooks;
}

// Data rows follow the server's order, which the tests don't pin down, so both sides sort them between the header and the total.
export function expectWorkbook(rows: SheetRow[] | undefined, dataRows: SheetRow[], total: SheetRow): void {
    const sorted = (list: SheetRow[]): SheetRow[] => [...list].sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)));
    const shown = rows ?? [];

    expect([shown[0], ...sorted(shown.slice(1, -1)), shown.at(-1)]).toEqual([HEADERS, ...sorted(dataRows), total]);
}
