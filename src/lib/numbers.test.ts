import { describe, expect, it } from "vitest";
import { parseEuroNumber } from "./numbers";

describe("parseEuroNumber", () => {
    it("returns finite numbers unchanged", () => {
        expect(parseEuroNumber(1234.56)).toBe(1234.56);
    });

    it("parses Italian decimal notation", () => {
        expect(parseEuroNumber("1234,56")).toBe(1234.56);
    });

    it("parses Italian thousands separators", () => {
        expect(parseEuroNumber("1.234,56")).toBe(1234.56);
        expect(parseEuroNumber("12.345")).toBe(12345);
    });

    it("accepts raw dot-decimal values from spreadsheet pipelines", () => {
        expect(parseEuroNumber("1234.56")).toBe(1234.56);
    });

    it("parses English thousands separators with dot decimals", () => {
        expect(parseEuroNumber("1,234.56")).toBe(1234.56);
    });

    it("ignores euro symbols and spaces", () => {
        expect(parseEuroNumber("€ 1.234,56")).toBe(1234.56);
        expect(parseEuroNumber("1 234,56")).toBe(1234.56);
    });

    it("supports negative values", () => {
        expect(parseEuroNumber("-1.234,56")).toBe(-1234.56);
    });

    it("rejects malformed values", () => {
        expect(parseEuroNumber("1,234,56")).toBeUndefined();
        expect(parseEuroNumber("abc")).toBeUndefined();
        expect(parseEuroNumber("")).toBeUndefined();
    });
});
