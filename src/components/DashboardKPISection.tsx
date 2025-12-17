import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { calculateYoYChange, formatCurrency, type YearData } from "@/data/dashboardMockData";
import { useTranslation } from "@/hooks/useTranslation";

interface DashboardKPISectionProps {
    yearData: YearData;
    selectedYear: number;
}

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    change?: number;
    delay?: number;
}

function KPICard({ title, value, subtitle, change, delay = 0 }: KPICardProps) {
    const isPositive = change !== undefined && change >= 0;
    const showChange = change !== undefined;

    return (
        <Card className="kpi-card animate-fade-up overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
            <CardContent className="pt-5 pb-4 px-5">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                        <p className="kpi-label text-xs mb-2 truncate">{title}</p>
                        <p className="kpi-value text-3xl font-bold tabular-nums truncate">{value}</p>
                        {subtitle && <p className="text-xs text-muted-foreground mt-1.5">{subtitle}</p>}
                    </div>
                    {showChange && (
                        <div className="flex flex-col items-end">
                            <div
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                    isPositive
                                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                        : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                                }`}
                            >
                                {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                                <span>
                                    {isPositive ? "+" : ""}
                                    {change.toFixed(1)}%
                                </span>
                            </div>
                        </div>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}

export function DashboardKPISection({ yearData, selectedYear }: DashboardKPISectionProps) {
    const { t } = useTranslation();

    const contractsChange = calculateYoYChange(yearData.totalContracts, yearData.previousYearContracts);
    const commissionsChange = calculateYoYChange(yearData.totalCommissions, yearData.previousYearTotalCommissions);

    const avgCommissionPerContract =
        yearData.totalContracts > 0 ? yearData.totalCommissions / yearData.totalContracts : 0;
    const prevAvgCommission =
        yearData.previousYearContracts > 0 ? yearData.previousYearTotalCommissions / yearData.previousYearContracts : 0;
    const avgCommissionChange = calculateYoYChange(avgCommissionPerContract, prevAvgCommission);

    // Find best performing month
    const bestMonth = yearData.monthlyData.reduce(
        (best, current) => (current.commissions > best.commissions ? current : best),
        yearData.monthlyData[0]
    );

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
                title={`${t("contracts")} ${selectedYear}`}
                value={yearData.totalContracts}
                subtitle={`${t("vsLastYear")}: ${yearData.previousYearContracts}`}
                change={contractsChange}
                delay={0}
            />
            <KPICard
                title={t("commissionsCollected")}
                value={formatCurrency(yearData.totalCommissions)}
                subtitle={`${t("vsLastYear")}: ${formatCurrency(yearData.previousYearTotalCommissions)}`}
                change={commissionsChange}
                delay={50}
            />
            <KPICard
                title="Media per Contratto"
                value={formatCurrency(avgCommissionPerContract)}
                subtitle={`${t("vsLastYear")}: ${formatCurrency(prevAvgCommission)}`}
                change={avgCommissionChange}
                delay={100}
            />
            <KPICard
                title="Miglior Mese"
                value={bestMonth.month}
                subtitle={`${bestMonth.contracts} contratti • ${formatCurrency(bestMonth.commissions)}`}
                delay={150}
            />
        </div>
    );
}
