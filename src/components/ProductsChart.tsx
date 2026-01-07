import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2 } from "lucide-react";
import type { DashboardContrattiPerProdotto } from "@/types";

interface ProductsChartProps {
    data: DashboardContrattiPerProdotto | null;
    selectedYear: number;
    loading?: boolean;
}

const chartConfig = {
    currentYear: {
        label: "Anno Corrente",
        color: "hsl(var(--energia-primary))",
    },
    previousYear: {
        label: "Anno Precedente",
        color: "hsl(var(--energia-accent))",
    },
} satisfies ChartConfig;

export function ProductsChart({ data, selectedYear, loading = false }: ProductsChartProps) {
    const { t } = useTranslation();

    // Transform API data to chart format
    const chartData =
        data?.dati?.map((item) => ({
            prodotto: item.prodotto ?? "",
            currentYear: item.count_n ?? 0,
            previousYear: item.count_n_prev ?? 0,
        })) ?? [];

    return (
        <Card className="animate-fade-up" style={{ animationDelay: "300ms" }}>
            <CardHeader>
                <CardTitle className="font-display">{t("contractsByProduct")}</CardTitle>
                <CardDescription>
                    {t("comparisonWithPreviousYear")} - {selectedYear}
                </CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
                {loading && !data ? (
                    <div className="flex items-center justify-center h-[280px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : chartData.length === 0 ? (
                    <div className="flex items-center justify-center h-[280px] text-muted-foreground">
                        {t("noDataFound")}
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[280px] w-full">
                        <BarChart accessibilityLayer data={chartData} layout="vertical">
                            <CartesianGrid horizontal={false} strokeDasharray="3 3" />
                            <XAxis type="number" tickLine={false} axisLine={false} />
                            <YAxis
                                type="category"
                                dataKey="prodotto"
                                tickLine={false}
                                axisLine={false}
                                width={120}
                                tick={{ fontSize: 12 }}
                            />
                            <ChartTooltip
                                cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                                content={<ChartTooltipContent />}
                            />
                            <ChartLegend content={<ChartLegendContent />} />
                            <Bar dataKey="currentYear" fill="var(--color-currentYear)" radius={[0, 4, 4, 0]} />
                            <Bar dataKey="previousYear" fill="var(--color-previousYear)" radius={[0, 4, 4, 0]} />
                        </BarChart>
                    </ChartContainer>
                )}
            </CardContent>
        </Card>
    );
}
