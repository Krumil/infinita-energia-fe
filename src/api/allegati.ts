import type { InvoiceRequestAttachment, DownloadUrlResponse, UploadUrlResponse } from "@/types";
import { ApiError, authFetch, getApiUrl, handleResponse } from "./client";

export const ATTACHMENT_MAX_MB = 50;

export const ATTACHMENT_MAX_BYTES = ATTACHMENT_MAX_MB * 1024 * 1024;

const MIME_BY_EXTENSION = new Map(Object.entries({
    pdf: "application/pdf",
    png: "image/png",
    jpg: "image/jpeg",
    jpeg: "image/jpeg",
    webp: "image/webp",
    tif: "image/tiff",
    tiff: "image/tiff",
    doc: "application/msword",
    docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    xls: "application/vnd.ms-excel",
    xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
}));

export const ATTACHMENT_ACCEPT = Array.from(MIME_BY_EXTENSION.keys()).map((extension) => `.${extension}`).join(",");

export type AttachmentValidation = { ok: true; contentType: string } | { ok: false; reason: "type" | "size" };

export type UploadStage = "preparing" | "uploading" | "confirming";

export type AttachmentUploadResult =
    | { ok: true; attachment: InvoiceRequestAttachment }
    | {
        ok: false;
        phase: UploadStage | "validation";
        error: Error;
        cleanup: "not-needed" | "deleted" | "failed" | "unresolved";
        attachmentId?: number;
        cleanupError?: Error;
    };

export class AttachmentValidationError extends Error {
    constructor(public reason: "type" | "size", fileName: string) {
        super(`Attachment validation failed for ${fileName}: ${reason}`);
        this.name = "AttachmentValidationError";
    }
}

export function validateAttachment(file: Pick<File, "name" | "size">): AttachmentValidation {
    const dot = file.name.lastIndexOf(".");
    const extension = dot > 0 ? file.name.slice(dot + 1).toLowerCase() : "";
    const contentType = MIME_BY_EXTENSION.get(extension);

    if (!contentType) return { ok: false, reason: "type" };

    if (file.size > ATTACHMENT_MAX_BYTES) return { ok: false, reason: "size" };

    return { ok: true, contentType };
}

function attachmentPath(invoiceRequestId: number, suffix = ""): string {
    return getApiUrl(`/storico-inviti/${invoiceRequestId}/allegati${suffix}`);
}

export async function getAttachments(invoiceRequestId: number, signal?: AbortSignal): Promise<InvoiceRequestAttachment[]> {
    return handleResponse<InvoiceRequestAttachment[]>(await authFetch(attachmentPath(invoiceRequestId), { signal }));
}

export async function requestUploadUrl(invoiceRequestId: number, fileName: string, contentType: string): Promise<UploadUrlResponse> {
    return handleResponse<UploadUrlResponse>(await authFetch(attachmentPath(invoiceRequestId, "/upload-url"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nome_file: fileName, content_type: contentType }),
    }));
}

export async function confirmAttachment(invoiceRequestId: number, attachmentId: number): Promise<InvoiceRequestAttachment> {
    return handleResponse<InvoiceRequestAttachment>(await authFetch(attachmentPath(invoiceRequestId, `/${attachmentId}/conferma`), { method: "POST" }));
}

export async function getDownloadUrl(invoiceRequestId: number, attachmentId: number): Promise<DownloadUrlResponse> {
    return handleResponse<DownloadUrlResponse>(await authFetch(attachmentPath(invoiceRequestId, `/${attachmentId}/download-url`)));
}

export async function deleteAttachment(invoiceRequestId: number, attachmentId: number): Promise<void> {
    await handleResponse<{ message: string }>(await authFetch(attachmentPath(invoiceRequestId, `/${attachmentId}`), { method: "DELETE" }));
}

function toError(cause: unknown): Error {
    return cause instanceof Error ? cause : new Error(String(cause));
}

export async function uploadAttachment(
    invoiceRequestId: number,
    file: File,
    onStage?: (stage: UploadStage) => void,
): Promise<AttachmentUploadResult> {
    const validation = validateAttachment(file);

    if (!validation.ok) {
        return { ok: false, phase: "validation", error: new AttachmentValidationError(validation.reason, file.name), cleanup: "not-needed" };
    }

    let phase: UploadStage = "preparing";
    let attachmentId: number | undefined;

    try {
        onStage?.(phase);
        const info = await requestUploadUrl(invoiceRequestId, file.name, validation.contentType);
        attachmentId = info.allegato_id;
        phase = "uploading";
        onStage?.(phase);

        const response = await fetch(info.upload_url, {
            method: info.metodo, body: file, headers: info.headers_richiesti, credentials: "omit",
        });

        if (!response.ok) throw new ApiError(response.status, `Upload failed for ${file.name}: HTTP ${response.status}`);
        phase = "confirming";
        onStage?.(phase);

        return { ok: true, attachment: await confirmAttachment(invoiceRequestId, attachmentId) };
    } catch (cause) {
        const error = toError(cause);

        if (attachmentId === undefined) {
            return { ok: false, phase, error, cleanup: cause instanceof ApiError && cause.status < 500 ? "not-needed" : "unresolved" };
        }

        if (phase === "uploading" && (!(cause instanceof ApiError) || cause.status >= 500)) {
            return { ok: false, phase, error, attachmentId, cleanup: "unresolved" };
        }

        if (phase === "confirming" && (!(cause instanceof ApiError) || cause.status >= 500)) {
            try {
                const current = (await getAttachments(invoiceRequestId)).find((item) => item.id === attachmentId);

                if (current?.stato === "caricato") return { ok: true, attachment: current };

                if (!current) return { ok: false, phase, error, attachmentId, cleanup: "deleted" };

                return { ok: false, phase, error, attachmentId, cleanup: "unresolved" };
            } catch (reconciliationError) {
                return { ok: false, phase, error, attachmentId, cleanup: "unresolved", cleanupError: toError(reconciliationError) };
            }
        }

        try {
            await deleteAttachment(invoiceRequestId, attachmentId);

            return { ok: false, phase, error, attachmentId, cleanup: "deleted" };
        } catch (cleanupError) {
            if (cleanupError instanceof ApiError && cleanupError.status === 404) {
                return { ok: false, phase, error, attachmentId, cleanup: "deleted" };
            }

            return { ok: false, phase, error, attachmentId, cleanup: "failed", cleanupError: toError(cleanupError) };
        }
    }
}
