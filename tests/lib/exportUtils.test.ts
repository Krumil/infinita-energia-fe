import { describe, expect, it } from "vitest";
import * as XLSX from "xlsx";
import { createSellerExcel } from "@/lib/exportUtils";

describe("createSellerExcel", () => {
    it("should return workbook bytes when exporting seller commissions", async () => {
        const bytes = await createSellerExcel("Acme", [], 1234.56);
        const workbook = XLSX.read(bytes, { type: "array" });
        const rows = XLSX.utils.sheet_to_json<string[]>(workbook.Sheets.Provvigioni, { header: 1 });

        expect(rows[1]).toEqual(["TOTALE", "", "", "", "", 1234.56, "Acme"]);
    });
});
