import { useState, useMemo, useRef } from "react";
import {
    Calculator,
    Paperclip,
    Eye,
    FileText,
    Loader2,
    RefreshCw,
    Search,
    X,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Check,
    Minus,
} from "lucide-react";
import { ATTACHMENT_ACCEPT, AttachmentValidationError, uploadAttachment } from "@/api/allegati";
import { ApiError } from "@/api/client";
import { toast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { MonthPicker } from "@/components/DatePicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { InvoiceRequestDialog } from "@/components/InvitoDialog";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDate } from "@/lib/utils";
import { useInvoiceRequests } from "@/hooks/useInviti";
import { useUnpaidInvoiceRequests } from "@/hooks/useInvitiNonLiquidati";
import type { Agent, InvoiceRequest, UpdateInvoiceRequestPayload } from "@/types";

interface InvoiceRequestsTabProps {
    agents: Agent[];
    agentsLoading: boolean;
}

type SortField =
    | "nome_agente"
    | "mese_competenza"
    | "totale_invito"
    | "stato"
    | "riferimento_fattura"
    | "data_fattura"
    | "pagato"
    | "data_pagamento";

type SortDirection = "asc" | "desc";


function formatMonth(isoDate: string): string {
    const date = new Date(isoDate);

    const monthNames = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
    ];

    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCurrency(value: number): string {
    return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function isEligibleInvoiceRequest(invoiceRequest: InvoiceRequest): boolean {
    return !invoiceRequest.pagato && invoiceRequest.stato !== "inviato";
}

interface BadgeClasses {
    bg: string;
    text: string;
}

const DEFAULT_BADGE_CLASSES: BadgeClasses = {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
};

const INVOICE_REQUEST_BADGE_CLASSES = new Map(Object.entries({
    bozza: { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-400" },
    inviato: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400" },
    approvato: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-400" },
}));

function getStatusBadge(status: string) {
    const config = INVOICE_REQUEST_BADGE_CLASSES.get(status) ?? DEFAULT_BADGE_CLASSES;

    return (
        <Badge variant="status" className={`${config.bg} ${config.text}`}>
            {status.charAt(0).toUpperCase() + status.slice(1)}
        </Badge>
    );
}

function getPaidBadge(paid: boolean) {
    if (paid) {
        return (
            <Badge variant="status" className="gap-1 bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                <Check className="h-3 w-3" />
            </Badge>
        );
    }

    return (
        <Badge variant="status" className="gap-1 bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <Minus className="h-3 w-3" />
        </Badge>
    );
}

interface SortableHeaderProps {
    label: string;
    field: SortField;
    currentField: SortField;
    direction: SortDirection;
    onSort: (field: SortField) => void;
}

function SortableHeader({ label, field, currentField, direction, onSort }: SortableHeaderProps) {
    const isActive = currentField === field;

    return (
        <Button
            variant="ghost"
            size="icon"
            className="h-auto w-auto gap-1 rounded-none p-0 text-[length:inherit] [font-weight:inherit] hover:bg-transparent [&_svg]:!size-3"
            onClick={() => onSort(field)}
        >
            {label}
            {isActive ? (
                direction === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                ) : (
                    <ArrowDown className="h-3 w-3" />
                )
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
        </Button>
    );
}

function filterInvoiceRequests(invoiceRequests: InvoiceRequest[], query: string): InvoiceRequest[] {
    if (!query.trim()) return invoiceRequests;
    const lowerQuery = query.toLowerCase();

    return invoiceRequests.filter(
        (invoiceRequest) =>
            invoiceRequest.nome_agente.toLowerCase().includes(lowerQuery) ||
            invoiceRequest.riferimento_fattura?.toLowerCase().includes(lowerQuery) ||
            invoiceRequest.stato.toLowerCase().includes(lowerQuery) ||
            formatMonth(invoiceRequest.mese_competenza).toLowerCase().includes(lowerQuery),
    );
}

function sortInvoiceRequests(invoiceRequests: InvoiceRequest[], field: SortField, direction: SortDirection): InvoiceRequest[] {
    return [...invoiceRequests].sort((a, b) => {
        let aVal: string | number | boolean | null;
        let bVal: string | number | boolean | null;

        switch (field) {
            case "nome_agente":
                aVal = a.nome_agente.toLowerCase();
                bVal = b.nome_agente.toLowerCase();
                break;
            case "mese_competenza":
                aVal = a.mese_competenza;
                bVal = b.mese_competenza;
                break;
            case "totale_invito":
                aVal = a.totale_invito;
                bVal = b.totale_invito;
                break;
            case "stato":
                aVal = a.stato;
                bVal = b.stato;
                break;
            case "riferimento_fattura":
                aVal = a.riferimento_fattura?.toLowerCase() || "";
                bVal = b.riferimento_fattura?.toLowerCase() || "";
                break;
            case "data_fattura":
                aVal = a.data_fattura || "";
                bVal = b.data_fattura || "";
                break;
            case "pagato":
                aVal = a.pagato ? 1 : 0;
                bVal = b.pagato ? 1 : 0;
                break;
            case "data_pagamento":
                aVal = a.data_pagamento || "";
                bVal = b.data_pagamento || "";
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return direction === "asc" ? -1 : 1;

        if (aVal > bVal) return direction === "asc" ? 1 : -1;

        return 0;
    });
}

export function InvoiceRequestsTab({ agents }: InvoiceRequestsTabProps) {
    const { t } = useTranslation();

    const {
        invoiceRequests,
        loading,
        updating,
        filteredAgentId,
        setFilteredAgentId,
        selectedStatus,
        setSelectedStatus,
        selectedPaid,
        setSelectedPaid,
        startDate,
        setStartDate,
        endDate,
        setEndDate,
        fetchInvoiceRequests,
        updateInvoiceRequest,
    } = useInvoiceRequests();

    const {
        selectionMode,
        selectedAgentId,
        selectedInvoiceRequestIds,
        loading: unpaidLoading,
        unpaidInvoiceRequests,
        selectionLoading,
        enterSelectionMode,
        exitSelectionMode,
        selectAgent,
        toggleInvoiceRequest,
        runCalculation,
    } = useUnpaidInvoiceRequests();

    const [filterQuery, setFilterQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("mese_competenza");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [editingInvoiceRequest, setEditingInvoiceRequest] = useState<InvoiceRequest | null>(null);

    const [dialogInitialTab, setDialogInitialTab] = useState<"edit" | "attachments">("edit");
    const attachmentInputRef = useRef<HTMLInputElement | null>(null);
    const attachmentTargetRef = useRef<InvoiceRequest | null>(null);
    const uploadBusyRef = useRef(false);
    const [uploadingId, setUploadingId] = useState<number | null>(null);

    const uploadFiles = async (files: File[]): Promise<void> => {
        const target = attachmentTargetRef.current;

        if (!target || !files.length || uploadBusyRef.current) return;
        uploadBusyRef.current = true;
        setUploadingId(target.id);
        const failures: string[] = [];

        try {
            for (const file of files) {
                const result = await uploadAttachment(target.id, file);

                if (result.ok) continue;

                const message = result.error instanceof AttachmentValidationError
                    ? t(result.error.reason === "size" ? "fileTooLarge" : "invalidFileType")
                    : result.error instanceof ApiError ? result.error.message : t("attachmentUploadFailed");

                const cleanup = result.cleanup === "failed" ? t("attachmentCleanupFailed")
                    : result.cleanup === "unresolved" ? t("attachmentUnresolved") : "";

                failures.push(`${file.name}: ${message} ${cleanup}`.trim());
            }

            toast({
                title: `${target.nome_agente} · ${formatMonth(target.mese_competenza)}`,
                description: failures.length ? failures.join("\n") : t("attachmentUploaded"),
                variant: failures.length ? "destructive" : "default",
            });
        } finally {
            uploadBusyRef.current = false;
            setUploadingId(null);
        }
    };

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const processedInvoiceRequests = useMemo(() => {
        const filtered = filterInvoiceRequests(invoiceRequests, filterQuery);

        return sortInvoiceRequests(filtered, sortField, sortDirection);
    }, [invoiceRequests, filterQuery, sortField, sortDirection]);

    const eligibleInvoiceRequests = useMemo(
        () => filterInvoiceRequests(unpaidInvoiceRequests, filterQuery).filter(isEligibleInvoiceRequest),
        [unpaidInvoiceRequests, filterQuery],
    );

    const agentGroups = useMemo(() => {
        const map = new Map<number, { id: number; name: string; count: number; total: number }>();

        for (const invoiceRequest of eligibleInvoiceRequests) {
            const existing = map.get(invoiceRequest.agente_id);

            if (existing) {
                existing.count += 1;
                existing.total += invoiceRequest.totale_invito;
            } else {
                map.set(invoiceRequest.agente_id, {
                    id: invoiceRequest.agente_id,
                    name: invoiceRequest.nome_agente,
                    count: 1,
                    total: invoiceRequest.totale_invito,
                });
            }
        }

        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
    }, [eligibleInvoiceRequests]);

    type RenderRow =
        | { kind: "group"; group: { id: number; name: string; count: number; total: number } }
        | { kind: "detail"; invoiceRequest: InvoiceRequest };

    const renderRows = useMemo<RenderRow[]>(() => {
        const byAgent = new Map<number, InvoiceRequest[]>();

        for (const invoiceRequest of eligibleInvoiceRequests) {
            const list = byAgent.get(invoiceRequest.agente_id);

            if (list) list.push(invoiceRequest);
            else byAgent.set(invoiceRequest.agente_id, [invoiceRequest]);
        }

        const rows: RenderRow[] = [];

        for (const group of agentGroups) {
            rows.push({ kind: "group", group });
            const items = byAgent.get(group.id) ?? [];

            const sorted = [...items].sort((a, b) =>
                b.mese_competenza.localeCompare(a.mese_competenza),
            );

            for (const invoiceRequest of sorted) {
                rows.push({ kind: "detail", invoiceRequest });
            }
        }

        return rows;
    }, [eligibleInvoiceRequests, agentGroups]);

    const eligibleByAgent = useMemo(() => {
        const map = new Map<number, number[]>();

        for (const invoiceRequest of eligibleInvoiceRequests) {
            const list = map.get(invoiceRequest.agente_id);

            if (list) list.push(invoiceRequest.id);
            else map.set(invoiceRequest.agente_id, [invoiceRequest.id]);
        }

        return map;
    }, [eligibleInvoiceRequests]);

    const handleSelectAgent = (agentId: number) => {
        if (agentId === selectedAgentId) return;
        selectAgent(agentId, eligibleByAgent.get(agentId) ?? []);
    };

    const handleRowClick = (invoiceRequest: InvoiceRequest) => {
        if (selectionMode || uploadBusyRef.current) return;
        setDialogInitialTab("edit");
        setEditingInvoiceRequest(invoiceRequest);
    };

    const handleRunCalculation = () => {
        if (selectedAgentId == null) return;
        const group = agentGroups.find((g) => g.id === selectedAgentId);

        if (!group) return;

        const months = eligibleInvoiceRequests
            .filter((invoiceRequest) => invoiceRequest.agente_id === selectedAgentId && selectedInvoiceRequestIds.has(invoiceRequest.id))
            .map((invoiceRequest) => invoiceRequest.mese_competenza);

        void runCalculation({ id: group.id, name: group.name }, months);
    };

    const handleSave = (id: number, data: UpdateInvoiceRequestPayload) => updateInvoiceRequest(id, data);

    const sortedAgentOptions = useMemo(
        () =>
            [...agents]
                .sort((a, b) => a.nome_cognome.localeCompare(b.nome_cognome, "it"))
                .map((a) => ({ value: String(a.id), label: a.nome_cognome })),
        [agents],
    );

    const handleAgentFilterChange = (value: string | undefined) => {
        setFilteredAgentId(value ? Number(value) : undefined);
    };

    const handleStatusFilterChange = (value: string) => {
        setSelectedStatus(value === "all" ? undefined : value);
    };

    const handlePaidFilterChange = (value: string) => {
        if (value === "paid") {
            setSelectedPaid(true);
        } else if (value === "unpaid") {
            setSelectedPaid(false);
        } else {
            setSelectedPaid(undefined);
        }
    };

    const paidFilterValue = selectedPaid === true ? "paid" : selectedPaid === false ? "unpaid" : "all";

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-11.5rem)]">
            <input ref={attachmentInputRef} type="file" accept={ATTACHMENT_ACCEPT} multiple hidden
                aria-label={t("attachmentAddFile")} onChange={(event) => {
                    const files = Array.from(event.currentTarget.files ?? []);
                    event.currentTarget.value = "";
                    void uploadFiles(files);
                }} />
            <div className="shrink-0 border border-border/50 rounded-sm overflow-hidden">
                {/* Row 1: Title + count + refresh */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-energia-accent" />
                        <h2 className="font-display text-xl">
                            {t("invoiceInvitations")}
                            {invoiceRequests.length > 0 && (
                                <span className="ml-2 text-muted-foreground font-normal text-base">
                                    ({invoiceRequests.length})
                                </span>
                            )}
                        </h2>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchInvoiceRequests} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Row 2: Compact filter strip */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/30">
                    {!selectionMode && (
                        <>
                            <SearchableSelect
                                value={filteredAgentId ? String(filteredAgentId) : undefined}
                                options={sortedAgentOptions}
                                onValueChange={handleAgentFilterChange}
                                placeholder={t("allAgents")}
                                searchPlaceholder={t("searchParentAgent")}
                                emptyMessage={t("noParentAgentsFound")}
                                clearLabel={t("allAgents")}
                                className="h-8 w-44 text-xs"
                            />

                            <div className="h-4 w-px bg-border/50" />

                            <div className="flex items-center gap-1.5">
                                <MonthPicker
                                    value={startDate}
                                    onChange={setStartDate}
                                    placeholder={t("fromMonth")}
                                    className="h-8 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">&ndash;</span>
                                <MonthPicker
                                    value={endDate}
                                    onChange={setEndDate}
                                    placeholder={t("toMonth")}
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="h-4 w-px bg-border/50" />

                            <Select
                                value={selectedStatus || "all"}
                                onValueChange={handleStatusFilterChange}
                            >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue placeholder={t("allStatuses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                                    <SelectItem value="bozza">{t("draft")}</SelectItem>
                                    <SelectItem value="inviato">{t("sent")}</SelectItem>
                                    <SelectItem value="approvato">{t("approved")}</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="h-4 w-px bg-border/50" />

                            <Select
                                value={paidFilterValue}
                                onValueChange={handlePaidFilterChange}
                            >
                                <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue placeholder={t("allPaymentStatuses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("allPaymentStatuses")}</SelectItem>
                                    <SelectItem value="paid">{t("paidOnly")}</SelectItem>
                                    <SelectItem value="unpaid">{t("unpaidOnly")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    <div className="flex-1" />

                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                            placeholder={t("filterPlaceholder")}
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="pl-8 h-8 w-48 text-xs"
                        />
                        {filterQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-2.5 top-1/2 h-auto w-auto -translate-y-1/2 p-0 text-[length:inherit] [font-weight:inherit] text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:!size-[0.875rem]"
                                onClick={() => setFilterQuery("")}
                                aria-label={t("clearFilter")}
                            >
                                <X className="h-3.5 w-3.5" />
                            </Button>
                        )}
                    </div>
                </div>
            </div>

            {selectionMode && selectionLoading ? (
                <div className="ledger-card flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                </div>
            ) : selectionMode ? (
                <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-auto">
                        <RadioGroup
                            value={selectedAgentId == null ? "" : String(selectedAgentId)}
                            onValueChange={(value) => handleSelectAgent(Number(value))}
                            aria-label={t("agent")}
                            className="contents"
                        >
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="w-[48px]" />
                                    <TableHead className="min-w-[160px]">{t("agent")}</TableHead>
                                    <TableHead className="w-[150px]">{t("competenceMonth")}</TableHead>
                                    <TableHead className="w-[120px] text-right">{t("invitationTotal")}</TableHead>
                                    <TableHead className="w-[110px]">{t("status")}</TableHead>
                                    <TableHead className="w-[150px]">{t("invoiceReference")}</TableHead>
                                    <TableHead className="w-[110px]">{t("invoiceDate")}</TableHead>
                                    <TableHead className="w-[70px]">{t("paid")}</TableHead>
                                    <TableHead className="w-[120px]">{t("paymentDate")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderRows.length > 0 ? (
                                    renderRows.map((row) => {
                                        if (row.kind === "group") {
                                            const isSelected = selectedAgentId === row.group.id;

                                            return (
                                                <TableRow
                                                    key={`group-${row.group.id}`}
                                                    className={`bg-secondary/40 hover:bg-secondary/60 cursor-pointer border-t border-border/40 ${
                                                        isSelected ? "ring-1 ring-inset ring-primary/40" : ""
                                                    }`}
                                                    onClick={() => handleSelectAgent(row.group.id)}
                                                >
                                                    <TableCell>
                                                        <RadioGroupItem
                                                            value={String(row.group.id)}
                                                            aria-label={row.group.name}
                                                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                                                isSelected ? "border-primary" : "border-primary/70"
                                                            }`}
                                                            onClick={(event) => event.stopPropagation()}
                                                        />
                                                    </TableCell>
                                                    <TableCell colSpan={9} className="font-semibold">
                                                        {row.group.name}
                                                        <span className="ml-2 text-muted-foreground font-normal text-xs">
                                                            {t("unpaidCalcGroupSummary")
                                                                .replace("{count}", String(row.group.count))
                                                                .replace(
                                                                    "{total}",
                                                                    formatCurrency(row.group.total),
                                                                )}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }

                                        const { invoiceRequest } = row;
                                        const inSelectedAgent = invoiceRequest.agente_id === selectedAgentId;

                                        return (
                                            <TableRow
                                                key={`detail-${invoiceRequest.id}`}
                                                className={inSelectedAgent ? "" : "opacity-60"}
                                            >
                                                <TableCell>
                                                    {inSelectedAgent && (
                                                        <Checkbox
                                                            checked={selectedInvoiceRequestIds.has(invoiceRequest.id)}
                                                            onCheckedChange={() => toggleInvoiceRequest(invoiceRequest.id)}
                                                            aria-label={formatMonth(invoiceRequest.mese_competenza)}
                                                            className="h-4 w-4 border-2 border-primary/70 data-[state=checked]:border-primary"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell />
                                                <TableCell className="text-muted-foreground">
                                                    {formatMonth(invoiceRequest.mese_competenza)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatCurrency(invoiceRequest.totale_invito)}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(invoiceRequest.stato)}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {invoiceRequest.riferimento_fattura || "—"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {formatDate(invoiceRequest.data_fattura)}
                                                </TableCell>
                                                <TableCell>{getPaidBadge(invoiceRequest.pagato)}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {formatDate(invoiceRequest.data_pagamento)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {t("noDataFound")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                        </RadioGroup>
                    </div>
                </div>
            ) : loading && invoiceRequests.length === 0 ? (
                <div className="ledger-card flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                </div>
            ) : invoiceRequests.length === 0 ? (
                <div className="ledger-card flex flex-1 flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="font-display text-lg text-muted-foreground">{t("noInvitiFound")}</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">{t("noInvitiDesc")}</p>
                </div>
            ) : (
                <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="min-w-[160px]">
                                        <SortableHeader
                                            label={t("agent")}
                                            field="nome_agente"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        <SortableHeader
                                            label={t("competenceMonth")}
                                            field="mese_competenza"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px] text-right">
                                        <SortableHeader
                                            label={t("invitationTotal")}
                                            field="totale_invito"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[110px]">
                                        <SortableHeader
                                            label={t("status")}
                                            field="stato"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        <SortableHeader
                                            label={t("invoiceReference")}
                                            field="riferimento_fattura"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[110px]">
                                        <SortableHeader
                                            label={t("invoiceDate")}
                                            field="data_fattura"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[70px]">
                                        <SortableHeader
                                            label={t("paid")}
                                            field="pagato"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px]">
                                        <SortableHeader
                                            label={t("paymentDate")}
                                            field="data_pagamento"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[112px] text-right">{t("attachmentTitle")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedInvoiceRequests.length > 0 ? (
                                    processedInvoiceRequests.map((invoiceRequest) => (
                                        <TableRow
                                            key={invoiceRequest.id}
                                            className="hover:bg-secondary/30 cursor-pointer"
                                            onClick={() => handleRowClick(invoiceRequest)}
                                        >
                                            <TableCell className="font-medium"><Button type="button" variant="unstyled" size="unstyled" className="justify-start whitespace-normal text-left text-[length:inherit] leading-[inherit] underline-offset-4 hover:underline" onClick={(event) => { event.stopPropagation(); handleRowClick(invoiceRequest); }}>{invoiceRequest.nome_agente}</Button></TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatMonth(invoiceRequest.mese_competenza)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {formatCurrency(invoiceRequest.totale_invito)}
                                            </TableCell>
                                            <TableCell>{getStatusBadge(invoiceRequest.stato)}</TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {invoiceRequest.riferimento_fattura || "\u2014"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {formatDate(invoiceRequest.data_fattura)}
                                            </TableCell>
                                            <TableCell>{getPaidBadge(invoiceRequest.pagato)}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {formatDate(invoiceRequest.data_pagamento)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <div className="flex justify-end gap-1">
                                                    <Button type="button" variant="unstyled" size="icon" className="h-11 w-11 text-muted-foreground/70 [&_svg]:size-3.5"
                                                        disabled={uploadingId !== null}
                                                        title={t("attachmentAddFile")}
                                                        aria-label={`${t("attachmentAddFile")}: ${invoiceRequest.nome_agente}, ${formatMonth(invoiceRequest.mese_competenza)}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            attachmentTargetRef.current = invoiceRequest;
                                                            attachmentInputRef.current?.click();
                                                        }}>
                                                        {uploadingId === invoiceRequest.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                                                    </Button>
                                                    <Button type="button" variant="unstyled" size="icon" className="h-11 w-11 text-muted-foreground/70 [&_svg]:size-3.5"
                                                        disabled={uploadingId !== null} title={t("attachmentView")}
                                                        aria-label={`${t("attachmentView")}: ${invoiceRequest.nome_agente}, ${formatMonth(invoiceRequest.mese_competenza)}`}
                                                        onClick={(event) => {
                                                            event.stopPropagation();
                                                            setDialogInitialTab("attachments");
                                                            setEditingInvoiceRequest(invoiceRequest);
                                                        }}>
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {t("noDataFound")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div className="shrink-0 flex items-center justify-end gap-2">
                {selectionMode ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exitSelectionMode}
                            disabled={unpaidLoading}
                        >
                            {t("unpaidCalcCancel")}
                        </Button>
                        <Button
                            size="sm"
                            className="btn-primary"
                            onClick={handleRunCalculation}
                            disabled={unpaidLoading || selectedAgentId == null || selectedInvoiceRequestIds.size === 0}
                        >
                            {unpaidLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Calculator className="h-4 w-4 mr-2" />
                            )}
                            {t("unpaidCalcRun")}
                            {selectedInvoiceRequestIds.size > 0 && ` (${selectedInvoiceRequestIds.size})`}
                        </Button>
                    </>
                ) : (
                    <Button
                        size="sm"
                        className="btn-primary"
                        onClick={() => void enterSelectionMode()}
                        disabled={selectionLoading}
                    >
                        <Calculator className="h-4 w-4 mr-2" />
                        {t("unpaidCalcButton")}
                    </Button>
                )}
            </div>

            <InvoiceRequestDialog
                key={editingInvoiceRequest?.id ?? "closed"}
                invoiceRequest={editingInvoiceRequest}
                initialTab={dialogInitialTab}
                saving={updating === editingInvoiceRequest?.id}
                onSave={handleSave}
                onClose={() => setEditingInvoiceRequest(null)}
            />
        </div>
    );
}
