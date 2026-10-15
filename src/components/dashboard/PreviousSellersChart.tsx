import type { ReactElement } from "react";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import {
    SERIES_COLORS,
    barChartHeight,
    fillTemplate,
    formatCount,
    formatPercent,
    formatPeriod,
    share,
} from "@/lib/dashboardFormat";
import type { DashboardPreviousSellers } from "@/types";
import { DashboardCard, SectionMessage } from "./DashboardCard";

interface PreviousSellersChartProps {
    section: DashboardSection<DashboardPreviousSellers>;
    loading: boolean;
}

export function PreviousSellersChart({ section, loading }: PreviousSellersChartProps): ReactElement {
    const { t, language } = useTranslation();
    const title = t("dashboardSellersTitle");

    if (section.status !== "ready") {
        return (
            <DashboardCard title={title} loading={loading}>
                <SectionMessage tone={section.status} message={section.message} />
            </DashboardCard>
        );
    }

    const { periodo, venditori, totale_contratti, senza_dato } = section.data;
    const period = formatPeriod(periodo, language);
    const description = fillTemplate(t("dashboardSellersTop"), { count: venditori.length });

    const notes =
        senza_dato > 0 ? (
            <p>
                {fillTemplate(t("dashboardSellersMissing"), {
                    count: formatCount(senza_dato, language),
                    total: formatCount(totale_contratti, language),
                })}
            </p>
        ) : undefined;

    if (venditori.length === 0) {
        return (
            <DashboardCard title={title} period={period} loading={loading} notes={notes}>
                <SectionMessage tone="empty" message={t("dashboardNoContracts")} />
            </DashboardCard>
        );
    }

    const chartConfig = {
        contratti: { label: t("contracts"), colors: { light: [SERIES_COLORS[1]] } },
    } satisfies ChartConfig;

    const table = (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("dashboardSupplier")}</TableHead>
                    <TableHead className="text-right">{t("contracts")}</TableHead>
                    <TableHead className="text-right">{t("dashboardShare")}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {venditori.map((seller) => (
                    <TableRow key={seller.venditore}>
                        <TableCell className="py-2">{seller.venditore}</TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatCount(seller.contratti, language)}
                        </TableCell>
                        <TableCell className="py-2 text-right tabular-nums">
                            {formatPercent(share(seller.contratti, totale_contratti), language)}
                        </TableCell>
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    return (
        <DashboardCard title={title} period={period} description={description} loading={loading} table={table} notes={notes}>
            <div style={{ height: barChartHeight(venditori.length, false) }}>
                <EvilBarChart
                    config={chartConfig}
                    data={venditori}
                    layout="horizontal"
                    className="aspect-auto h-full w-full"
                    chartProps={{ margin: { top: 0, right: 12, left: 0 } }}
                >
                    <EvilBarChart.Grid />
                    <EvilBarChart.XAxis allowDecimals={false} tickFormatter={(value: number) => formatCount(value, language)} />
                    <EvilBarChart.YAxis dataKey="venditore" interval={0} />
                    <EvilBarChart.Tooltip valueFormatter={(value) => formatCount(value, language)} />
                    <EvilBarChart.Bar dataKey="contratti" />
                </EvilBarChart>
            </div>
        </DashboardCard>
    );
}
