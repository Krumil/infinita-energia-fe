import { readFile } from "node:fs/promises";

import type { Download } from "@playwright/test";
import JSZip from "jszip";
import * as XLSX from "xlsx";

export type SheetRow = Array<string | number>;

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
