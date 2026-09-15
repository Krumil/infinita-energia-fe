import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/csvUtils";

describe("toCsv", () => {
    it("should format numeric cells without rewriting numeric strings", () => {
        expect(toCsv(["Number", "Text"], [[1.25, "1.25"], [null, 'a;"b']], { delimiter: ";", decimal: "," }))
            .toBe('Number;Text\r\n1,25;1.25\r\n;"a;""b"');
    });
});
