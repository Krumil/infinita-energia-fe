import { useState, useMemo } from "react";
import {
    CheckCircle,
    Loader2,
    RefreshCw,
    Search,
    X,
    Package,
    FileSpreadsheet,
    Calendar,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Download,
} from "lucide-react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { FileDropzone } from "@/components";
import { DatePicker } from "@/components/DatePicker";
import { useTranslation } from "@/hooks/useTranslation";
import { exportPendingOrdersExcel } from "@/lib/exportUtils";
import { formatDate } from "@/lib/utils";
import type { ImportExcelResponse, ExcludedOrder, PendingOrder } from "@/types";
import { z } from "zod";

interface SettlementsResult {
    success: boolean;
    message: string;
    count: number;
}

interface OrdersTabProps {
    ordersImporting: boolean;
    ordersProgress: number;
    ordersResult: ImportExcelResponse | null;
    onOrdersUpload: (files: File[]) => void;
    settlementsImporting: boolean;
    settlementsResult: SettlementsResult | null;
    onSettlementsUpload: (files: File[], referencePeriod: string) => void;
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

// Generate period options for the last 24 months
function generatePeriodOptions(): { value: string; label: string }[] {
    const options: { value: string; label: string }[] = [];
    const now = new Date();

    const monthNames = [
        "Gennaio",
        "Febbraio",
        "Marzo",
        "Aprile",
        "Maggio",
        "Giugno",
        "Luglio",
        "Agosto",
        "Settembre",
        "Ottobre",
        "Novembre",
        "Dicembre",
    ];

    for (let i = 0; i < 24; i++) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const year = date.getFullYear();
        const month = date.getMonth();
        const value = `${year}-${String(month + 1).padStart(2, "0")}`;
        const label = `${monthNames[month]} ${year}`;
        options.push({ value, label });
    }

    return options;
}

const PERIOD_OPTIONS = generatePeriodOptions();


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

function getStatusBadge(status: string | null) {
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

export function OrdersTab({
    ordersImporting,
    ordersProgress,
    ordersResult,
    onOrdersUpload,
    settlementsImporting,
    settlementsResult,
    onSettlementsUpload,
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
}: OrdersTabProps) {
    const { t } = useTranslation();
    const [filterQuery, setFilterQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("cliente_nome");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [selectedPeriod, setSelectedPeriod] = useState<string>(PERIOD_OPTIONS[0]?.value || "");
    const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);
    const [ordersView, setOrdersView] = useState<"pending" | "excluded">("pending");
    const [selectedOrder, setSelectedOrder] = useState<PendingOrder | null>(null);
    const [exclusionReason, setExclusionReason] = useState("");
    const [exclusionReasonError, setExclusionReasonError] = useState<string | null>(null);

    const handleRefreshWithDates = () => {
        void onRefreshOrders(startDate || undefined, endDate || undefined);
    };

    // Handle sort
    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    // Process orders: filter then sort
    const processedOrders = useMemo(() => {
        const filtered = filterOrders(pendingOrders, filterQuery);

        return sortOrders(filtered, sortField, sortDirection);
    }, [pendingOrders, filterQuery, sortField, sortDirection]);

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

    const handleSettlementsFiles = (files: File[]) => {
        if (files.length > 0 && selectedPeriod) {
            setPendingFiles(files);
        }
    };

    const confirmUpload = () => {
        if (pendingFiles && selectedPeriod) {
            onSettlementsUpload(pendingFiles, selectedPeriod);
            setPendingFiles(null);
        }
    };

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-11.5rem)]">
            <section className="grid shrink-0 gap-3 md:grid-cols-2">
                <div className="ledger-card p-3 space-y-2">
                    <div className="flex items-center gap-2">
                        <FileSpreadsheet className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                        <span className="text-sm font-medium">{t("importOrdersTitle")}</span>
                    </div>
                    <div className="dropzone-compact">
                        <FileDropzone
                            accept=".xlsx,.xls"
                            maxSizeMB={50}
                            onFiles={onOrdersUpload}
                            disabled={ordersImporting}
                        />
                    </div>
                    {ordersImporting && (
                        <div className="flex items-center gap-2">
                            <Progress value={ordersProgress} className="h-1 flex-1 bg-secondary [&>div]:bg-blue-600 [&>div]:duration-300" />
                            <span className="text-xs font-mono text-muted-foreground">{ordersProgress}%</span>
                        </div>
                    )}
                    {ordersResult && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>
                                +{ordersResult.details.ordini.nuovi} {t("orders").toLowerCase()}
                            </span>
                        </div>
                    )}
                </div>

                <div className="ledger-card p-3 space-y-2">
                    <div className="flex items-center gap-2 w-full justify-between">
                        <div className="flex items-center gap-2">
                            <Calendar className="h-4 w-4 text-emerald-600 dark:text-emerald-400" />
                            <span className="text-sm font-medium">{t("importLiquidationsTitle")}</span>
                        </div>
                        <div className="flex items-center gap-4">
                            <label className="text-xs text-muted-foreground whitespace-nowrap flex-shrink-0">
                                {t("competenzaPeriodLabel")}
                            </label>
                            <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                                <SelectTrigger className="h-8 text-sm">
                                    <SelectValue placeholder={t("selectPeriod")} />
                                </SelectTrigger>
                                <SelectContent>
                                    {PERIOD_OPTIONS.map((option) => (
                                        <SelectItem key={option.value} value={option.value}>
                                            {option.label}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div className="dropzone-compact">
                        <FileDropzone
                            accept=".xlsx,.xls"
                            maxSizeMB={50}
                            onFiles={handleSettlementsFiles}
                            disabled={settlementsImporting || !selectedPeriod}
                        />
                    </div>
                    {settlementsImporting && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                            {t("processing")}...
                        </div>
                    )}
                    {settlementsResult && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>
                                {settlementsResult.count} {t("recordsProcessed").toLowerCase()}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col">
                <Tabs value={ordersView} onValueChange={(value) => {
                    const parsedView = ordersViewSchema.safeParse(value);

                    if (parsedView.success) {
                        setOrdersView(parsedView.data);
                    }
                }} className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-energia-accent" />
                        <h2 className="font-display text-xl">
                            {ordersView === "pending" ? t("pendingOrders") : t("excludedOrders")}
                            {(ordersView === "pending" ? processedOrders.length : processedExcludedOrders.length) > 0 && (
                                <span className="ml-2 text-muted-foreground font-normal text-base">
                                    ({ordersView === "pending" ? processedOrders.length : processedExcludedOrders.length})
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        {ordersView === "pending" && <>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">{t("startDate")}</label>
                                <DatePicker value={startDate} onChange={onStartDateChange} placeholder={t("startDate")} className="h-9" />
                            </div>
                            <div className="flex items-center gap-2">
                                <label className="text-xs text-muted-foreground whitespace-nowrap">{t("endDate")}</label>
                                <DatePicker value={endDate} onChange={onEndDateChange} placeholder={t("endDate")} className="h-9" />
                            </div>
                        </>}
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                placeholder={t("filterPlaceholder")}
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="pl-9 pr-9 h-9 w-64"
                            />
                            {filterQuery && (
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="absolute right-3 top-1/2 h-auto w-auto -translate-y-1/2 p-0 text-[length:inherit] [font-weight:inherit] text-muted-foreground hover:bg-transparent hover:text-foreground [&_svg]:!size-4"
                                    onClick={() => setFilterQuery("")}
                                    aria-label={t("clearFilter")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshWithDates}
                            disabled={ordersView === "pending" ? pendingOrdersLoading : excludedOrdersLoading}
                        >
                            {(ordersView === "pending" ? pendingOrdersLoading : excludedOrdersLoading) ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                        {ordersView === "pending" && <Button
                            variant="outline"
                            size="sm"
                            onClick={() => exportPendingOrdersExcel(processedOrders)}
                            disabled={pendingOrdersLoading || processedOrders.length === 0}
                        >
                            <Download className="h-4 w-4" />
                        </Button>}
                    </div>
                </div>

                <TabsList className="mb-4 w-fit">
                    <TabsTrigger value="pending">{t("pendingOrdersView")}</TabsTrigger>
                    <TabsTrigger value="excluded">{t("excludedOrdersView").replace("{count}", String(excludedOrdersCount))}</TabsTrigger>
                </TabsList>

                <TabsContent value="pending" className="mt-0 flex min-h-0 flex-1 flex-col">
                {pendingOrdersLoading ? (
                    <div className="ledger-card flex flex-1 items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                    </div>
                ) : pendingOrders.length === 0 ? (
                    <div className="ledger-card flex flex-1 flex-col items-center justify-center py-16 text-center">
                        <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="font-display text-lg text-muted-foreground">{pendingOrdersError ? t("error") : t("noPendingOrders")}</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">{pendingOrdersError || t("pendingOrdersEmptyDescription")}</p>
                    </div>
                ) : (
                    <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                        <div className="min-h-0 flex-1 overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead className="w-[70px]">
                                            <SortableHeader
                                                label={t("orderId")}
                                                field="id_ordine"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="min-w-[180px]">
                                            <SortableHeader
                                                label={t("customerName")}
                                                field="cliente_nome"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[160px]">
                                            <SortableHeader
                                                label={t("podPdr")}
                                                field="pod_pdr"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[100px]">
                                            <SortableHeader
                                                label={t("product")}
                                                field="prodotto"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[140px]">
                                            <SortableHeader
                                                label={t("agent")}
                                                field="agente"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[130px]">
                                            <SortableHeader
                                                label={t("orderStatus")}
                                                field="stato"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[100px]">
                                            <SortableHeader
                                                label={t("signatureDate")}
                                                field="data_firma"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[90px]">
                                            <SortableHeader
                                                label={t("paymentMethod")}
                                                field="metodo_pagam"
                                                currentField={sortField}
                                                direction={sortDirection}
                                                onSort={handleSort}
                                            />
                                        </TableHead>
                                        <TableHead className="w-[100px]">{t("actions")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedOrders.length > 0 ? (
                                        processedOrders.map((order) => (
                                            <TableRow key={order.id_riga_ordine} className="hover:bg-secondary/30">
                                                <TableCell className="font-mono text-xs">#{order.id_ordine}</TableCell>
                                                <TableCell className="font-medium">
                                                    {order.cliente_nome || "—"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{order.pod_pdr}</TableCell>
                                                <TableCell>{order.prodotto}</TableCell>
                                                <TableCell className="text-muted-foreground">
                                                    {order.agente || "—"}
                                                </TableCell>
                                                <TableCell>{getStatusBadge(order.stato)}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {formatDate(order.data_firma)}
                                                </TableCell>
                                                <TableCell>{order.metodo_pagam || "—"}</TableCell>
                                                <TableCell>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
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
                </TabsContent>

                <TabsContent value="excluded" className="mt-0 flex min-h-0 flex-1 flex-col">
                    {excludedOrdersLoading ? (
                        <div className="ledger-card flex flex-1 items-center justify-center py-16"><Loader2 className="h-8 w-8 animate-spin text-energia-accent" /></div>
                    ) : excludedOrders.length === 0 ? (
                        <div className="ledger-card flex flex-1 flex-col items-center justify-center py-16 text-center">
                            <Package className="mb-4 h-12 w-12 text-muted-foreground/30" />
                            <p className="font-display text-lg text-muted-foreground">{excludedOrdersError ? t("error") : t("noExcludedOrders")}</p>
                            {excludedOrdersError && <p className="mt-1 text-sm text-destructive">{excludedOrdersError}</p>}
                        </div>
                    ) : (
                        <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                            <div className="min-h-0 flex-1 overflow-auto">
                                <Table>
                                    <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                                        <TableRow>
                                            <TableHead className="min-w-[200px]">{t("exclusionReason")}</TableHead>
                                            <TableHead className="w-[150px]">{t("excludedOn")}</TableHead>
                                            <TableHead className="min-w-[250px]">{t("orders")}</TableHead>
                                            <TableHead className="w-[100px]">{t("actions")}</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {processedExcludedOrders.length > 0 ? processedExcludedOrders.map((excludedOrder) => {
                                            const order = excludedOrder.ordine;

                                            return <TableRow key={excludedOrder.id} className="hover:bg-secondary/30">
                                                <TableCell>{excludedOrder.motivo}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">{formatDate(excludedOrder.data_esclusione)}</TableCell>
                                                <TableCell>
                                                    {order ? <div><span className="font-medium">#{order.id_ordine} {order.cliente_nome || "—"}</span><p className="font-mono text-xs text-muted-foreground">{order.pod_pdr}</p></div> : <div><span>{t("unavailableOrder")}</span><p className="font-mono text-xs text-muted-foreground">{excludedOrder.id_riga_ordine}</p></div>}
                                                </TableCell>
                                                <TableCell><Button variant="outline" size="sm" disabled={mutatingRowId !== null} onClick={() => void onRestoreOrder(excludedOrder.id_riga_ordine)}>{mutatingRowId === excludedOrder.id_riga_ordine ? <Loader2 className="h-4 w-4 animate-spin" /> : t("restoreOrder")}</Button></TableCell>
                                            </TableRow>;
                                        }) : <TableRow><TableCell colSpan={4} className="py-8 text-center text-muted-foreground">{t("noDataFound")}</TableCell></TableRow>}
                                    </TableBody>
                                </Table>
                            </div>
                        </div>
                    )}
                </TabsContent>
                </Tabs>
            </section>

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

            <AlertDialog open={pendingFiles !== null} onOpenChange={(open) => !open && setPendingFiles(null)}>
                <AlertDialogContent className="w-auto min-w-[280px]">
                    <AlertDialogHeader>
                        <AlertDialogTitle className="text-center">{t("confirmUploadTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className="text-center">{t("confirmUploadDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-2">
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="mx-auto w-48 h-11 text-base">
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PERIOD_OPTIONS.map((option) => (
                                    <SelectItem key={option.value} value={option.value}>
                                        {option.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    <AlertDialogFooter className="grid grid-cols-2 gap-2">
                        <AlertDialogCancel className="mt-0">{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUpload}>{t("confirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
