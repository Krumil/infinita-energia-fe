import { useState, useEffect } from "react";
import { ChevronRight, Download, Loader2, Search, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { CalcoloResultsProps } from "@/types/components";
import type { ProvvigioneData } from "@/types";

function sortByCliente(items: ProvvigioneData[]): ProvvigioneData[] {
    return [...items].sort((a, b) => a.cliente.localeCompare(b.cliente, "it"));
}

function filterItems(items: ProvvigioneData[], query: string): ProvvigioneData[] {
    if (!query.trim()) return items;
    const lowerQuery = query.toLowerCase();
    return items.filter(
        (item) =>
            item.cliente.toLowerCase().includes(lowerQuery) ||
            item.pod_pdr.toLowerCase().includes(lowerQuery) ||
            item.regola.toLowerCase().includes(lowerQuery),
    );
}

export function CalcoloResults({ data, compDal }: CalcoloResultsProps) {
    const { t, language } = useTranslation();
    const [expandedSeller, setExpandedSeller] = useState<string | null>(null);
    const [filterQuery, setFilterQuery] = useState<string>("");
    const [isGeneratingZip, setIsGeneratingZip] = useState(false);
    const [periodDisplay, setPeriodDisplay] = useState<string | null>(null);

    const sellers = Object.entries(data).sort((a, b) => b[1].totale_provvigione - a[1].totale_provvigione);
    const grandTotal = sellers.reduce((sum, [, val]) => sum + val.totale_provvigione, 0);

    useEffect(() => {
        import("@/lib/exportUtils").then(({ formatPeriodDisplay }) => {
            setPeriodDisplay(formatPeriodDisplay(compDal, language));
        });
    }, [compDal, language]);

    // Reset filter when changing seller
    const handleExpandSeller = (sellerName: string) => {
        if (expandedSeller !== sellerName) {
            setFilterQuery("");
        }
        setExpandedSeller(expandedSeller === sellerName ? null : sellerName);
    };

    const handleDownloadZip = async () => {
        setIsGeneratingZip(true);
        try {
            const { extractPeriodFromCompDal, generateCommissionsZip, downloadBlob } =
                await import("@/lib/exportUtils");
            const periodFolder = extractPeriodFromCompDal(compDal);
            const blob = await generateCommissionsZip(data, periodFolder);
            downloadBlob(blob, `provvigioni-${periodFolder}.zip`);
        } catch (error) {
            console.error("Error generating ZIP:", error);
        } finally {
            setIsGeneratingZip(false);
        }
    };

    return (
        <div className="space-y-6">
            <div className="kpi-card p-6 text-center">
                <span className="kpi-label">
                    {t("totalCommission")}
                    {periodDisplay && <span className="text-energia-accent"> — {periodDisplay}</span>}
                </span>
                <div className="kpi-value text-5xl mt-3">{formatCurrency(grandTotal)}</div>
                <p className="font-body text-muted-foreground mt-3 text-sm italic">
                    {sellers.length} {t("beneficiary").toLowerCase()}(i)
                </p>
                <div className="mt-4">
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={handleDownloadZip}
                        disabled={isGeneratingZip}
                        className="gap-2"
                    >
                        {isGeneratingZip ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <Download className="h-4 w-4" />
                        )}
                        {isGeneratingZip ? t("generatingZip") : t("downloadZip")}
                    </Button>
                </div>
            </div>

            <div className="section-divider" />

            <div className="space-y-4">
                <h3 className="font-display text-xl">
                    {t("summaryByBeneficiary")}
                    {periodDisplay && <span className="text-muted-foreground font-normal"> — {periodDisplay}</span>}
                </h3>
                <div className="ledger-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead>{t("beneficiary")}</TableHead>
                                <TableHead className="text-right">{t("records")}</TableHead>
                                <TableHead className="text-right">{t("totalCommission")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {sellers.map(([sellerName, sellerData]) => (
                                <>
                                    <TableRow
                                        key={sellerName}
                                        className="cursor-pointer hover:bg-secondary/20"
                                        onClick={() => handleExpandSeller(sellerName)}
                                    >
                                        <TableCell className="w-12">
                                            <ChevronRight
                                                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                                    expandedSeller === sellerName ? "rotate-90" : ""
                                                }`}
                                            />
                                        </TableCell>
                                        <TableCell className="font-medium">{sellerName}</TableCell>
                                        <TableCell className="text-right font-mono">
                                            {sellerData.dati_provvigione.length}
                                        </TableCell>
                                        <TableCell className="text-right font-mono font-semibold text-energia-accent">
                                            {formatCurrency(sellerData.totale_provvigione)}
                                        </TableCell>
                                    </TableRow>
                                    {expandedSeller === sellerName &&
                                        (() => {
                                            const sortedItems = sortByCliente(sellerData.dati_provvigione);
                                            const filteredItems = filterItems(sortedItems, filterQuery);
                                            return (
                                                <TableRow key={`${sellerName}-details`}>
                                                    <TableCell colSpan={4} className="p-0 bg-secondary/10">
                                                        <div className="p-4 space-y-3">
                                                            <div className="relative">
                                                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                                <Input
                                                                    placeholder={t("filterPlaceholder")}
                                                                    value={filterQuery}
                                                                    onChange={(e) => setFilterQuery(e.target.value)}
                                                                    className="pl-9 pr-9 h-9"
                                                                    onClick={(e) => e.stopPropagation()}
                                                                />
                                                                {filterQuery && (
                                                                    <button
                                                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                                                        onClick={(e) => {
                                                                            e.stopPropagation();
                                                                            setFilterQuery("");
                                                                        }}
                                                                    >
                                                                        <X className="h-4 w-4" />
                                                                    </button>
                                                                )}
                                                            </div>

                                                            <div className="max-h-80 overflow-y-auto border rounded-md bg-background/50">
                                                                <Table>
                                                                    <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                                                        <TableRow>
                                                                            <TableHead>{t("client")}</TableHead>
                                                                            <TableHead>{t("podPdr")}</TableHead>
                                                                            <TableHead>{t("rule")}</TableHead>
                                                                            <TableHead className="text-right">
                                                                                {t("commission")}
                                                                            </TableHead>
                                                                        </TableRow>
                                                                    </TableHeader>
                                                                    <TableBody>
                                                                        {filteredItems.length > 0 ? (
                                                                            filteredItems.map((item, idx) => (
                                                                                <TableRow key={idx}>
                                                                                    <TableCell className="font-medium">
                                                                                        {item.cliente}
                                                                                    </TableCell>
                                                                                    <TableCell className="font-mono text-xs">
                                                                                        {item.pod_pdr}
                                                                                    </TableCell>
                                                                                    <TableCell
                                                                                        className="text-sm text-muted-foreground max-w-xs truncate"
                                                                                        title={item.regola}
                                                                                    >
                                                                                        {item.regola}
                                                                                    </TableCell>
                                                                                    <TableCell className="text-right font-mono font-semibold">
                                                                                        {formatCurrency(
                                                                                            item.importo_provvigione,
                                                                                        )}
                                                                                    </TableCell>
                                                                                </TableRow>
                                                                            ))
                                                                        ) : (
                                                                            <TableRow>
                                                                                <TableCell
                                                                                    colSpan={4}
                                                                                    className="text-center text-muted-foreground py-8"
                                                                                >
                                                                                    {t("noDataFound")}
                                                                                </TableCell>
                                                                            </TableRow>
                                                                        )}
                                                                    </TableBody>
                                                                </Table>
                                                            </div>

                                                            <div className="flex items-center justify-between text-xs text-muted-foreground">
                                                                <span>
                                                                    {filterQuery &&
                                                                    filteredItems.length !==
                                                                        sellerData.dati_provvigione.length
                                                                        ? `${t("showing")} ${filteredItems.length} ${t(
                                                                              "of",
                                                                          )} ${sellerData.dati_provvigione.length}`
                                                                        : `${sellerData.dati_provvigione.length} ${t(
                                                                              "records",
                                                                          ).toLowerCase()}`}
                                                                </span>
                                                                {filteredItems.length > 0 && (
                                                                    <span className="font-mono">
                                                                        {t("total")}:{" "}
                                                                        {formatCurrency(
                                                                            filteredItems.reduce(
                                                                                (sum, item) =>
                                                                                    sum +
                                                                                    (item.importo_provvigione || 0),
                                                                                0,
                                                                            ),
                                                                        )}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })()}
                                </>
                            ))}
                        </TableBody>
                        <TableFooter>
                            <TableRow>
                                <TableCell colSpan={2} className="font-display font-semibold">
                                    {t("total")}
                                </TableCell>
                                <TableCell className="text-right font-mono">
                                    {sellers.reduce((sum, [, val]) => sum + val.dati_provvigione.length, 0)}
                                </TableCell>
                                <TableCell className="text-right font-mono font-bold text-lg text-energia-accent">
                                    {formatCurrency(grandTotal)}
                                </TableCell>
                            </TableRow>
                        </TableFooter>
                    </Table>
                </div>
            </div>
        </div>
    );
}
