import { useRef, useState, type ReactElement } from "react";
import { Download, Loader2 } from "lucide-react";
import { MotionConfig } from "motion/react";
import { Button } from "@/components/ui/button";
import {
    AgentBreakdownChart,
    AgentComparison,
    ContractMixChart,
    DashboardFilters,
    DashboardKpis,
    landPending,
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

// Longer than the pause before a chart's intro starts (recharts holds the pie for 400ms), so a chart that's still
// about to draw never reads as finished.
const CHARTS_QUIET_MS = 500;

// shortcut: exports whatever is drawn after this, raise it if a chart's intro ever runs longer.
const CHARTS_SETTLE_CAP_MS = 6000;

/** Resolves once nothing under the element has changed for a moment, so the charts it holds have finished drawing. */
function chartsSettled(element: Element): Promise<void> {
    return new Promise((resolve) => {
        const start = performance.now();
        let lastChange = start;
        const observer = new MutationObserver(() => (lastChange = performance.now()));

        observer.observe(element, { subtree: true, childList: true, attributes: true, characterData: true });

        function check(now: number): void {
            if (now - lastChange < CHARTS_QUIET_MS && now - start < CHARTS_SETTLE_CAP_MS) {
                requestAnimationFrame(check);

                return;
            }

            observer.disconnect();
            resolve();
        }

        requestAnimationFrame(check);
    });
}

function Spinner(): ReactElement {
    return (
        <div className="flex animate-fade-in-late items-center justify-center py-20">
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
    const [exporting, setExporting] = useState(false);

    async function handleExport(): Promise<void> {
        const element = exportRef.current;

        if (!element || !filters) return;

        const agentPart = filters.agent ? `-${fileNamePart(filters.agent)}` : "";

        setExporting(true);
        // Charts mount only once their card scrolls into view, and the export copies what's drawn on the page.
        landPending();

        try {
            await chartsSettled(element);
            exportElementAsHtml(element, {
                title: `${t("dashboard")} ${filters.year}${filters.agent ? `, ${filters.agent}` : ""}`,
                fileName: `dashboard-vendite-${filters.year}${agentPart}.html`,
            });
        } catch (err: unknown) {
            console.error("Dashboard HTML export failed", err);
            toast({ title: t("dashboardExportFailed"), variant: "destructive" });
        } finally {
            setExporting(false);
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

                {data === null ? (
                    <Spinner />
                ) : (
                    // Section order follows the reference analysis report: company overview, monthly trend,
                    // agents, the per-agent splits, previous supplier, products.
                    <>
                        <Reveal>
                            <DashboardKpis summary={data.summary} revenue={data.revenue} loading={loading} />
                        </Reveal>
                        <div className="grid gap-4 lg:grid-cols-2">
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
                        </div>
                        <ContractMixChart section={data.summary} loading={loading} />
                        <div className="space-y-4">
                            <Reveal>
                                <h2 className="pt-2 font-display text-2xl text-foreground">
                                    {t("dashboardAgentsSection")}
                                </h2>
                            </Reveal>
                            <AgentComparison
                                section={data.agents}
                                selectedAgent={filters.agent}
                                loading={agentsLoading}
                            />
                            <div className="grid gap-4 lg:grid-cols-2">
                                <AgentBreakdownChart kind="supply" section={data.agents} loading={agentsLoading} />
                                <AgentBreakdownChart kind="customer" section={data.agents} loading={agentsLoading} />
                            </div>
                            {/* Two bars per agent, so it takes the full width like the comparison above. */}
                            <AgentBreakdownChart kind="sepa" section={data.agents} loading={agentsLoading} />
                        </div>
                        <div className="grid gap-4 lg:grid-cols-2">
                            <PreviousSellersChart section={data.previousSellers} loading={loading} />
                            <ProductsByAgentChart section={data.productsByAgent} loading={loading} />
                        </div>
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
                    onClick={() => void handleExport()}
                    disabled={data === null || loading || agentsLoading || exporting}
                    data-export-exclude
                >
                    {exporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                    {t("dashboardExportHtml")}
                </Button>
            </div>
            {/* Charts the export mounts draw straight to their final state, so it isn't held up by their intros. */}
            <MotionConfig skipAnimations={exporting}>{body()}</MotionConfig>
        </div>
    );
}
