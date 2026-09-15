import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { getInvoiceRequestDetails } from "@/api/inviti";

const fetchMock = vi.fn<typeof fetch>();

beforeEach(() => {
    fetchMock.mockReset();
    vi.stubGlobal("fetch", fetchMock);
});

afterEach(() => {
    vi.unstubAllGlobals();
});

describe("getDettaglioInvito", () => {
    it("should request the invite detail endpoint with an abort signal", async () => {
        const controller = new AbortController();
        fetchMock.mockResolvedValue(new Response(JSON.stringify({
            invito_id: 12,
            totale_invito: 120.5,
            count: 1,
            dati: [],
        })));

        await expect(getInvoiceRequestDetails(12, controller.signal)).resolves.toMatchObject({
            invito_id: 12,
            totale_invito: 120.5,
        });
        expect(fetchMock).toHaveBeenCalledWith(
            expect.stringMatching(/\/api\/storico-inviti\/12\/dettaglio$/),
            { credentials: "include", signal: controller.signal },
        );
    });
});
