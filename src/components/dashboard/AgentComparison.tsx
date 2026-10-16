import { useState, type ReactElement } from "react";
import { ArrowDown } from "lucide-react";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import {
    MUTED_SERIES,
    SERIES_COLORS,
    barChartHeight,
    bySepaShare,
    displayName,
    fillTemplate,
    formatCount,
    formatPercent,
    formatPeriodComparison,
} from "@/lib/dashboardFormat";
import { cn } from "@/lib/utils";
import type { DashboardAgentComparison } from "@/types";
import { ChartSlot, DashboardCard, SectionMessage } from "./DashboardCard";

type AgentSort = DashboardAgentComparison["ordina_per"];

interface AgentComparisonProps {
    section: DashboardSection<DashboardAgentComparison>;
    selectedAgent: string | null;
    loading: boolean;
}

export function AgentComparison({ section, selectedAgent, loading }: AgentComparisonProps): ReactElement {
    const { t, language } = useTranslation();
    const [sort, setSort] = useState<AgentSort>("contratti_totali");
    const title = t("dashboardAgentsTitle");
    const description = t("dashboardCompanyWide");

    if (section.status !== "ready") {
        return (
            <DashboardCard title={title} description={description} loading={loading}>
                <SectionMessage tone={section.status} message={section.message} />
            </DashboardCard>
        );
    }

    const { periodo, agenti, min_contratti, esclusi_sotto_soglia, contratti_agenti_non_statistiche_n } = section.data;
    const sorted = sort === "pct_sepa" ? [...agenti].sort(bySepaShare) : agenti;
    const period = formatPeriodComparison(periodo, language);
    // The backend upper-cases agent names here, while the filter list keeps the original casing.
    const isSelected = (agent: string): boolean => selectedAgent?.toLowerCase() === agent.toLowerCase();

    const notes = (
        <>
            {esclusi_sotto_soglia > 0 && (
                <p>
                    {fillTemplate(t("dashboardAgentsExcluded"), {
                        min: min_contratti,
                        count: esclusi_sotto_soglia,
                    })}
                </p>
            )}
            {contratti_agenti_non_statistiche_n > 0 && (
                <p>
                    {fillTemplate(t("dashboardAgentsNonStats"), {
                        count: formatCount(contratti_agenti_non_statistiche_n, language),
                    })}
                </p>
            )}
        </>
    );

    if (agenti.length === 0) {
        return (
            <DashboardCard title={title} period={period} description={description} loading={loading} notes={notes}>
                <SectionMessage
                    tone="empty"
                    message={fillTemplate(t("dashboardAgentsEmpty"), {
                        min: min_contratti,
                    })}
                />
            </DashboardCard>
        );
    }

    const chartConfig = {
        n: { label: String(periodo.anno_n), colors: { light: [SERIES_COLORS[0]] } },
        n_1: { label: String(periodo.anno_n_1), colors: { light: [MUTED_SERIES] } },
    } satisfies ChartConfig;

    const chartData = sorted.map((agent) => ({
        agent: displayName(agent.agente),
        n: agent.n.contratti_totali,
        n_1: agent.n_1.contratti_totali,
    }));

    function sortHeader(column: AgentSort, label: string): ReactElement {
        const active = sort === column;

        return (
            <TableHead className="text-right" aria-sort={active ? "descending" : undefined}>
                <button
                    type="button"
                    className={cn(
                        "inline-flex items-center gap-1 hover:text-foreground",
                        active && "font-semibold text-foreground",
                    )}
                    aria-label={fillTemplate(t("dashboardSortBy"), { column: label })}
                    onClick={() => setSort(column)}
                >
                    {label}
                    {active && <ArrowDown className="h-3.5 w-3.5" />}
                </button>
            </TableHead>
        );
    }

    const table = (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>#</TableHead>
                    <TableHead>{t("agent")}</TableHead>
                    {sortHeader("contratti_totali", `${t("contracts")} ${periodo.anno_n}`)}
                    <TableHead className="text-right">{periodo.anno_n_1}</TableHead>
                    <TableHead className="text-right">{t("dashboardChange")}</TableHead>
                    {sortHeader("pct_sepa", t("dashboardSepaShare"))}
                    <TableHead className="text-right">{t("dashboardPower")}</TableHead>
                    <TableHead className="text-right">{t("dashboardGas")}</TableHead>
                    <TableHead className="text-right">{t("dashboardResidential")}</TableHead>
                    <TableHead className="text-right">{t("dashboardBusiness")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {sorted.map((agent, index) => (
                    <TableRow
                        key={agent.agente_id}
                        aria-current={isSelected(agent.agente) ? "true" : undefined}
                        className={cn(isSelected(agent.agente) && "bg-muted font-medium")}
                    >
                        <TableCell className="py-2 tabular-nums text-muted-foreground">{index + 1}</TableCell>
                        <TableCell className="py-2">{agent.agente}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(agent.n.contratti_totali, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(agent.n_1.contratti_totali, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {agent.variazione_pct.contratti_totali === null
                                ? t("dashboardNewAgent")
                                : formatPercent(agent.variazione_pct.contratti_totali, language, true)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {agent.n.pct_sepa === null ? "–" : formatPercent(agent.n.pct_sepa, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(agent.n.luce, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(agent.n.gas, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(agent.n.domestico, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(agent.n.non_domestico, language)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <DashboardCard
            title={title}
            period={period}
            description={description}
            loading={loading}
            table={table}
            notes={notes}
        >
            {/* Two bars per agent, so each row needs twice the single-bar height. */}
            <ChartSlot style={{ height: barChartHeight(sorted.length * 2, true) }}>
                <EvilBarChart
                    config={chartConfig}
                    data={chartData}
                    isLoading={loading}
                    layout="horizontal"
                    stackType="default"
                    className="aspect-auto h-full w-full"
                    chartProps={{ margin: { top: 0, right: 12, left: 0 } }}
                >
                    <EvilBarChart.Grid />
                    <EvilBarChart.XAxis
                        allowDecimals={false}
                        tickFormatter={(value: number) => formatCount(value, language)}
                    />
                    <EvilBarChart.YAxis dataKey="agent" interval={0} />
                    <EvilBarChart.Tooltip valueFormatter={(value) => formatCount(value, language)} />
                    <EvilBarChart.Legend />
                    <EvilBarChart.Bar dataKey="n" />
                    <EvilBarChart.Bar dataKey="n_1" />
                </EvilBarChart>
            </ChartSlot>
        </DashboardCard>
    );
}
