import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Download, FileText, Loader2, Plus, RefreshCw, Trash2 } from "lucide-react";
import {
    ATTACHMENT_ACCEPT, AttachmentValidationError,
    deleteAttachment, getAttachments, getDownloadUrl, uploadAttachment, type UploadStage,
} from "@/api/allegati";
import { ApiError } from "@/api/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription,
    AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDate } from "@/lib/utils";
import type { InvoiceRequestAttachment } from "@/types";
import type { TranslationKey } from "@/translations";

interface InvoiceRequestAttachmentsProps {
    invoiceRequestId: number;
    active: boolean;
    onBusyChange: (busy: boolean) => void;
}

type Operation =
    | { kind: "idle" }
    | { kind: "upload"; name: string; stage: UploadStage; current: number; total: number }
    | { kind: "delete" | "download"; id: number };

interface UploadFailure {
    name: string;
    message: string;
    cleanup: "not-needed" | "deleted" | "failed" | "unresolved";
}

const STAGE_LABELS = {
    preparing: "attachmentPreparing", uploading: "attachmentUploading", confirming: "attachmentConfirming",
} as const satisfies Record<UploadStage, TranslationKey>;

const STATUS_LABELS = {
    in_attesa: "attachmentPending", caricato: "attachmentUploaded", errore: "attachmentError",
} as const satisfies Record<InvoiceRequestAttachment["stato"], TranslationKey>;

function sizeLabel(bytes: number | null, language: string): string {
    if (bytes === null) return "—";

    return bytes >= 1024 * 1024
        ? `${(bytes / (1024 * 1024)).toLocaleString(language, { maximumFractionDigits: 1 })} MB`
        : `${Math.ceil(bytes / 1024).toLocaleString(language)} KB`;
}

export function InvoiceRequestAttachments({ invoiceRequestId, active, onBusyChange }: InvoiceRequestAttachmentsProps): ReactElement {
    const { t, language } = useTranslation();
    const [items, setItems] = useState<InvoiceRequestAttachment[]>([]);
    const [loading, setLoading] = useState(false);
    const [loadError, setLoadError] = useState<Error | null>(null);
    const [actionError, setActionError] = useState<string | null>(null);
    const [failures, setFailures] = useState<UploadFailure[]>([]);
    const [operation, setOperation] = useState<Operation>({ kind: "idle" });
    const [deleteTarget, setDeleteTarget] = useState<InvoiceRequestAttachment | null>(null);
    const fileInputRef = useRef<HTMLInputElement | null>(null);
    const busyRef = useRef(false);
    const loadedRef = useRef(false);
    const mountedRef = useRef(true);
    const requestRef = useRef(0);
    const controllerRef = useRef<AbortController | null>(null);
    const busy = operation.kind !== "idle";

    const refresh = useCallback(async (): Promise<void> => {
        const requestId = ++requestRef.current;
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;

        if (!mountedRef.current) return;
        setLoading(true);
        setLoadError(null);

        try {
            const data = await getAttachments(invoiceRequestId, controller.signal);

            if (!mountedRef.current || requestId !== requestRef.current) return;
            setItems(data);
        } catch (error) {
            if (!mountedRef.current || requestId !== requestRef.current || controller.signal.aborted) return;
            setLoadError(error instanceof Error ? error : new Error(String(error)));
        } finally {
            if (mountedRef.current && requestId === requestRef.current) setLoading(false);
        }
    }, [invoiceRequestId]);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            controllerRef.current?.abort();
            loadedRef.current = false;
            requestRef.current += 1;
        };
    }, []);

    useEffect(() => {
        if (active && !loadedRef.current) {
            loadedRef.current = true;
            void refresh();
        }
    }, [active, refresh]);

    const startOperation = (next: Operation): boolean => {
        if (busyRef.current) return false;
        busyRef.current = true;
        requestRef.current += 1;
        controllerRef.current?.abort();
        setLoading(false);
        setActionError(null);
        setOperation(next);
        onBusyChange(true);

        return true;
    };

    const finishOperation = (): void => {
        busyRef.current = false;

        if (!mountedRef.current) return;
        setOperation({ kind: "idle" });
        onBusyChange(false);
    };

    const handleFiles = async (files: File[]): Promise<void> => {
        if (!files.length || !startOperation({ kind: "upload", name: files[0].name, stage: "preparing", current: 1, total: files.length })) return;
        setFailures([]);

        try {
            for (const [index, file] of files.entries()) {
                if (!mountedRef.current) break;

                const result = await uploadAttachment(invoiceRequestId, file, (stage) => {
                    if (mountedRef.current) setOperation({ kind: "upload", name: file.name, stage, current: index + 1, total: files.length });
                });

                if (!mountedRef.current) continue;

                if (result.ok) {
                    setItems((previous) => [result.attachment, ...previous.filter((item) => item.id !== result.attachment.id)]);
                } else {
                    const message = result.error instanceof AttachmentValidationError
                        ? t(result.error.reason === "size" ? "fileTooLarge" : "invalidFileType")
                        : result.error instanceof ApiError ? result.error.message : t("attachmentUploadFailed");

                    setFailures((previous) => [...previous, { name: file.name, message, cleanup: result.cleanup }]);
                }
            }

            if (mountedRef.current) await refresh();
        } finally {
            finishOperation();
        }
    };

    const handleDelete = async (): Promise<void> => {
        if (!deleteTarget || !startOperation({ kind: "delete", id: deleteTarget.id })) return;

        try {
            await deleteAttachment(invoiceRequestId, deleteTarget.id);

            if (!mountedRef.current) return;
            setItems((previous) => previous.filter((item) => item.id !== deleteTarget.id));
            setDeleteTarget(null);
            await refresh();
        } catch (error) {
            if (mountedRef.current) setActionError(error instanceof ApiError ? error.message : t("attachmentDeleteFailed"));
        } finally {
            finishOperation();
        }
    };

    const handleDownload = async (item: InvoiceRequestAttachment): Promise<void> => {
        if (!startOperation({ kind: "download", id: item.id })) return;

        try {
            const result = await getDownloadUrl(invoiceRequestId, item.id);

            if (mountedRef.current) window.location.assign(result.download_url);
        } catch (error) {
            if (mountedRef.current) setActionError(error instanceof ApiError ? error.message : t("attachmentDownloadFailed"));
        } finally {
            finishOperation();
        }
    };

    return (
        <section className="space-y-4" aria-label={t("attachmentTitle")}>
            <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                    <h2 className="font-display text-lg">{t("attachmentTitle")}</h2>
                    <p className="mt-1 text-sm text-muted-foreground">{t("attachmentHelp")}</p>
                </div>
                <div className="flex shrink-0 gap-1">
                    <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => void refresh()} disabled={busy || loading} aria-label={t("attachmentRefresh")}>
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                    </Button>
                    <input ref={fileInputRef} type="file" accept={ATTACHMENT_ACCEPT} multiple hidden disabled={busy}
                        aria-label={t("attachmentAdd")} onChange={(event) => {
                            const files = Array.from(event.currentTarget.files ?? []);
                            event.currentTarget.value = "";
                            void handleFiles(files);
                        }} />
                    <Button className="min-h-11" disabled={busy} onClick={() => fileInputRef.current?.click()}>
                        <Plus className="h-4 w-4" />{t("attachmentAdd")}
                    </Button>
                </div>
            </div>
            {operation.kind === "upload" && (
                <div role="status" className="flex items-center gap-3 rounded-sm border border-border/50 bg-secondary/30 p-3 text-sm">
                    <Loader2 className="h-4 w-4 shrink-0 animate-spin text-energia-accent" />
                    <div className="min-w-0">
                        <p className="break-words font-medium">{t(STAGE_LABELS[operation.stage])}: {operation.name}</p>
                        <p className="text-xs text-muted-foreground">{t("attachmentFilesProgress").replace("{current}", String(operation.current)).replace("{total}", String(operation.total))}</p>
                    </div>
                </div>
            )}
            {loadError && (
                <div role="alert" className="flex items-center justify-between gap-3 rounded-sm border border-destructive/30 p-3 text-sm text-destructive">
                    <span>{loadError instanceof ApiError ? loadError.message : t("fetchError")}</span>
                    <Button variant="outline" size="sm" disabled={busy || loading} onClick={() => void refresh()}>{t("attachmentRetry")}</Button>
                </div>
            )}
            {actionError && !deleteTarget && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
            {failures.length > 0 && (
                <div role="alert" className="space-y-2 rounded-sm border border-destructive/30 p-3 text-sm">
                    {failures.map((failure, index) => (
                        <div key={`${index}-${failure.name}`} className="break-words">
                            <p className="text-destructive"><span className="font-medium">{failure.name}</span>: {failure.message}</p>
                            {failure.cleanup === "failed" && <p className="text-muted-foreground">{t("attachmentCleanupFailed")}</p>}
                            {failure.cleanup === "unresolved" && <p className="text-muted-foreground">{t("attachmentUnresolved")}</p>}
                        </div>
                    ))}
                </div>
            )}
            {loading && items.length === 0 ? (
                <div role="status" className="flex justify-center py-12"><Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">{t("attachmentRefresh")}</span></div>
            ) : items.length === 0 && !loadError ? (
                <div className="ledger-card py-10 text-center">
                    <FileText className="mx-auto mb-3 h-8 w-8 text-muted-foreground/40" />
                    <p className="font-display">{t("attachmentEmpty")}</p>
                    <p className="mt-1 text-sm text-muted-foreground">{t("attachmentEmptyDescription")}</p>
                </div>
            ) : items.length > 0 ? (
                <div className="ledger-card overflow-hidden">
                    <div className="overflow-x-auto">
                        <Table className="min-w-[640px] [&_td]:px-3 [&_td]:py-2 [&_th]:h-10 [&_th]:px-3 [&_th]:text-xs">
                            <TableHeader><TableRow>
                                <TableHead>{t("attachmentName")}</TableHead><TableHead>{t("attachmentSize")}</TableHead>
                                <TableHead>{t("attachmentDate")}</TableHead><TableHead className="text-right">{t("attachmentActions")}</TableHead>
                            </TableRow></TableHeader>
                            <TableBody>{items.map((item) => (
                                <TableRow key={item.id}>
                                    <TableCell className="max-w-[360px]">
                                        <p className="break-words font-medium">{item.nome_file}</p>
                                        {item.stato !== "caricato" && (
                                            <Badge variant={item.stato === "errore" ? "destructive" : "secondary"} className="mt-1 text-[11px]">{t(STATUS_LABELS[item.stato])}</Badge>
                                        )}
                                    </TableCell>
                                    <TableCell className="whitespace-nowrap font-mono text-xs">{sizeLabel(item.dimensione_bytes, language)}</TableCell>
                                    <TableCell className="whitespace-nowrap font-mono text-xs">{formatDate(item.data_caricamento ?? item.data_creazione)}</TableCell>
                                    <TableCell><div className="flex justify-end gap-1">
                                        <Button size="icon" className="h-11 w-11" variant="ghost" disabled={busy || item.stato !== "caricato"}
                                            aria-label={`${t("attachmentDownload")}: ${item.nome_file}`} onClick={() => void handleDownload(item)}>
                                            {operation.kind === "download" && operation.id === item.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                                        </Button>
                                        <Button size="icon" className="h-11 w-11" variant="ghost" disabled={busy} aria-label={`${t("attachmentDelete")}: ${item.nome_file}`}
                                            onClick={() => { setActionError(null); setDeleteTarget(item); }}><Trash2 className="h-4 w-4" /></Button>
                                    </div></TableCell>
                                </TableRow>
                            ))}</TableBody>
                        </Table>
                    </div>
                </div>
            ) : null}
            <AlertDialog open={deleteTarget !== null} onOpenChange={(open) => { if (!open && !busyRef.current) setDeleteTarget(null); }}>
                <AlertDialogContent className="max-w-[calc(100vw-2rem)] sm:max-w-lg">
                    <AlertDialogHeader><AlertDialogTitle>{t("attachmentDeleteTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("attachmentDeleteDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <p className="break-all text-sm font-medium">{deleteTarget?.nome_file}</p>
                    {actionError && <p role="alert" className="text-sm text-destructive">{actionError}</p>}
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={busy}>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction disabled={busy} onClick={(event) => { event.preventDefault(); void handleDelete(); }}>
                            {operation.kind === "delete" && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("attachmentDelete")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </section>
    );
}
