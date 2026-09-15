import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { calculateCommissions, getUnpaidCalculation } from "@/api/calcolo";

const fetchMock = vi.fn<typeof fetch>();

function response(body: string, status = 200): Response {
    return new Response(body, { status, headers: { "Content-Type": "application/json" } });
}

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => vi.unstubAllGlobals());

describe("calcolo API", () => {
    it("should validate a complete commission result while preserving sanitized null amounts", async () => {
        const body = '{"Acme":{"totale_provvigione":10,"dati_provvigione":[{"cf_piva":"CF","cliente":"Client","comp_al":"2026-09-01","importo_provvigione":NaN,"pod_pdr":"POD","regola":"Rule","venditore":"Acme"}]}}';
        fetchMock.mockResolvedValue(response(body));

        const result = await calculateCommissions([]);

        expect(result.Acme).toEqual({
            totale_provvigione: 10,
            dati_provvigione: [{ cf_piva: "CF", cliente: "Client", comp_al: "2026-09-01", importo_provvigione: null, pod_pdr: "POD", regola: "Rule", venditore: "Acme" }],
        });
    });

    it("should retain non-pagati defaults when result fields are null", async () => {
        fetchMock.mockResolvedValue(response(JSON.stringify({ totale_provvigione: null, dati_provvigione: null })));

        await expect(getUnpaidCalculation(4, ["2026-09"])).resolves.toEqual({ kind: "data", totale_provvigione: 0, dati_provvigione: [] });
    });

    it("should reject a malformed commission result after sanitizing non-finite values", async () => {
        fetchMock.mockResolvedValue(response('{"Agente":{"totale_provvigione":NaN,"dati_provvigione":[{"cf_piva":"CF"}]}}'));

        await expect(calculateCommissions([])).rejects.toThrow();
    });

    it("should preserve the explicit empty non-pagati response", async () => {
        fetchMock.mockResolvedValue(response(JSON.stringify({ data: {}, message: "Nessuna provvigione" })));

        await expect(getUnpaidCalculation(4, ["2026-09"])).resolves.toEqual({ kind: "empty", message: "Nessuna provvigione" });
    });

    it("should reject a malformed non-pagati success response", async () => {
        fetchMock.mockResolvedValue(response(JSON.stringify({ totale_provvigione: "invalid" })));

        await expect(getUnpaidCalculation(4, ["2026-09"])).rejects.toThrow();
    });

    it("should retain the HTTP fallback when an error body is not JSON", async () => {
        fetchMock.mockResolvedValue(response("not JSON", 502));

        await expect(getUnpaidCalculation(4, ["2026-09"])).rejects.toMatchObject({ status: 502, message: "HTTP 502: " });
    });
});
