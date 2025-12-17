import { useState } from "react";
import { CheckCircle, AlertCircle, Loader2, RefreshCw, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { FileDropzone, EmptyState } from "@/components";
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
    onLiquidazioniUpload: (files: File[]) => void;
    pendingOrders: PendingOrder[];
    pendingOrdersCount: number;
    pendingOrdersLoading: boolean;
    onRefreshPendingOrders: () => void;
}

function formatDate(isoDate: string | null): string {
    if (!isoDate) return "-";
    return new Date(isoDate).toLocaleDateString("it-IT");
}

function filterPendingOrders(orders: PendingOrder[], query: string): PendingOrder[] {
    if (!query.trim()) return orders;
    const lowerQuery = query.toLowerCase();
    return orders.filter(
        (order) =>
            order.cliente_nome?.toLowerCase().includes(lowerQuery) ||
            order.pod_pdr.toLowerCase().includes(lowerQuery) ||
            order.agente?.toLowerCase().includes(lowerQuery) ||
            order.prodotto.toLowerCase().includes(lowerQuery) ||
            order.cod_fisc.toLowerCase().includes(lowerQuery) ||
            String(order.id_ordine).includes(lowerQuery)
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
}: OrdiniTabProps) {
    const { t } = useTranslation();
    const [filterQuery, setFilterQuery] = useState("");

    const filteredOrders = filterPendingOrders(pendingOrders, filterQuery);

    return (
        <div className="space-y-8">
            <div className="grid gap-8 lg:grid-cols-2">
                <div className="space-y-4">
                    <div>
                        <h2 className="font-display text-xl">{t("importOrdersTitle")}</h2>
                        <p className="font-body text-muted-foreground mt-1">{t("importOrdersDesc")}</p>
                    </div>
                    <div className="ledger-card p-6 space-y-6">
                        <FileDropzone
                            accept=".xlsx,.xls"
                            maxSizeMB={50}
                            onFiles={onOrdersUpload}
                            disabled={ordersImporting}
                        />
                        {ordersImporting && (
                            <div className="space-y-3">
                                <div className="progress-ledger">
                                    <div role="progressbar" style={{ width: `${ordersProgress}%` }} />
                                </div>
                                <p className="font-mono text-sm text-center text-muted-foreground">
                                    {t("processing")} {ordersProgress}%
                                </p>
                            </div>
                        )}
                        {ordersResult && (
                            <Alert className="bg-sage/10 border-sage/30">
                                <CheckCircle className="h-4 w-4 text-sage" />
                                <AlertTitle className="font-display">{t("ordersImportResult")}</AlertTitle>
                                <AlertDescription className="font-mono text-sm mt-3 grid grid-cols-2 gap-2">
                                    <div>
                                        {t("clients")}:{" "}
                                        <span className="text-foreground">{ordersResult.details.clienti.nuovi}</span>{" "}
                                        {t("newRecords")}
                                    </div>
                                    <div>
                                        {t("products")}:{" "}
                                        <span className="text-foreground">{ordersResult.details.prodotti.nuovi}</span>{" "}
                                        {t("newRecords")}
                                    </div>
                                    <div>
                                        {t("technicalData")}:{" "}
                                        <span className="text-foreground">
                                            {ordersResult.details.dati_tecnici.nuovi}
                                        </span>{" "}
                                        {t("newRecords")}
                                    </div>
                                    <div>
                                        {t("orders")}:{" "}
                                        <span className="text-foreground">{ordersResult.details.ordini.nuovi}</span>{" "}
                                        {t("newRecords")}
                                    </div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>

                <div className="space-y-4">
                    <div>
                        <h2 className="font-display text-xl">{t("importLiquidationsTitle")}</h2>
                        <p className="font-body text-muted-foreground mt-1">{t("importLiquidationsDesc")}</p>
                    </div>
                    <div className="ledger-card p-6 space-y-6">
                        <FileDropzone
                            accept=".xlsx,.xls"
                            maxSizeMB={50}
                            onFiles={onLiquidazioniUpload}
                            disabled={liquidazioniImporting}
                        />
                        {liquidazioniImporting && (
                            <div className="space-y-3">
                                <div className="flex items-center justify-center gap-3">
                                    <Loader2 className="h-5 w-5 animate-spin text-energia-accent" />
                                    <p className="font-mono text-sm text-muted-foreground">{t("processing")}...</p>
                                </div>
                            </div>
                        )}
                        {liquidazioniResult && (
                            <Alert className="bg-sage/10 border-sage/30">
                                <CheckCircle className="h-4 w-4 text-sage" />
                                <AlertTitle className="font-display">{t("liquidationsImportResult")}</AlertTitle>
                                <AlertDescription className="font-mono text-sm mt-3">
                                    <div>
                                        {t("recordsProcessed")}:{" "}
                                        <span className="text-foreground">{liquidazioniResult.count}</span>
                                    </div>
                                    <div className="mt-1 text-muted-foreground">{liquidazioniResult.message}</div>
                                </AlertDescription>
                            </Alert>
                        )}
                    </div>
                </div>
            </div>

            <div className="section-divider" />

            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <div>
                        <h2 className="font-display text-xl">
                            {t("pendingOrders")}
                            {pendingOrdersCount > 0 && (
                                <span className="ml-2 text-muted-foreground">({pendingOrdersCount})</span>
                            )}
                        </h2>
                        <p className="font-body text-muted-foreground mt-1">{t("pendingOrdersDesc")}</p>
                    </div>
                    <Button
                        variant="outline"
                        size="icon"
                        onClick={onRefreshPendingOrders}
                        disabled={pendingOrdersLoading}
                    >
                        {pendingOrdersLoading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {pendingOrdersLoading ? (
                    <div className="flex items-center justify-center py-16 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
                        <span className="font-display">{t("loading")}</span>
                    </div>
                ) : pendingOrders.length > 0 ? (
                    <div className="ledger-card overflow-hidden">
                        <div className="p-4 border-b border-border/50">
                            <div className="flex items-center justify-between gap-4">
                                <div className="relative flex-1 max-w-sm">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                    <Input
                                        placeholder={t("filterPlaceholder")}
                                        value={filterQuery}
                                        onChange={(e) => setFilterQuery(e.target.value)}
                                        className="pl-9 pr-9 h-9"
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
                                <span className="text-sm text-muted-foreground font-mono">
                                    {filterQuery && filteredOrders.length !== pendingOrdersCount
                                        ? `${t("showing")} ${filteredOrders.length} ${t("of")} ${pendingOrdersCount}`
                                        : `${pendingOrdersCount} ${t("records").toLowerCase()}`}
                                </span>
                            </div>
                        </div>
                        <div className="max-h-[500px] overflow-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead className="w-[80px]">{t("orderId")}</TableHead>
                                        <TableHead>{t("customerName")}</TableHead>
                                        <TableHead>{t("podPdr")}</TableHead>
                                        <TableHead>{t("product")}</TableHead>
                                        <TableHead>{t("agent")}</TableHead>
                                        <TableHead>{t("orderStatus")}</TableHead>
                                        <TableHead>{t("signatureDate")}</TableHead>
                                        <TableHead>{t("paymentMethod")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredOrders.length > 0 ? (
                                        filteredOrders.map((order) => (
                                            <TableRow key={order.id_ordine}>
                                                <TableCell className="font-mono text-xs">{order.id_ordine}</TableCell>
                                                <TableCell className="font-medium">
                                                    {order.cliente_nome || "-"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">{order.pod_pdr}</TableCell>
                                                <TableCell>{order.prodotto}</TableCell>
                                                <TableCell>{order.agente || "-"}</TableCell>
                                                <TableCell>
                                                    <span
                                                        className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${
                                                            order.stato === "Confermato"
                                                                ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400"
                                                                : order.stato === "In Lavorazione"
                                                                ? "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-400"
                                                                : "bg-secondary text-muted-foreground"
                                                        }`}
                                                    >
                                                        {order.stato || "-"}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {formatDate(order.data_firma)}
                                                </TableCell>
                                                <TableCell>{order.metodo_pagam || "-"}</TableCell>
                                            </TableRow>
                                        ))
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                {t("noDataFound")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                ) : (
                    <EmptyState message={t("noPendingOrders")} icon={<AlertCircle className="h-16 w-16" />} />
                )}
            </div>
        </div>
    );
}
