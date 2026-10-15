import type { ReactElement, ReactNode } from "react";
import { Card } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import {
    fillTemplate,
    formatCount,
    formatEuro,
    formatPercent,
    formatPeriodComparison,
    formatPeriodDate,
} from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import type { DashboardRevenue, DashboardSalesSummary } from "@/types";
import { SectionMessage } from "./DashboardCard";
import { Delta } from "./DashboardBars";

interface KpiTileProps {
    title: string;
    loading: boolean;
    children: ReactNode;
}

function KpiTile({ title, loading, children }: KpiTileProps): ReactElement {
    return (
        <section
            aria-label={title}
            aria-busy={loading}
            className={cn("min-w-0 space-y-2 p-5 transition-opacity sm:p-6", loading && "opacity-60")}
        >
            <h2 className="text-sm text-muted-foreground">{title}</h2>
            {children}
        </section>
    );
}

interface KpiChange {
    amount: number;
    label: string;
}

interface KpiBodyProps {
    value: string;
    /** Left out when the previous year has nothing to compare against. */
    change?: KpiChange;
    previous: string;
    note?: string;
}

function KpiBody({ value, change, previous, note }: KpiBodyProps): ReactElement {
    return (
        <>
            <p className="font-mono text-3xl tabular-nums text-[hsl(var(--metric-value))]">{value}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm">
                {change && <Delta value={change.amount} label={change.label} />}
                <span className="text-muted-foreground">{previous}</span>
            </div>
            {note && <p className="text-xs text-muted-foreground">{note}</p>}
        </>
    );
}

interface DashboardKpisProps {
    summary: DashboardSection<DashboardSalesSummary>;
    revenue: DashboardSection<DashboardRevenue>;
    loading: boolean;
}

export function DashboardKpis({ summary, revenue, loading }: DashboardKpisProps): ReactElement {
    const { t, language } = useTranslation();

    function percentChange(change: number | null): KpiChange | undefined {
        return change === null ? undefined : { amount: change, label: formatPercent(change, language, true) };
    }

    function previous(value: string, year: number): string {
        return fillTemplate(t("dashboardKpiPrevious"), { value, year });
    }

    let contractsTile: ReactNode;
    let sepaTile: ReactNode;

    if (summary.status === "ready") {
        const { periodo, kpi, split_n, split_n_1 } = summary.data;
        const sepaN = split_n.pct_sepa;
        const sepaN1 = split_n_1.pct_sepa;
        // A share moves in percentage points; a percent change of a percentage would mislead.
        const sepaChange = sepaN !== null && sepaN1 !== null ? sepaN - sepaN1 : null;

        contractsTile = (
            <KpiBody
                value={formatCount(kpi.contratti_n, language)}
                change={percentChange(kpi.variazione_pct)}
                previous={previous(formatCount(kpi.contratti_n_1, language), periodo.anno_n_1)}
                note={formatPeriodComparison(periodo, language)}
            />
        );
        sepaTile =
            sepaN === null ? (
                <SectionMessage tone="empty" message={t("dashboardNoContracts")} />
            ) : (
                <KpiBody
                    value={formatPercent(sepaN, language)}
                    change={
                        sepaChange === null
                            ? undefined
                            : {
                                  amount: sepaChange,
                                  label: fillTemplate(t("dashboardPoints"), {
                                      value: new Intl.NumberFormat(language, {
                                          maximumFractionDigits: 1,
                                          signDisplay: "exceptZero",
                                      }).format(sepaChange),
                                  }),
                              }
                    }
                    previous={
                        sepaN1 === null
                            ? fillTemplate(t("dashboardKpiNoBase"), { year: periodo.anno_n_1 })
                            : previous(formatPercent(sepaN1, language), periodo.anno_n_1)
                    }
                />
            );
    } else {
        contractsTile = <SectionMessage tone={summary.status} message={summary.message} />;
        sepaTile = contractsTile;
    }

    let revenueTile: ReactNode;

    if (revenue.status === "ready") {
        const { periodo, kpi } = revenue.data;

        revenueTile = (
            <KpiBody
                value={formatEuro(kpi.fatturato_n, language)}
                change={percentChange(kpi.variazione_pct)}
                previous={previous(formatEuro(kpi.fatturato_n_1, language), periodo.anno_n_1)}
                note={fillTemplate(t("dashboardRevenuePeriod"), {
                    from: formatPeriodDate(periodo.dal_n, language),
                    to: formatPeriodDate(periodo.al_n, language),
                })}
            />
        );
    } else {
        revenueTile = <SectionMessage tone={revenue.status} message={revenue.message} />;
    }

    return (
        // One surface split by hairlines, so the figures sit on the same cards as the charts below.
        <Card className="grid divide-y divide-border/50 rounded-2xl border-0 shadow-[shadow:var(--ledger-card-shadow)] md:grid-cols-3 md:divide-x md:divide-y-0">
            <KpiTile title={t("dashboardKpiContracts")} loading={loading}>
                {contractsTile}
            </KpiTile>
            <KpiTile title={t("dashboardKpiRevenue")} loading={loading}>
                {revenueTile}
            </KpiTile>
            <KpiTile title={t("dashboardKpiSepa")} loading={loading}>
                {sepaTile}
            </KpiTile>
        </Card>
    );
}
