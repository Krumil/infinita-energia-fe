import type { ReactElement, ReactNode } from "react";
import { EvilLineChart } from "@/components/evilcharts/charts/recharts-line-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import { MUTED_SERIES, SERIES_COLORS, formatPercent, formatPeriodComparison, monthName } from "@/lib/dashboardFormat";
import type { DashboardMonthlySales } from "@/types";
import { DashboardCard, SectionMessage } from "./DashboardCard";

interface MonthlyComparisonChartProps {
    title: string;
    description?: ReactNode;
    section: DashboardSection<DashboardMonthlySales>;
    loading: boolean;
    emptyMessage: string;
    formatValue: (value: number) => string;
    formatTick: (value: number) => string;
    allowDecimals?: boolean;
    /** Current-year line color; the previous year is always the muted dashed line. */
    color?: string;
}

export function MonthlyComparisonChart({
    title,
    description,
    section,
    loading,
    emptyMessage,
    formatValue,
    formatTick,
    allowDecimals = false,
    color = SERIES_COLORS[0],
}: MonthlyComparisonChartProps): ReactElement {
    const { t, language } = useTranslation();

    if (section.status !== "ready") {
        return (
            <DashboardCard title={title} description={description} loading={loading}>
                <SectionMessage tone={section.status} message={section.message} />
            </DashboardCard>
        );
    }

    const { periodo, mesi } = section.data;
    const period = formatPeriodComparison(periodo, language);

    if (mesi.every((month) => month.n === 0 && month.n_1 === 0)) {
        return (
            <DashboardCard title={title} period={period} description={description} loading={loading}>
                <SectionMessage tone="empty" message={emptyMessage} />
            </DashboardCard>
        );
    }

    const chartConfig = {
        n_1: { label: String(periodo.anno_n_1), colors: { light: [MUTED_SERIES] } },
        n: { label: String(periodo.anno_n), colors: { light: [color] } },
    } satisfies ChartConfig;

    const chartData = mesi.map((month) => ({
        label: monthName(month.mese, language, "short"),
        n: month.n,
        n_1: month.n_1,
    }));

    const table = (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("dashboardMonth")}</TableHead>
                    <TableHead className="text-right">{periodo.anno_n_1}</TableHead>
                    <TableHead className="text-right">{periodo.anno_n}</TableHead>
                    <TableHead className="text-right">{t("dashboardChange")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {mesi.map((month) => (
                    <TableRow key={month.mese}>
                        <TableCell className="py-2">{monthName(month.mese, language)}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">{formatValue(month.n_1)}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">{formatValue(month.n)}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {month.variazione_pct === null ? "–" : formatPercent(month.variazione_pct, language, true)}
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
        >
            <EvilLineChart
                config={chartConfig}
                data={chartData}
                className="aspect-auto h-[240px] w-full"
                chartProps={{ margin: { top: 8, right: 12, left: 0 } }}
            >
                <EvilLineChart.Grid strokeDasharray="2 4" />
                <EvilLineChart.XAxis dataKey="label" minTickGap={5} />
                <EvilLineChart.YAxis domain={[0, "auto"]} allowDecimals={allowDecimals} tickFormatter={formatTick} />
                <EvilLineChart.Tooltip valueFormatter={formatValue} />
                <EvilLineChart.Legend />
                {/* Previous year: dashed and dot-less, so it reads as the reference rather than the subject. */}
                <EvilLineChart.Line dataKey="n_1" strokeVariant="dashed" strokeWidth={2} />
                <EvilLineChart.Line dataKey="n" strokeWidth={2.5}>
                    <EvilLineChart.Dot />
                    <EvilLineChart.ActiveDot variant="border" />
                </EvilLineChart.Line>
            </EvilLineChart>
        </DashboardCard>
    );
}
