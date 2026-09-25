import { useMemo, useState, type ReactElement } from "react";
import {
    ArrowDown,
    ArrowUp,
    ArrowUpDown,
    Calendar,
    Download,
    FileSpreadsheet,
    Loader2,
    Package,
    RefreshCw,
    Search,
    X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DatePicker } from "@/components/DatePicker";
import { OrdersImportDialog } from "@/components/OrdersImportDialog";
import { SettlementsDialog } from "@/components/SettlementsDialog";
import { useTranslation } from "@/hooks/useTranslation";
import type { UseSettlementsResult } from "@/hooks/useLiquidazioni";
import { exportPendingOrdersExcel } from "@/lib/exportUtils";
import { formatDate } from "@/lib/utils";
import type { ImportExcelResponse, ExcludedOrder, PendingOrder } from "@/types";
import { z } from "zod";

interface OrdersTabProps {
    ordersImporting: boolean;
    ordersProgress: number;
    ordersResult: ImportExcelResponse | null;
    onOrdersUpload: (files: File[]) => void;
    settlements: UseSettlementsResult;
    pendingOrders: PendingOrder[];
    pendingOrdersLoading: boolean;
    pendingOrdersError: string | null;
    excludedOrders: ExcludedOrder[];
    excludedOrdersCount: number;
    excludedOrdersLoading: boolean;
    excludedOrdersError: string | null;
    mutatingRowId: string | null;
    mutationError: string | null;
    onRefreshOrders: (startDate?: string, endDate?: string) => Promise<void>;
    onExcludeOrder: (orderLineId: string, reason: string) => Promise<boolean>;
    onRestoreOrder: (orderLineId: string) => Promise<boolean>;
    startDate: string;
    endDate: string;
    onStartDateChange: (date: string) => void;
    onEndDateChange: (date: string) => void;
}

type SortField =
    | "cliente_nome"
    | "id_ordine"
    | "pod_pdr"
    | "prodotto"
    | "agente"
    | "stato"
    | "data_firma"
    | "metodo_pagam";

type SortDirection = "asc" | "desc";

const ALL_STATUSES = "all";

function filterOrders(orders: PendingOrder[], query: string): PendingOrder[] {
    if (!query.trim()) return orders;
    const lowerQuery = query.toLowerCase();

    return orders.filter(
        (order) =>
            order.cliente_nome?.toLowerCase().includes(lowerQuery) ||
            order.pod_pdr.toLowerCase().includes(lowerQuery) ||
            order.agente?.toLowerCase().includes(lowerQuery) ||
            order.prodotto.toLowerCase().includes(lowerQuery) ||
            order.cod_fisc.toLowerCase().includes(lowerQuery) ||
            String(order.id_ordine).includes(lowerQuery),
    );
}

function sortOrders(orders: PendingOrder[], field: SortField, direction: SortDirection): PendingOrder[] {
    return [...orders].sort((a, b) => {
        let aVal: string | number | null;
        let bVal: string | number | null;

        switch (field) {
            case "id_ordine":
                aVal = a.id_ordine;
                bVal = b.id_ordine;
                break;
            case "cliente_nome":
                aVal = a.cliente_nome?.toLowerCase() || "";
                bVal = b.cliente_nome?.toLowerCase() || "";
                break;
            case "pod_pdr":
                aVal = a.pod_pdr.toLowerCase();
                bVal = b.pod_pdr.toLowerCase();
                break;
            case "prodotto":
                aVal = a.prodotto.toLowerCase();
                bVal = b.prodotto.toLowerCase();
                break;
            case "agente":
                aVal = a.agente?.toLowerCase() || "";
                bVal = b.agente?.toLowerCase() || "";
                break;
            case "stato":
                aVal = a.stato?.toLowerCase() || "";
                bVal = b.stato?.toLowerCase() || "";
                break;
            case "data_firma":
                aVal = a.data_firma || "";
                bVal = b.data_firma || "";
                break;
            case "metodo_pagam":
                aVal = a.metodo_pagam?.toLowerCase() || "";
                bVal = b.metodo_pagam?.toLowerCase() || "";
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return direction === "asc" ? -1 : 1;

        if (aVal > bVal) return direction === "asc" ? 1 : -1;

        return 0;
    });
}

function filterExcludedOrders(orders: ExcludedOrder[], query: string): ExcludedOrder[] {
    if (!query.trim()) return orders;
    const lowerQuery = query.toLowerCase();

    return orders.filter((excludedOrder) => {
        const order = excludedOrder.ordine;

        return (
            excludedOrder.motivo.toLowerCase().includes(lowerQuery) ||
            excludedOrder.id_riga_ordine.toLowerCase().includes(lowerQuery) ||
            String(order?.id_ordine ?? "").includes(lowerQuery) ||
            order?.cliente_nome?.toLowerCase().includes(lowerQuery) ||
            order?.pod_pdr.toLowerCase().includes(lowerQuery) ||
            order?.cod_fisc.toLowerCase().includes(lowerQuery)
        );
    });
}

function sortExcludedOrders(orders: ExcludedOrder[]): ExcludedOrder[] {
    return [...orders].sort((a, b) => {
        const aDate = a.data_esclusione ? new Date(a.data_esclusione).getTime() : 0;
        const bDate = b.data_esclusione ? new Date(b.data_esclusione).getTime() : 0;

        return bDate - aDate;
    });
}

interface BadgeClasses {
    bg: string;
    text: string;
}

const DEFAULT_BADGE_CLASSES: BadgeClasses = {
    bg: "bg-slate-100 dark:bg-slate-800",
    text: "text-slate-600 dark:text-slate-400",
};

const ORDER_BADGE_CLASSES = new Map(Object.entries({
    Accettato: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-400" },
    Confermato: { bg: "bg-emerald-100 dark:bg-emerald-900/40", text: "text-emerald-700 dark:text-emerald-400" },
    Trasferito: { bg: "bg-blue-100 dark:bg-blue-900/40", text: "text-blue-700 dark:text-blue-400" },
    "In verifica": { bg: "bg-amber-100 dark:bg-amber-900/40", text: "text-amber-700 dark:text-amber-400" },
    Sospeso: { bg: "bg-orange-100 dark:bg-orange-900/40", text: "text-orange-700 dark:text-orange-400" },
    Ko: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400" },
    KO: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400" },
    Annullato: { bg: "bg-red-100 dark:bg-red-900/40", text: "text-red-700 dark:text-red-400" },
}));

const ordersViewSchema = z.enum(["pending", "excluded"]);

const TAB_TRIGGER_CLASSES = "gap-2 px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:shadow-none";

const COUNT_PILL_CLASSES = "rounded bg-background/60 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground";

const PANEL_CLASSES = "rounded-md border bg-card";

function getStatusBadge(status: string | null): ReactElement {
    const config = ORDER_BADGE_CLASSES.get(status ?? "") ?? DEFAULT_BADGE_CLASSES;

    return (
        <Badge variant="status" className={`${config.bg} ${config.text}`}>
            {status || "—"}
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

function SortableHeader({ label, field, currentField, direction, onSort }: SortableHeaderProps): ReactElement {
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

export function OrdersTab({
    ordersImporting,
    ordersProgress,
    ordersResult,
    onOrdersUpload,
    settlements,
    pendingOrders,
    pendingOrdersLoading,
    pendingOrdersError,
    excludedOrders,
    excludedOrdersCount,
    excludedOrdersLoading,
    excludedOrdersError,
    mutatingRowId,
    mutationError,
    onRefreshOrders,
    onExcludeOrder,
    onRestoreOrder,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}: OrdersTabProps): ReactElement {
    const { t } = useTranslation();
    const [filterQuery, setFilterQuery] = useState("");
    const [statusFilter, setStatusFilter] = useState(ALL_STATUSES);
    const [sortField, setSortField] = useState<SortField>("cliente_nome");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [ordersView, setOrdersView] = useState<"pending" | "excluded">("pending");
    const [importOpen, setImportOpen] = useState(false);
    const [settlementsOpen, setSettlementsOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
    const [exclusionReason, setExclusionReason] = useState("");
    const [exclusionReasonError, setExclusionReasonError] = useState<string | null>(null);

    const isPending = ordersView === "pending";
    const loading = isPending ? pendingOrdersLoading : excludedOrdersLoading;

    const statuses = useMemo(
        () =>
            [...new Set(pendingOrders.map((order) => order.stato).filter((status): status is string => Boolean(status)))]
                .sort((a, b) => a.localeCompare(b, "it")),
        [pendingOrders],
    );

    // A refresh can drop the filtered status from the data; fall back to all rather than showing an empty select.
    const effectiveStatus = statuses.includes(statusFilter) ? statusFilter : ALL_STATUSES;
    const hasFilters = Boolean(filterQuery || startDate || endDate || effectiveStatus !== ALL_STATUSES);

    const handleRefreshWithDates = (): void => {
        void onRefreshOrders(startDate || undefined, endDate || undefined);
    };

    const changeStartDate = (value: string): void => {
        onStartDateChange(value);
        void onRefreshOrders(value || undefined, endDate || undefined);
    };

    const changeEndDate = (value: string): void => {
        onEndDateChange(value);
        void onRefreshOrders(startDate || undefined, value || undefined);
    };

    const resetFilters = (): void => {
        setFilterQuery("");
        setStatusFilter(ALL_STATUSES);

        if (startDate || endDate) {
            onStartDateChange("");
            onEndDateChange("");
            void onRefreshOrders();
        }
    };

    const handleSort = (field: SortField): void => {
        if (field === sortField) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const ariaSort = (field: SortField): "ascending" | "descending" | undefined => {
        if (sortField !== field) return undefined;

        return sortDirection === "asc" ? "ascending" : "descending";
    };

    const processedOrders = useMemo(() => {
        const byStatus = effectiveStatus === ALL_STATUSES ? pendingOrders : pendingOrders.filter((order) => order.stato === effectiveStatus);

        return sortOrders(filterOrders(byStatus, filterQuery), sortField, sortDirection);
    }, [pendingOrders, effectiveStatus, filterQuery, sortField, sortDirection]);

    const processedExcludedOrders = useMemo(
        () => sortExcludedOrders(filterExcludedOrders(excludedOrders, filterQuery)),
        [excludedOrders, filterQuery],
    );

    const handleExclude = async (): Promise<void> => {
        const reason = exclusionReason.trim();

        if (!selectedOrder || !reason) {
            setExclusionReasonError(t("exclusionReasonRequired"));

            return;
        }

        const excluded = await onExcludeOrder(selectedOrder.id_riga_ordine, reason);

        if (excluded) {
            setSelectedOrder(null);
            setExclusionReason("");
            setExclusionReasonError(null);
        }
    };

    const closeExclusionDialog = (open: boolean): void => {
        if (!open && (!selectedOrder || mutatingRowId !== selectedOrder.id_riga_ordine)) {
            setSelectedOrder(null);
            setExclusionReason("");
            setExclusionReasonError(null);
        }
    };

    const sortableHead = (label: string, field: SortField, className?: string): ReactElement => (
        <TableHead className={className} aria-sort={ariaSort(field)}>
            <SortableHeader label={label} field={field} currentField={sortField} direction={sortDirection} onSort={handleSort} />
        </TableHead>
    );

    const footer = isPending
        ? t("pendingOrdersFooter").replace("{shown}", String(processedOrders.length)).replace("{total}", String(pendingOrders.length))
        : t("excludedOrdersFooter").replace("{shown}", String(processedExcludedOrders.length)).replace("{total}", String(excludedOrdersCount));

    const isEmpty = isPending ? pendingOrders.length === 0 : excludedOrders.length === 0;
    const emptyError = isPending ? pendingOrdersError : excludedOrdersError;

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-11.5rem)]">
            <header className="flex shrink-0 flex-wrap items-center justify-between gap-4">
                <h2 className="font-display text-2xl leading-tight">{t("ordini")}</h2>
                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={() => setImportOpen(true)}>
                        <FileSpreadsheet className="h-4 w-4" />
                        {t("importOrders")}
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setSettlementsOpen(true)}>
                        <Calendar className="h-4 w-4" />
                        {t("settlementsAction")}
                    </Button>
                </div>
            </header>

            <section className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <Tabs value={ordersView} onValueChange={(value) => {
                        const parsedView = ordersViewSchema.safeParse(value);

                        if (parsedView.success) {
                            setOrdersView(parsedView.data);
                        }
                    }}>
                        <TabsList className="h-auto gap-1 bg-transparent p-0">
                            <TabsTrigger value="pending" className={TAB_TRIGGER_CLASSES}>
                                {t("pendingOrdersView")}
                                <span className={COUNT_PILL_CLASSES}>{pendingOrders.length}</span>
                            </TabsTrigger>
                            <TabsTrigger value="excluded" className={TAB_TRIGGER_CLASSES}>
                                {t("excludedOrdersView")}
                                <span className={COUNT_PILL_CLASSES}>{excludedOrdersCount}</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex items-center gap-1">
                        <Button variant="ghost" size="sm" onClick={handleRefreshWithDates} disabled={loading} aria-label={t("refresh")}>
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                        </Button>
                        {isPending && (
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => exportPendingOrdersExcel(processedOrders)}
                                disabled={pendingOrdersLoading || processedOrders.length === 0}
                            >
                                <Download className="h-4 w-4" />
                                {t("exportOrders")}
                            </Button>
                        )}
                    </div>
                </div>

                <div className="flex shrink-0 flex-wrap items-center gap-3">
                    <div className="relative w-full sm:w-auto">
                        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                            className="h-9 w-full pl-9 pr-9 sm:w-80"
                            placeholder={isPending ? t("searchPendingOrdersPlaceholder") : t("searchExcludedOrdersPlaceholder")}
                            value={filterQuery}
                            onChange={(event) => setFilterQuery(event.target.value)}
                        />
                        {filterQuery && (
                            <Button
                                variant="ghost"
                                size="icon"
                                className="absolute right-3 top-1/2 h-auto w-auto -translate-y-1/2 p-0 text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:!size-4"
                                onClick={() => setFilterQuery("")}
                                aria-label={t("clearFilter")}
                            >
                                <X className="h-4 w-4" />
                            </Button>
                        )}
                    </div>
                    {isPending && (
                        <>
                            <Select value={effectiveStatus} onValueChange={setStatusFilter}>
                                <SelectTrigger className="h-9 w-[150px]" aria-label={t("filterByStatus")}>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value={ALL_STATUSES}>{t("allStatuses")}</SelectItem>
                                    {statuses.map((status) => (
                                        <SelectItem key={status} value={status}>{status}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <div className="flex flex-wrap items-center gap-2 sm:ml-2" role="group" aria-label={t("signaturePeriod")}>
                                <span className="mr-1 text-xs text-muted-foreground">{t("signatureDate")}</span>
                                <DatePicker value={startDate} onChange={changeStartDate} placeholder={t("startDate")} className="h-9" />
                                <DatePicker value={endDate} onChange={changeEndDate} placeholder={t("endDate")} className="h-9" />
                            </div>
                        </>
                    )}
                    {hasFilters && (
                        <Button variant="ghost" size="sm" onClick={resetFilters}>
                            {t("resetFilters")}
                            <X className="h-3 w-3" />
                        </Button>
                    )}
                </div>

                {loading ? (
                    <div className={`${PANEL_CLASSES} flex flex-1 items-center justify-center py-16`}>
                        <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                    </div>
                ) : isEmpty ? (
                    <div className={`${PANEL_CLASSES} flex flex-1 flex-col items-center justify-center py-16 text-center`}>
                        <Package className="mb-4 h-12 w-12 text-muted-foreground/30" />
                        <p className="font-display text-lg text-muted-foreground">
                            {emptyError ? t("error") : isPending ? t("noPendingOrders") : t("noExcludedOrders")}
                        </p>
                        {emptyError ? (
                            <p className="mt-1 text-sm text-destructive">{emptyError}</p>
                        ) : isPending && (
                            <p className="mt-1 text-sm text-muted-foreground/70">{t("pendingOrdersEmptyDescription")}</p>
                        )}
                    </div>
                ) : (
                    <>
                        <div className={`${PANEL_CLASSES} flex min-h-0 flex-1 flex-col overflow-hidden [&>div]:min-h-0 [&>div]:flex-1`}>
                            <Table className="[&_td]:px-3 [&_td]:py-2 [&_th]:h-9 [&_th]:px-3">
                                <TableHeader className="sticky top-0 z-10 bg-secondary/90 backdrop-blur-sm">
                                    {isPending ? (
                                        <TableRow>
                                            {sortableHead(t("orderId"), "id_ordine", "w-[90px]")}
                                            {sortableHead(t("customerName"), "cliente_nome", "min-w-[180px]")}
                                            {sortableHead(t("podPdr"), "pod_pdr")}
                                            {sortableHead(t("product"), "prodotto")}
                                            {sortableHead(t("agent"), "agente")}
                                            {sortableHead(t("orderStatus"), "stato")}
                                            {sortableHead(t("signatureDate"), "data_firma")}
                                            {sortableHead(t("paymentMethod"), "metodo_pagam")}
                                            <TableHead className="w-[100px]">{t("actions")}</TableHead>
                                        </TableRow>
                                    ) : (
                                        <TableRow>
                                            <TableHead className="min-w-[240px]">{t("exclusionReason")}</TableHead>
                                            <TableHead className="w-[120px]">{t("excludedOn")}</TableHead>
                                            <TableHead className="min-w-[240px]">{t("orders")}</TableHead>
                                            <TableHead className="w-[110px]">{t("actions")}</TableHead>
                                        </TableRow>
                                    )}
                                </TableHeader>
                                <TableBody>
                                    {isPending && processedOrders.map((order) => (
                                        <TableRow key={order.id_riga_ordine} className="hover:bg-secondary/30">
                                            <TableCell className="font-mono text-xs">#{order.id_ordine}</TableCell>
                                            <TableCell className="font-medium">{order.cliente_nome || "—"}</TableCell>
                                            <TableCell className="font-mono text-xs">{order.pod_pdr}</TableCell>
                                            <TableCell>{order.prodotto}</TableCell>
                                            <TableCell className="text-muted-foreground">{order.agente || "—"}</TableCell>
                                            <TableCell>{getStatusBadge(order.stato)}</TableCell>
                                            <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDate(order.data_firma)}</TableCell>
                                            <TableCell>{order.metodo_pagam || "—"}</TableCell>
                                            <TableCell>
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8"
                                                    disabled={mutatingRowId !== null}
                                                    onClick={() => {
                                                        setSelectedOrder(order);
                                                        setExclusionReason("");
                                                        setExclusionReasonError(null);
                                                    }}
                                                >
                                                    {mutatingRowId === order.id_riga_ordine ? <Loader2 className="h-4 w-4 animate-spin" /> : t("excludeOrder")}
                                                </Button>
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                    {!isPending && processedExcludedOrders.map((excludedOrder) => {
                                        const order = excludedOrder.ordine;

                                        return (
                                            <TableRow key={excludedOrder.id} className="hover:bg-secondary/30">
                                                <TableCell>{excludedOrder.motivo}</TableCell>
                                                <TableCell className="whitespace-nowrap font-mono text-xs text-muted-foreground">{formatDate(excludedOrder.data_esclusione)}</TableCell>
                                                <TableCell>
                                                    {order ? (
                                                        <>
                                                            <span className="font-medium">#{order.id_ordine} {order.cliente_nome || "—"}</span>
                                                            <p className="font-mono text-xs text-muted-foreground">{order.pod_pdr}</p>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <span className="text-muted-foreground">{t("unavailableOrder")}</span>
                                                            <p className="font-mono text-xs text-muted-foreground">{excludedOrder.id_riga_ordine}</p>
                                                        </>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className="h-8"
                                                        disabled={mutatingRowId !== null}
                                                        onClick={() => void onRestoreOrder(excludedOrder.id_riga_ordine)}
                                                    >
                                                        {mutatingRowId === excludedOrder.id_riga_ordine ? <Loader2 className="h-4 w-4 animate-spin" /> : t("restoreOrder")}
                                                    </Button>
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })}
                                    {(isPending ? processedOrders : processedExcludedOrders).length === 0 && (
                                        <TableRow>
                                            <TableCell colSpan={isPending ? 9 : 4} className="py-12 text-center text-muted-foreground">
                                                {t("noDataFound")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                        <p className="shrink-0 text-xs text-muted-foreground">{footer}</p>
                    </>
                )}
            </section>

            <OrdersImportDialog
                open={importOpen}
                onOpenChange={setImportOpen}
                importing={ordersImporting}
                progress={ordersProgress}
                result={ordersResult}
                onUpload={onOrdersUpload}
            />
            <SettlementsDialog open={settlementsOpen} onOpenChange={setSettlementsOpen} settlements={settlements} />

            <Dialog open={selectedOrder !== null} onOpenChange={closeExclusionDialog}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{t("excludeOrderTitle")}</DialogTitle>
                        <DialogDescription>{t("excludeOrderDescription")}</DialogDescription>
                    </DialogHeader>
                    <div className="space-y-2">
                        <label htmlFor="exclusion-reason" className="text-sm font-medium">{t("exclusionReason")}</label>
                        <Textarea id="exclusion-reason" value={exclusionReason} onChange={(event) => { setExclusionReason(event.target.value); setExclusionReasonError(null); }} placeholder={t("exclusionReasonPlaceholder")} disabled={mutatingRowId !== null} />
                        {exclusionReasonError && <p className="text-sm text-destructive">{exclusionReasonError}</p>}
                        {mutationError && <p className="text-sm text-destructive">{mutationError}</p>}
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => closeExclusionDialog(false)} disabled={mutatingRowId !== null}>{t("cancel")}</Button>
                        <Button onClick={() => void handleExclude()} disabled={mutatingRowId !== null}>{mutatingRowId === selectedOrder?.id_riga_ordine && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}{t("excludeOrder")}</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
