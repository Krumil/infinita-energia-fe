import { useRef, type ReactElement } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AgentBreakdownChart,
    AgentComparison,
    ContractMixChart,
    DashboardFilters,
    DashboardKpis,
    MonthlyComparisonChart,
    PreviousSellersChart,
    ProductsByAgentChart,
    Reveal,
    SectionMessage,
} from "@/components/dashboard";
import { useDashboard, useToast, useTranslation } from "@/hooks";
import { SERIES_COLORS, fillTemplate, formatCount, formatEuro, formatPeriodDate } from "@/lib/dashboardFormat";
import { exportElementAsHtml } from "@/lib/htmlExport";

function fileNamePart(text: string): string {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-|-$/g, "");
}

function Spinner(): ReactElement {
    return (
        <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
}

export function DashboardTab(): ReactElement {
    const { t, language } = useTranslation();
    const { toast } = useToast();
    const dashboard = useDashboard();
    const { filters, data, loading, agentsLoading } = dashboard;
    const exportRef = useRef<HTMLDivElement>(null);

    function handleExport(): void {
        if (!exportRef.current || !filters) return;

        const agentPart = filters.agent ? `-${fileNamePart(filters.agent)}` : "";

        try {
            exportElementAsHtml(exportRef.current, {
                title: `${t("dashboard")} ${filters.year}${filters.agent ? `, ${filters.agent}` : ""}`,
                fileName: `dashboard-vendite-${filters.year}${agentPart}.html`,
            });
        } catch (err: unknown) {
            console.error("Dashboard HTML export failed", err);
            toast({ title: t("dashboardExportFailed"), variant: "destructive" });
        }
    }

    function body(): ReactElement {
        if (dashboard.optionsError) {
            return <SectionMessage tone="error" message={dashboard.optionsError.message} />;
        }

        if (dashboard.optionsLoading) return <Spinner />;

        if (!filters) return <SectionMessage tone="empty" message={t("dashboardNoYears")} />;

        const revenue = data?.revenue;

        return (
            <>
                <Reveal index={0}>
                    <DashboardFilters
                        years={dashboard.years}
                        agents={dashboard.agents}
                        filters={filters}
                        minContracts={dashboard.minContracts}
                        periodEnd={data?.summary.status === "ready" ? data.summary.data.periodo.al_n : null}
                        onYearChange={dashboard.setYear}
                        onAgentChange={dashboard.setAgent}
                        onMonthFromChange={dashboard.setMonthFrom}
                        onMonthToChange={dashboard.setMonthTo}
                        onMinContractsChange={dashboard.setMinContracts}
                    />
                </Reveal>

                {data === null ? (
                    <Spinner />
                ) : (
                    // Section order follows the reference analysis report: company overview, monthly trend,
                    // agents, the per-agent splits, previous supplier, products.
                    <>
                        <Reveal index={1}>
                            <DashboardKpis summary={data.summary} revenue={data.revenue} loading={loading} />
                        </Reveal>
                        <Reveal index={2} className="grid gap-4 lg:grid-cols-2">
                            <MonthlyComparisonChart
                                title={t("dashboardSalesTrend")}
                                section={data.monthlySales}
                                loading={loading}
                                emptyMessage={t("dashboardNoContracts")}
                                formatValue={(value) => formatCount(value, language)}
                                formatTick={(value) => formatCount(value, language)}
                            />
                            <MonthlyComparisonChart
                                title={t("dashboardRevenueTrend")}
                                description={
                                    revenue?.status === "ready"
                                        ? fillTemplate(t("dashboardRevenuePeriod"), {
                                              from: formatPeriodDate(revenue.data.periodo.dal_n, language),
                                              to: formatPeriodDate(revenue.data.periodo.al_n, language),
                                          })
                                        : undefined
                                }
                                section={data.revenue}
                                loading={loading}
                                emptyMessage={t("dashboardNoRevenue")}
                                formatValue={(value) => formatEuro(value, language)}
                                formatTick={(value) => formatEuro(value, language, true)}
                                allowDecimals
                                // Green keeps money visually apart from contract counts.
                                color={SERIES_COLORS[2]}
                            />
                        </Reveal>
                        <Reveal index={3}>
                            <ContractMixChart section={data.summary} loading={loading} />
                        </Reveal>
                        <Reveal index={4} className="space-y-4">
                            <h2 className="pt-2 font-display text-2xl text-foreground">{t("dashboardAgentsSection")}</h2>
                            <AgentComparison section={data.agents} selectedAgent={filters.agent} loading={agentsLoading} />
                            <div className="grid gap-4 lg:grid-cols-2">
                                <AgentBreakdownChart kind="supply" section={data.agents} loading={agentsLoading} />
                                <AgentBreakdownChart kind="customer" section={data.agents} loading={agentsLoading} />
                            </div>
                            {/* Two bars per agent, so it takes the full width like the comparison above. */}
                            <AgentBreakdownChart kind="sepa" section={data.agents} loading={agentsLoading} />
                        </Reveal>
                        <Reveal index={5} className="grid gap-4 lg:grid-cols-2">
                            <PreviousSellersChart section={data.previousSellers} loading={loading} />
                            <ProductsByAgentChart section={data.productsByAgent} loading={loading} />
                        </Reveal>
                    </>
                )}
            </>
        );
    }

    return (
        <div ref={exportRef} className="space-y-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                <div>
                    <h1 className="font-display text-4xl leading-tight text-foreground">{t("dashboard")}</h1>
                    <p className="mt-2 text-sm text-muted-foreground">{t("dashboardSubtitle")}</p>
                </div>
                <Button
                    type="button"
                    variant="ghost"
                    className="gap-2 self-start rounded-full"
                    onClick={handleExport}
                    disabled={data === null || loading || agentsLoading}
                    data-export-exclude
                >
                    <Download className="h-4 w-4" />
                    {t("dashboardExportHtml")}
                </Button>
            </div>
            {body()}
        </div>
    );
}
