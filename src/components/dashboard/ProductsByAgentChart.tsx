import type { ReactElement } from "react";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import {
    MUTED_SERIES,
    OTHER_AGENTS_LABEL,
    SERIES_COLORS,
    barChartHeight,
    displayName,
    fillTemplate,
    formatCount,
    formatPeriod,
} from "@/lib/dashboardFormat";
import type { DashboardProductsByAgent } from "@/types";
import { ChartSlot, DashboardCard, SectionMessage } from "./DashboardCard";

interface StackSeries {
    // Agent names can contain dots, which Recharts would read as a nested path, so series get index keys.
    key: string;
    agent: string;
    color: string;
}

function stackSeries(data: DashboardProductsByAgent): StackSeries[] {
    // Alphabetical order keeps each agent's color the same when the period or filters change the ranking.
    const agents = [...data.agenti_evidenziati].sort((a, b) => a.localeCompare(b));

    const series: StackSeries[] = agents.map((agent, index) => ({
        key: `a${index}`,
        agent,
        color: SERIES_COLORS[index % SERIES_COLORS.length],
    }));

    if (data.prodotti.some((product) => product.per_agente.some((entry) => entry.agente === OTHER_AGENTS_LABEL))) {
        series.push({ key: "other", agent: OTHER_AGENTS_LABEL, color: MUTED_SERIES });
    }

    return series;
}

interface ProductsByAgentChartProps {
    section: DashboardSection<DashboardProductsByAgent>;
    loading: boolean;
}

export function ProductsByAgentChart({ section, loading }: ProductsByAgentChartProps): ReactElement {
    const { t, language } = useTranslation();
    const description = t("dashboardCompanyWide");

    const title = fillTemplate(t("dashboardProductsTitle"), {
        count: section.status === "ready" ? section.data.prodotti.length : "",
    }).replace(/\s+/g, " ");

    if (section.status !== "ready") {
        return (
            <DashboardCard title={title} description={description} loading={loading}>
                <SectionMessage tone={section.status} message={section.message} />
            </DashboardCard>
        );
    }

    const { periodo, prodotti } = section.data;
    const period = formatPeriod(periodo, language);

    if (prodotti.length === 0) {
        return (
            <DashboardCard title={title} period={period} description={description} loading={loading}>
                <SectionMessage tone="empty" message={t("dashboardNoContracts")} />
            </DashboardCard>
        );
    }

    const series = stackSeries(section.data);

    const contractsFor = (product: DashboardProductsByAgent["prodotti"][number], agent: string): number | undefined =>
        product.per_agente.find((entry) => entry.agente === agent)?.contratti;

    const table = (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("dashboardProduct")}</TableHead>
                    <TableHead className="text-right">{t("total")}</TableHead>
                    {series.map((entry) => (
                        <TableHead key={entry.key} className="text-right">
                            {entry.agent}
                        </TableHead>
                    ))}
                </TableRow>
            </TableHeader>
            <TableBody>
                {prodotti.map((product) => (
                    <TableRow key={product.prodotto}>
                        <TableCell className="py-2">{product.prodotto}</TableCell>
                        <TableCell className="py-2 text-right font-medium tabular-nums">
                            {formatCount(product.totale, language)}
                        </TableCell>
                        {series.map((entry) => (
                            <TableCell key={entry.key} className="py-2 text-right tabular-nums">
                                {formatCount(contractsFor(product, entry.agent) ?? 0, language)}
                            </TableCell>
                        ))}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    // Dynamic series keys, so rows are a string-keyed record.
    const rows = prodotti.map((product) =>
        Object.fromEntries([
            ["product", product.prodotto],
            ...series.map((entry) => [entry.key, contractsFor(product, entry.agent) ?? 0]),
        ]),
    );

    const chartConfig = Object.fromEntries(
        series.map((entry) => [
            entry.key,
            {
                label: entry.agent === OTHER_AGENTS_LABEL ? entry.agent : displayName(entry.agent),
                colors: { light: [entry.color] },
            },
        ]),
    ) satisfies ChartConfig;

    return (
        <DashboardCard title={title} period={period} description={description} loading={loading} table={table}>
            <ChartSlot style={{ height: barChartHeight(prodotti.length, true) }}>
                <EvilBarChart
                    config={chartConfig}
                    data={rows}
                    isLoading={loading}
                    layout="horizontal"
                    stackType="stacked"
                    className="aspect-auto h-full w-full"
                    chartProps={{ margin: { top: 0, right: 12, left: 0 } }}
                >
                    <EvilBarChart.Grid />
                    <EvilBarChart.XAxis allowDecimals={false} tickFormatter={(value: number) => formatCount(value, language)} />
                    <EvilBarChart.YAxis dataKey="product" interval={0} />
                    <EvilBarChart.Tooltip valueFormatter={(value) => formatCount(value, language)} />
                    <EvilBarChart.Legend align="left" />
                    {series.map((entry) => (
                        <EvilBarChart.Bar key={entry.key} dataKey={entry.key} />
                    ))}
                </EvilBarChart>
            </ChartSlot>
        </DashboardCard>
    );
}
