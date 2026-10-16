import { useCallback, useEffect, useRef, useState, type ReactElement } from "react";
import { Loader2, RefreshCw } from "lucide-react";
import { ApiError } from "@/api/client";
import { getInvoiceRequestDetails } from "@/api/inviti";
import { InvoiceRequestAttachments } from "@/components/InvitoAttachments";
import { ROWS_PAGE_SIZE, ShowMoreRows } from "@/components/ShowMoreRows";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { DatePicker } from "@/components/DatePicker";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { formatDate } from "@/lib/utils";
import { useTranslation } from "@/hooks/useTranslation";
import { invoiceRequestsEn, invoiceRequestsIt, type InvoiceRequestsTranslations } from "@/translations/inviti";
import type { InvoiceRequestDetailsResponse, InvoiceRequest, UpdateInvoiceRequestPayload } from "@/types";
import type { UpdateInvoiceRequestResult } from "@/hooks/useInviti";

interface EditFormData {
    status: "bozza" | "inviato" | "approvato";
    invoiceReference: string;
    invoiceDate: string;
    paid: boolean;
    paymentDate: string;
}

interface InvoiceRequestDialogProps {
    initialTab?: "edit" | "attachments";
    invoiceRequest: InvoiceRequest | null;
    saving: boolean;
    onSave: (id: number, data: UpdateInvoiceRequestPayload) => Promise<UpdateInvoiceRequestResult>;
    onClose: () => void;
}

type DialogTab = "edit" | "detail" | "attachments";

function formatCurrency(value: number, language: string): string {
    return value.toLocaleString(language, { style: "currency", currency: "EUR" });
}

function createEditForm(invoiceRequest: InvoiceRequest): EditFormData {
    return {
        status: invoiceRequest.stato,
        invoiceReference: invoiceRequest.riferimento_fattura ?? "",
        invoiceDate: invoiceRequest.data_fattura ?? "",
        paid: invoiceRequest.pagato,
        paymentDate: invoiceRequest.data_pagamento ?? "",
    };
}

interface DetailPanelProps {
    invoiceRequestId: number;
    translations: InvoiceRequestsTranslations;
    language: string;
}

function DetailPanel({ invoiceRequestId, translations, language }: DetailPanelProps): ReactElement {
    const [detail, setDetail] = useState<InvoiceRequestDetailsResponse | null>(null);
    const [shownRows, setShownRows] = useState(ROWS_PAGE_SIZE);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<Error | null>(null);
    const requestVersion = useRef(0);
    const controllerRef = useRef<AbortController | null>(null);

    const loadDetail = useCallback(async (): Promise<void> => {
        controllerRef.current?.abort();
        const controller = new AbortController();
        controllerRef.current = controller;
        const version = ++requestVersion.current;
        setLoading(true);
        setError(null);

        try {
            const response = await getInvoiceRequestDetails(invoiceRequestId, controller.signal);

            if (requestVersion.current === version) setDetail(response);
        } catch (cause) {
            if (!controller.signal.aborted && requestVersion.current === version) {
                setError(cause instanceof Error ? cause : new Error(String(cause)));
            }
        } finally {
            if (requestVersion.current === version) setLoading(false);
        }
    }, [invoiceRequestId]);

    useEffect(() => {
        void loadDetail();

        return () => {
            requestVersion.current += 1;
            controllerRef.current?.abort();
        };
    }, [loadDetail]);

    return (
        <section className="space-y-4" aria-label={translations.detailTitle}>
            <div className="flex items-start justify-between gap-4">
                <p className="text-sm text-muted-foreground">{translations.detailDescription}</p>
                <Button variant="outline" size="sm" disabled={loading} onClick={() => void loadDetail()} aria-label={translations.refresh}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                </Button>
            </div>
            {error ? (
                <div role="alert" className="flex min-h-32 flex-col items-center justify-center gap-3 text-center text-sm text-destructive">
                    <p>{error instanceof ApiError ? error.message : translations.detailLoadFailed}</p>
                    <Button variant="outline" size="sm" onClick={() => void loadDetail()}>{translations.retry}</Button>
                </div>
            ) : loading && !detail ? (
                <div role="status" className="flex min-h-48 items-center justify-center">
                    <Loader2 className="h-6 w-6 animate-spin" /><span className="sr-only">{translations.detailTitle}</span>
                </div>
            ) : detail && detail.dati.length > 0 ? (
                <div className="ledger-card max-h-[55dvh] overflow-auto">
                    <Table className="min-w-[800px] [&_td]:px-3 [&_td]:py-2 [&_th]:h-10 [&_th]:px-3 [&_th]:text-xs">
                        <TableHeader><TableRow>
                            <TableHead>{translations.seller}</TableHead>
                            <TableHead>{translations.competenceTo}</TableHead>
                            <TableHead>{translations.rule}</TableHead>
                            <TableHead>{translations.podPdr}</TableHead>
                            <TableHead>{translations.customer}</TableHead>
                            <TableHead>{translations.taxId}</TableHead>
                            <TableHead className="text-right">{translations.commissionAmount}</TableHead>
                        </TableRow></TableHeader>
                        <TableBody>{detail.dati.slice(0, shownRows).map((row) => (
                            <TableRow key={row.id}>
                                <TableCell>{row.venditore ?? "—"}</TableCell>
                                <TableCell className="whitespace-nowrap">{formatDate(row.comp_al)}</TableCell>
                                <TableCell>{row.regola ?? "—"}</TableCell>
                                <TableCell>{row.pod_pdr ?? "—"}</TableCell>
                                <TableCell>{row.cliente ?? "—"}</TableCell>
                                <TableCell>{row.cf_piva ?? "—"}</TableCell>
                                <TableCell className="text-right font-mono text-xs">{formatCurrency(row.importo_provvigione, language)}</TableCell>
                            </TableRow>
                        ))}</TableBody>
                    </Table>
                    <ShowMoreRows shown={shownRows} total={detail.dati.length} onShowMore={setShownRows} />
                </div>
            ) : detail ? (
                <p className="ledger-card px-4 py-10 text-center text-sm text-muted-foreground">{translations.detailUnavailable}</p>
            ) : null}
        </section>
    );
}

export function InvoiceRequestDialog({ invoiceRequest, saving, onSave, onClose, initialTab = "edit" }: InvoiceRequestDialogProps): ReactElement | null {
    const { t, language } = useTranslation();
    const [activeTab, setActiveTab] = useState<DialogTab>(initialTab);
    const [detailVisited, setDetailVisited] = useState(false);
    const [attachmentsBusy, setAttachmentsBusy] = useState(false);
    const [localSaving, setLocalSaving] = useState(false);
    const [saveError, setSaveError] = useState<string | null>(null);
    const [editForm, setEditForm] = useState<EditFormData | null>(() => invoiceRequest ? createEditForm(invoiceRequest) : null);
    const titleRef = useRef<HTMLHeadingElement | null>(null);
    const saveRef = useRef(false);
    const attachmentBusyRef = useRef(false);
    const copy = language === "it" ? invoiceRequestsIt : invoiceRequestsEn;
    const busy = saving || localSaving || attachmentsBusy;

    if (!invoiceRequest || !editForm) return null;

    const dismiss = (): void => {
        if (!saving && !saveRef.current && !attachmentBusyRef.current) onClose();
    };

    const save = async (): Promise<void> => {
        if (saving || saveRef.current || attachmentBusyRef.current) return;
        saveRef.current = true;
        setLocalSaving(true);
        setSaveError(null);

        try {
            const result = await onSave(invoiceRequest.id, {
                stato: editForm.status,
                riferimento_fattura: editForm.invoiceReference || undefined,
                data_fattura: editForm.invoiceDate || undefined,
                pagato: editForm.paid,
                data_pagamento: editForm.paid ? editForm.paymentDate || undefined : undefined,
            });

            if (result.ok) onClose();
            else setSaveError(result.error);
        } finally {
            saveRef.current = false;
            setLocalSaving(false);
        }
    };

    return (
        <Dialog open onOpenChange={(open) => { if (!open) dismiss(); }}>
            <DialogContent closeLabel={t("close")} closeButtonClassName="right-3 top-3 flex h-11 w-11 items-center justify-center focus:ring-0 focus-visible:ring-2" onOpenAutoFocus={(event) => {
                event.preventDefault();
                titleRef.current?.focus();
            }} className="block max-h-[calc(100dvh-2rem)] w-[calc(100vw-2rem)] max-w-[960px] overflow-y-auto rounded-lg p-0">
                <DialogHeader className="flex-row flex-wrap items-baseline justify-between gap-x-6 gap-y-2 space-y-0 px-4 py-5 pr-[72px] text-left sm:pl-5">
                    <div className="min-w-0 flex-1 space-y-2">
                        <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                            <DialogTitle ref={titleRef} tabIndex={-1} className="min-w-0 break-words font-display text-xl font-medium outline-none">{invoiceRequest.nome_agente}</DialogTitle>
                            <DialogDescription className="text-sm uppercase">
                                {new Date(`${invoiceRequest.mese_competenza}T00:00:00`).toLocaleDateString(language, { month: "long", year: "numeric" })}
                            </DialogDescription>
                        </div>
                        <p className="font-mono text-[26px] font-medium leading-none tracking-tight text-foreground">
                            <span className="sr-only">{t("invitationTotal")}: </span>{formatCurrency(invoiceRequest.totale_invito, language)}
                        </p>
                    </div>
                </DialogHeader>
                <Tabs value={activeTab} onValueChange={(value) => {
                    if (!busy && (value === "edit" || value === "detail" || value === "attachments")) {
                        setActiveTab(value);

                        if (value === "detail") setDetailVisited(true);
                    }
                }}>
                    <TabsList className="h-auto w-full justify-start gap-2 rounded-none border-b border-border/60 bg-transparent px-4 py-0 sm:gap-5 sm:px-5">
                        <TabsTrigger disabled={busy} value="edit" className="min-h-11 rounded-none border-b-2 border-transparent px-0 focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{copy.editTab}</TabsTrigger>
                        <TabsTrigger disabled={busy} value="detail" className="min-h-11 rounded-none border-b-2 border-transparent px-0 focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{copy.detailTab}</TabsTrigger>
                        <TabsTrigger disabled={busy} value="attachments" className="min-h-11 rounded-none border-b-2 border-transparent px-0 focus-visible:ring-inset focus-visible:ring-offset-0 data-[state=active]:border-primary data-[state=active]:bg-transparent data-[state=active]:shadow-none">{copy.attachmentsTab}</TabsTrigger>
                    </TabsList>
                    <TabsContent value="edit" className="mt-0 space-y-4 p-4 sm:p-5">
                        <fieldset disabled={busy} className="grid gap-4 sm:grid-cols-2">
                            <div className="space-y-1.5">
                                <label htmlFor="invite-status" className="text-sm font-medium">{t("status")}</label>
                                <Select disabled={busy} value={editForm.status} onValueChange={(value) => {
                                    if (value === "bozza" || value === "inviato" || value === "approvato") setEditForm({ ...editForm, status: value });
                                }}>
                                    <SelectTrigger id="invite-status"><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bozza">{t("draft")}</SelectItem><SelectItem value="inviato">{t("sent")}</SelectItem><SelectItem value="approvato">{t("approved")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="invite-invoice-reference" className="text-sm font-medium">{t("invoiceReference")}</label>
                                <Input id="invite-invoice-reference" value={editForm.invoiceReference} onChange={(event) => setEditForm({ ...editForm, invoiceReference: event.target.value })} placeholder="FT-2026/001" />
                            </div>
                            <div className="space-y-1.5">
                                <label htmlFor="invite-invoice-date" className="text-sm font-medium">{t("invoiceDate")}</label>
                                <DatePicker id="invite-invoice-date" disabled={busy} value={editForm.invoiceDate} onChange={(value) => setEditForm({ ...editForm, invoiceDate: value })} placeholder={t("invoiceDate")} className="w-full" />
                            </div>
                            <div className="flex items-center gap-3 sm:pt-6">
                                <Checkbox id="invite-paid" disabled={busy} checked={editForm.paid} onCheckedChange={(checked) => setEditForm({ ...editForm, paid: checked === true, paymentDate: checked === true ? editForm.paymentDate : "" })} />
                                <label htmlFor="invite-paid" className="cursor-pointer text-sm font-medium">{t("paid")}</label>
                            </div>
                            {editForm.paid && (
                                <div className="space-y-1.5">
                                    <label htmlFor="invite-payment-date" className="text-sm font-medium">{t("paymentDate")}</label>
                                    <DatePicker id="invite-payment-date" disabled={busy} value={editForm.paymentDate} onChange={(value) => setEditForm({ ...editForm, paymentDate: value })} placeholder={t("paymentDate")} className="w-full" />
                                </div>
                            )}
                        </fieldset>
                        {saveError && <p role="alert" className="text-sm text-destructive">{saveError}</p>}
                    </TabsContent>
                    <TabsContent value="detail" forceMount className="mt-0 p-4 data-[state=inactive]:hidden sm:p-5">
                        {detailVisited && <DetailPanel invoiceRequestId={invoiceRequest.id} translations={copy} language={language} />}
                    </TabsContent>
                    <TabsContent value="attachments" forceMount className="mt-0 p-4 data-[state=inactive]:hidden sm:p-5">
                        <InvoiceRequestAttachments invoiceRequestId={invoiceRequest.id} active={activeTab === "attachments"} onBusyChange={(value) => {
                            attachmentBusyRef.current = value;
                            setAttachmentsBusy(value);
                        }} />
                    </TabsContent>
                </Tabs>
                <DialogFooter className="gap-2 border-t border-border/60 px-4 py-4 sm:space-x-0 sm:px-5">
                    {activeTab === "edit" ? (
                        <>
                            <Button variant="outline" className="min-h-11" onClick={dismiss} disabled={busy}>{t("cancel")}</Button>
                            <Button onClick={() => void save()} disabled={busy} className="btn-primary min-h-11">
                                {(saving || localSaving) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("save")}
                            </Button>
                        </>
                    ) : (
                        <Button variant="outline" className="min-h-11" onClick={dismiss} disabled={busy}>{t("close")}</Button>
                    )}
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
