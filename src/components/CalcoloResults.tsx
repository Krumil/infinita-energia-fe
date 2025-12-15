import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import type { CalcoloResultsProps } from "@/types/components";

function formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

export function CalcoloResults({ data }: CalcoloResultsProps) {
    const { t } = useTranslation();
    const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

    const sellers = Object.entries(data);
    const grandTotal = sellers.reduce((sum, [, val]) => sum + val.totale_provvigione, 0);

    return (
        <div className="space-y-8">
            {/* Grand Total Card */}
            <div className="kpi-card p-8 text-center">
                <span className="kpi-label">{t("totalCommission")}</span>
                <div className="kpi-value text-6xl mt-4">{formatCurrency(grandTotal)}</div>
                <p className="font-body text-muted-foreground mt-4 italic">
                    {sellers.length} {t("seller").toLowerCase()}(i)
                </p>
            </div>

            <div className="section-divider" />

            {/* Per-Seller Breakdown */}
            <div className="space-y-4">
                <h3 className="font-display text-xl">{t("summaryBySeller")}</h3>
                <div className="space-y-3">
                    {sellers.map(([sellerName, sellerData]) => (
                        <div key={sellerName} className="ledger-card overflow-hidden">
                            <div
                                className="flex items-center justify-between p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                                onClick={() => setExpandedSeller(expandedSeller === sellerName ? null : sellerName)}
                            >
                                <span className="font-display text-lg">{sellerName}</span>
                                <div className="flex items-center gap-4">
                                    <span className="badge-ledger badge-accent font-mono text-lg">
                                        {formatCurrency(sellerData.totale_provvigione)}
                                    </span>
                                    <ChevronRight
                                        className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                                            expandedSeller === sellerName ? "rotate-90" : ""
                                        }`}
                                    />
                                </div>
                            </div>
                            {expandedSeller === sellerName && (
                                <div className="border-t border-border/30 p-5 bg-secondary/10">
                                    <table className="ledger-table">
                                        <thead>
                                            <tr>
                                                <th>{t("rule")}</th>
                                                <th className="text-right">{t("quantity")}</th>
                                                <th className="text-right">{t("amount")}</th>
                                                <th className="text-right">{t("commission")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {sellerData.dati_provvigione.map((item, idx) => (
                                                <tr key={idx}>
                                                    <td className="font-body">{item.Regola}</td>
                                                    <td data-numeric className="text-right">
                                                        {item.Quantita}
                                                    </td>
                                                    <td data-numeric className="text-right">
                                                        {formatCurrency(item.Importo)}
                                                    </td>
                                                    <td
                                                        data-numeric
                                                        className="text-right text-energia-accent font-semibold"
                                                    >
                                                        {formatCurrency(item.provvigione)}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
