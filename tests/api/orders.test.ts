import { afterEach, describe, expect, it, vi } from "vitest";
import { excludeOrder, getExcludedOrders, restoreOrder } from "@/api/orders";

interface OrderResponseBody {
    id?: number;
    id_riga_ordine?: string;
    motivo?: string;
    data_esclusione?: null;
    error?: string;
}

function mockResponse(body: OrderResponseBody | undefined, status = 200): Response {
    return new Response(body === undefined ? undefined : JSON.stringify(body), {
        status,
        headers: { "Content-Type": "application/json" },
    });
}

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("order exclusion API", () => {
    it("should encode the row ID and send the reason payload when excluding an order", async () => {
        const fetchMock = vi.fn().mockResolvedValue(mockResponse({ id: 7, id_riga_ordine: "riga/1", motivo: "Duplicato", data_esclusione: null }, 201));
        vi.stubGlobal("fetch", fetchMock);

        await excludeOrder("riga/1", "Duplicato");

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/ordini-non-evasi\/riga%2F1\/escludi$/),
            expect.objectContaining({ method: "PATCH", body: JSON.stringify({ motivo: "Duplicato" }), credentials: "include" }),
        );
    });

    it("should accept a 204 response when restoring an order", async () => {
        const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
        vi.stubGlobal("fetch", fetchMock);

        await expect(restoreOrder("row with space")).resolves.toBeUndefined();

        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/ordini-non-evasi\/row%20with%20space\/escludi$/),
            expect.objectContaining({ method: "DELETE", credentials: "include" }),
        );
    });

    it("should expose the backend error when fetching excluded orders fails", async () => {
        vi.stubGlobal("fetch", vi.fn().mockResolvedValue(mockResponse({ error: "Access denied" }, 409)));

        await expect(getExcludedOrders()).rejects.toEqual(expect.objectContaining({ status: 409, message: "Access denied" }));
    });
});
