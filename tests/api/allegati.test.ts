import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { ATTACHMENT_MAX_BYTES, validateAttachment, uploadAttachment } from "@/api/allegati";
import type { InvoiceRequestAttachment, UploadUrlResponse } from "@/types";

const fetchMock = vi.fn<typeof fetch>();

const uploadInfo: UploadUrlResponse = {
    allegato_id: 3, chiave_oggetto: "invite/3", upload_url: "https://storage.example/upload",
    metodo: "PUT", scadenza_secondi: 600, headers_richiesti: { "Content-Type": "application/pdf" }, stato: "in_attesa",
};

const attachment: InvoiceRequestAttachment = {
    id: 3, storico_invito_id: 1, nome_file: "invoice.pdf", content_type: "application/pdf",
    chiave_oggetto: "invite/3", dimensione_bytes: 4, stato: "caricato",
    data_creazione: "2026-09-15T10:00:00", data_caricamento: "2026-09-15T10:00:01",
};

type JsonResponseBody = UploadUrlResponse | InvoiceRequestAttachment | InvoiceRequestAttachment[] | { error: string } | { message: string };

const json = (body: JsonResponseBody, status = 200): Response => new Response(JSON.stringify(body), { status });

const file = (): File => new File(["test"], "invoice.pdf", { type: "" });

beforeEach(() => { fetchMock.mockReset(); vi.stubGlobal("fetch", fetchMock); });

afterEach(() => vi.unstubAllGlobals());

describe("attachment validation", () => {
    it.each(["pdf", "png", "jpg", "jpeg", "webp", "tif", "tiff", "doc", "docx", "xls", "xlsx"])(
        "should accept the supported %s extension with an empty browser MIME type", (ext) => {
            expect(validateAttachment({ name: `file.${ext.toUpperCase()}`, size: 1 }).ok).toBe(true);
        },
    );
    it("should accept exactly 50 MB and reject larger files", () => {
        expect(validateAttachment({ name: "a.pdf", size: ATTACHMENT_MAX_BYTES }).ok).toBe(true);
        expect(validateAttachment({ name: "a.pdf", size: ATTACHMENT_MAX_BYTES + 1 })).toEqual({ ok: false, reason: "size" });
    });
    it.each(["a.exe", "no-extension", "", ".pdf", "a.pdf.exe"])("should reject unsupported filename %s", (name) => {
        expect(validateAttachment({ name, size: 1 })).toEqual({ ok: false, reason: "type" });
    });
    it("should make no request when validation fails", async () => {
        const result = await uploadAttachment(1, new File(["x"], "bad.exe"));
        expect(result.ok).toBe(false);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});

describe("attachment upload", () => {
    it("should upload without cookies using signed headers then confirm", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null)).mockResolvedValueOnce(json(attachment));
        const stages: string[] = [];
        const input = file();
        expect(await uploadAttachment(1, input, (stage) => stages.push(stage))).toEqual({ ok: true, attachment });
        expect(stages).toEqual(["preparing", "uploading", "confirming"]);
        expect(fetchMock.mock.calls[1]).toEqual([uploadInfo.upload_url, {
            method: "PUT", body: input, headers: uploadInfo.headers_richiesti, credentials: "omit",
        }]);
        expect(fetchMock.mock.calls[0][1]?.credentials).toBe("include");
        expect(fetchMock.mock.calls[2][0]).toContain("/1/allegati/3/conferma");
    });
    it("should clean up a record when PUT fails without confirming", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null, { status: 403 })).mockResolvedValueOnce(json({ message: "deleted" }));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, phase: "uploading", cleanup: "deleted", attachmentId: 3 });
        expect(fetchMock.mock.calls[2][1]?.method).toBe("DELETE");
        expect(fetchMock).toHaveBeenCalledTimes(3);
    });
    it("should clean up after explicit confirmation failure", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null))
            .mockResolvedValueOnce(json({ error: "Object missing" }, 409)).mockResolvedValueOnce(json({ message: "deleted" }));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, phase: "confirming", cleanup: "deleted" });
    });
    it("should preserve a confirmed upload when its confirmation response is lost", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null))
            .mockRejectedValueOnce(new TypeError("Network disconnected")).mockResolvedValueOnce(json([attachment]));
        expect(await uploadAttachment(1, file())).toEqual({ ok: true, attachment });
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
    });
    it("should preserve an unfinished attachment while a lost confirmation may still be processing", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null))
            .mockRejectedValueOnce(new TypeError("Network disconnected"))
            .mockResolvedValueOnce(json([{ ...attachment, stato: "in_attesa" }])).mockResolvedValueOnce(json({ message: "deleted" }));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, cleanup: "unresolved" });
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
    });
    it("should preserve an uncertain upload when reconciliation also fails", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null))
            .mockRejectedValueOnce(new TypeError("Network disconnected")).mockRejectedValueOnce(new TypeError("Still offline"));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, cleanup: "unresolved" });
        expect(fetchMock.mock.calls.some((call) => call[1]?.method === "DELETE")).toBe(false);
    });
    it("should report cleanup failure separately from the original PUT failure", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null, { status: 403 }))
            .mockRejectedValueOnce(new TypeError("Cleanup offline"));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, cleanup: "failed", cleanupError: expect.any(Error) });
    });
    it("should treat an already removed attachment as cleaned up", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null, { status: 403 }))
            .mockResolvedValueOnce(json({ error: "Gone" }, 404));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, cleanup: "deleted" });
    });
    it("should preserve the record when a PUT transport error leaves storage completion uncertain", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockRejectedValueOnce(new TypeError("Connection reset"));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, phase: "uploading", cleanup: "unresolved", attachmentId: 3 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it("should preserve the record when R2 reports a server failure", async () => {
        fetchMock.mockResolvedValueOnce(json(uploadInfo)).mockResolvedValueOnce(new Response(null, { status: 500 }));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, phase: "uploading", cleanup: "unresolved", attachmentId: 3 });
        expect(fetchMock).toHaveBeenCalledTimes(2);
    });
    it("should report an unresolved outcome for an upload-url server failure", async () => {
        fetchMock.mockResolvedValueOnce(json({ error: "Server error" }, 500));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, phase: "preparing", cleanup: "unresolved" });
    });
    it("should not guess an attachment ID when the upload URL response is lost", async () => {
        fetchMock.mockRejectedValueOnce(new TypeError("Network disconnected"));
        expect(await uploadAttachment(1, file())).toMatchObject({ ok: false, phase: "preparing", cleanup: "unresolved" });
        expect(fetchMock).toHaveBeenCalledTimes(1);
    });
});
