import { TrendingUp, TrendingDown, Loader2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import type {
    DashboardContrattiTotali,
    DashboardProvvigioniTotali,
    DashboardContrattiMensili,
} from "@/types";

interface DashboardKPISectionProps {
    contrattiTotali: DashboardContrattiTotali | null;
    provvigioniTotali: DashboardProvvigioniTotali | null;
    contrattiMensili: DashboardContrattiMensili | null;
    selectedYear: number;
    loading?: boolean;
}

interface KPICardProps {
    title: string;
    value: string | number;
    subtitle?: string;
    change?: number;
    delay?: number;
    loading?: boolean;
}

function formatCurrency(amount: number, currency: string = "EUR"): string {
    return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

function KPICard({ title, value, subtitle, change, delay = 0, loading = false }: KPICardProps) {
    const isPositive = change !== undefined && change >= 0;
    const showChange = change !== undefined;

    return (
        <Card className="kpi-card animate-fade-up overflow-hidden" style={{ animationDelay: `${delay}ms` }}>
            <CardContent className="pt-5 pb-4 px-5">
                {loading ? (
                    <div className="flex items-center justify-center py-4">
                        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                    </div>
                ) : (
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
                )}
            </CardContent>
        </Card>
    );
}

export function DashboardKPISection({
    contrattiTotali,
    provvigioniTotali,
    contrattiMensili,
    selectedYear,
    loading = false,
}: DashboardKPISectionProps) {
    const { t } = useTranslation();

    // Calculate average commission per contract
    const avgCommissionPerContract =
        contrattiTotali && provvigioniTotali && contrattiTotali.totale_contratti_n > 0
            ? provvigioniTotali.totale_provvigioni_n / contrattiTotali.totale_contratti_n
            : 0;
    const prevAvgCommission =
        contrattiTotali && provvigioniTotali && contrattiTotali.totale_contratti_n_1 > 0
            ? provvigioniTotali.totale_provvigioni_n_1 / contrattiTotali.totale_contratti_n_1
            : 0;
    const avgCommissionChange =
        prevAvgCommission > 0 ? ((avgCommissionPerContract - prevAvgCommission) / prevAvgCommission) * 100 : 0;

    // Find best performing month from monthly contracts data
    const bestMonth = contrattiMensili?.dati.reduce(
        (best, current) => (current.anno_n > best.anno_n ? current : best),
        contrattiMensili.dati[0]
    );

    return (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <KPICard
                title={`${t("contracts")} ${selectedYear}`}
                value={contrattiTotali?.totale_contratti_n ?? 0}
                subtitle={`${t("vsLastYear")}: ${contrattiTotali?.totale_contratti_n_1 ?? 0}`}
                change={contrattiTotali?.variazione_percentuale}
                delay={0}
                loading={loading && !contrattiTotali}
            />
            <KPICard
                title={t("commissionsCollected")}
                value={formatCurrency(provvigioniTotali?.totale_provvigioni_n ?? 0)}
                subtitle={`${t("vsLastYear")}: ${formatCurrency(provvigioniTotali?.totale_provvigioni_n_1 ?? 0)}`}
                change={provvigioniTotali?.variazione_percentuale}
                delay={50}
                loading={loading && !provvigioniTotali}
            />
            <KPICard
                title="Media per Contratto"
                value={formatCurrency(avgCommissionPerContract)}
                subtitle={`${t("vsLastYear")}: ${formatCurrency(prevAvgCommission)}`}
                change={avgCommissionChange}
                delay={100}
                loading={loading && (!contrattiTotali || !provvigioniTotali)}
            />
            <KPICard
                title="Miglior Mese"
                value={bestMonth?.mese_nome ?? "-"}
                subtitle={bestMonth ? `${bestMonth.anno_n} contratti` : undefined}
                delay={150}
                loading={loading && !contrattiMensili}
            />
        </div>
    );
}
