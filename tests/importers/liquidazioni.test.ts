import { afterEach, describe, expect, it, vi } from "vitest";
import * as XLSX from "xlsx";
import { parseSettlementsExcel } from "@/importers/liquidazioni";

afterEach(() => vi.unstubAllGlobals());

describe("parseLiquidazioniExcel", () => {
    it("should preserve field types when importing aliased spreadsheet columns", async () => {
        const workbook = XLSX.utils.book_new();

        const sheet = XLSX.utils.aoa_to_sheet([
            ["Importo €", "ID Ordine", "Comp. Dal", "COMPETENZA", "Cliente", "Quantità"],
            ["1.234,56", 42, "15/02/2026", "02/2026", "Acme", "invalid"],
        ]);

        XLSX.utils.book_append_sheet(workbook, sheet, "Liquidazioni");

        const binary: string = XLSX.write(workbook, { type: "binary", bookType: "xlsx" });

        vi.stubGlobal("FileReader", class {
            onload?: (event: { target: { result: string } }) => void;

            readAsBinaryString(): void {
                this.onload?.({ target: { result: binary } });
            }
        });

        const rows = await parseSettlementsExcel(new File([], "liquidazioni.xlsx"));

        expect(rows).toEqual([{
            importo_euro: 1234.56,
            id_ordine: 42,
            comp_dal: "2026-02-15",
            competenza_liquidazione: "2026-02-01",
            cliente: "Acme",
            quantita: undefined,
        }]);
    });
});
