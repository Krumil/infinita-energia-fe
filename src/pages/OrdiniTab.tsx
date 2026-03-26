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
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone } from "@/components";
import { DatePicker } from "@/components/DatePicker";
import { useTranslation } from "@/hooks/useTranslation";
import type { ImportExcelResponse, PendingOrder } from "@/types";

interface LiquidazioniResult {
    success: boolean;
    message: string;
    count: number;
}

interface OrdiniTabProps {
    ordersImporting: boolean;
    ordersProgress: number;
    ordersResult: ImportExcelResponse | null;
    onOrdersUpload: (files: File[]) => void;
    liquidazioniImporting: boolean;
    liquidazioniResult: LiquidazioniResult | null;
    onLiquidazioniUpload: (files: File[], competenzaPeriod: string) => void;
    pendingOrders: PendingOrder[];
    pendingOrdersCount: number;
    pendingOrdersLoading: boolean;
    onRefreshPendingOrders: (startDate?: string, endDate?: string) => void;
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

function formatDate(isoDate: string | null): string {
    if (!isoDate) return "—";
    const date = new Date(isoDate);
    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
}

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

function getStatusBadge(status: string | null) {
    const configs: Record<string, { bg: string; text: string }> = {
        Accettato: {
            bg: "bg-emerald-100 dark:bg-emerald-900/40",
            text: "text-emerald-700 dark:text-emerald-400",
        },
        Confermato: {
            bg: "bg-emerald-100 dark:bg-emerald-900/40",
            text: "text-emerald-700 dark:text-emerald-400",
        },
        Trasferito: {
            bg: "bg-blue-100 dark:bg-blue-900/40",
            text: "text-blue-700 dark:text-blue-400",
        },
        "In verifica": {
            bg: "bg-amber-100 dark:bg-amber-900/40",
            text: "text-amber-700 dark:text-amber-400",
        },
        Sospeso: {
            bg: "bg-orange-100 dark:bg-orange-900/40",
            text: "text-orange-700 dark:text-orange-400",
        },
        Ko: {
            bg: "bg-red-100 dark:bg-red-900/40",
            text: "text-red-700 dark:text-red-400",
        },
        KO: {
            bg: "bg-red-100 dark:bg-red-900/40",
            text: "text-red-700 dark:text-red-400",
        },
        Annullato: {
            bg: "bg-red-100 dark:bg-red-900/40",
            text: "text-red-700 dark:text-red-400",
        },
    };
    const config = configs[status || ""] || {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-400",
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
        >
            {status || "—"}
        </span>
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
        <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
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
        </button>
    );
}

export function OrdiniTab({
    ordersImporting,
    ordersProgress,
    ordersResult,
    onOrdersUpload,
    liquidazioniImporting,
    liquidazioniResult,
    onLiquidazioniUpload,
    pendingOrders,
    pendingOrdersCount,
    pendingOrdersLoading,
    onRefreshPendingOrders,
    startDate,
    endDate,
    onStartDateChange,
    onEndDateChange,
}: OrdiniTabProps) {
    const { t } = useTranslation();
    const [filterQuery, setFilterQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("cliente_nome");
    const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
    const [selectedPeriod, setSelectedPeriod] = useState<string>(PERIOD_OPTIONS[0]?.value || "");
    const [pendingFiles, setPendingFiles] = useState<File[] | null>(null);

    const handleRefreshWithDates = () => {
        onRefreshPendingOrders(startDate || undefined, endDate || undefined);
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

    const handleLiquidazioniFiles = (files: File[]) => {
        if (files.length > 0 && selectedPeriod) {
            setPendingFiles(files);
        }
    };

    const confirmUpload = () => {
        if (pendingFiles && selectedPeriod) {
            onLiquidazioniUpload(pendingFiles, selectedPeriod);
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
                            <div className="flex-1 h-1 bg-secondary rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-blue-600 transition-all duration-300"
                                    style={{ width: `${ordersProgress}%` }}
                                />
                            </div>
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
                            onFiles={handleLiquidazioniFiles}
                            disabled={liquidazioniImporting || !selectedPeriod}
                        />
                    </div>
                    {liquidazioniImporting && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin text-emerald-600" />
                            {t("processing")}...
                        </div>
                    )}
                    {liquidazioniResult && (
                        <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400">
                            <CheckCircle className="h-3 w-3" />
                            <span>
                                {liquidazioniResult.count} {t("recordsProcessed").toLowerCase()}
                            </span>
                        </div>
                    )}
                </div>
            </section>

            <section className="flex min-h-0 flex-1 flex-col">
                <div className="mb-4 flex shrink-0 flex-wrap items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <Package className="h-5 w-5 text-energia-accent" />
                        <h2 className="font-display text-xl">
                            {t("pendingOrders")}
                            {pendingOrdersCount > 0 && (
                                <span className="ml-2 text-muted-foreground font-normal text-base">
                                    ({pendingOrdersCount})
                                </span>
                            )}
                        </h2>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">{t("startDate")}</label>
                            <DatePicker
                                value={startDate}
                                onChange={onStartDateChange}
                                placeholder={t("startDate")}
                                className="h-9"
                            />
                        </div>
                        <div className="flex items-center gap-2">
                            <label className="text-xs text-muted-foreground whitespace-nowrap">{t("endDate")}</label>
                            <DatePicker
                                value={endDate}
                                onChange={onEndDateChange}
                                placeholder={t("endDate")}
                                className="h-9"
                            />
                        </div>
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
                            <Input
                                placeholder={t("filterPlaceholder")}
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="pl-9 pr-9 h-9 w-64"
                            />
                            {filterQuery && (
                                <button
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setFilterQuery("")}
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            )}
                        </div>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={handleRefreshWithDates}
                            disabled={pendingOrdersLoading}
                        >
                            {pendingOrdersLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                <RefreshCw className="h-4 w-4" />
                            )}
                        </Button>
                    </div>
                </div>

                {pendingOrdersLoading ? (
                    <div className="ledger-card flex flex-1 items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                    </div>
                ) : pendingOrders.length === 0 ? (
                    <div className="ledger-card flex flex-1 flex-col items-center justify-center py-16 text-center">
                        <Package className="h-12 w-12 text-muted-foreground/30 mb-4" />
                        <p className="font-display text-lg text-muted-foreground">{t("noPendingOrders")}</p>
                        <p className="text-sm text-muted-foreground/70 mt-1">
                            Tutti gli ordini hanno una liquidazione associata
                        </p>
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
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {processedOrders.length > 0 ? (
                                        processedOrders.map((order) => (
                                            <TableRow key={order.id_ordine} className="hover:bg-secondary/30">
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
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                                {t("noDataFound")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                )}
            </section>

            <AlertDialog open={pendingFiles !== null} onOpenChange={(open) => !open && setPendingFiles(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmUploadTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>{t("confirmUploadDescription")}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <div className="py-4 space-y-3">
                        <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                            <SelectTrigger className="mx-auto w-fit h-auto px-4 py-2 text-2xl font-semibold tracking-tight">
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
                        {pendingFiles && (
                            <p className="text-center text-sm text-muted-foreground">
                                {pendingFiles.map((f) => f.name).join(", ")}
                            </p>
                        )}
                    </div>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmUpload}>{t("confirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
