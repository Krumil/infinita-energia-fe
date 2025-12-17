import { Bar, Line, ComposedChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
    ChartContainer,
    ChartTooltip,
    ChartTooltipContent,
    ChartLegend,
    ChartLegendContent,
    type ChartConfig,
} from "@/components/ui/chart";
import { type MonthlyData, formatCurrency } from "@/data/dashboardMockData";
import { useTranslation } from "@/hooks/useTranslation";

interface CommissionsChartProps {
    data: MonthlyData[];
    selectedYear: number;
}

export function CommissionsChart({ data }: CommissionsChartProps) {
    const { t } = useTranslation();

    const chartConfig = {
        commissions: {
            label: t("currentYear"),
            color: "hsl(var(--energia-primary))",
        },
        previousYearCommissions: {
            label: t("previousYear"),
            color: "hsl(var(--energia-accent))",
        },
    } satisfies ChartConfig;

    return (
        <Card className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <CardHeader>
                <CardTitle className="font-display">{t("commissionsCollected")}</CardTitle>
                <CardDescription>{t("comparisonWithPreviousYear")}</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <ComposedChart accessibilityLayer data={data}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis
                            tickLine={false}
                            axisLine={false}
                            tickMargin={10}
                            tickFormatter={(value) => `${(value / 1000).toFixed(0)}k`}
                        />
                        <ChartTooltip
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                            content={
                                <ChartTooltipContent
                                    formatter={(value, name) => {
                                        const label = chartConfig[name as keyof typeof chartConfig]?.label || name;
                                        return (
                                            <div className="flex items-center justify-between gap-4">
                                                <span className="text-muted-foreground">{label}</span>
                                                <span className="font-mono font-medium">
                                                    {formatCurrency(Number(value))}
                                                </span>
                                            </div>
                                        );
                                    }}
                                />
                            }
                        />
                        <ChartLegend content={<ChartLegendContent />} />
                        <Bar dataKey="commissions" fill="var(--color-commissions)" radius={[4, 4, 0, 0]} barSize={30} />
                        <Line
                            type="monotone"
                            dataKey="previousYearCommissions"
                            stroke="var(--color-previousYearCommissions)"
                            strokeWidth={2}
                            dot={{ fill: "var(--color-previousYearCommissions)", strokeWidth: 0, r: 4 }}
                            activeDot={{ r: 6, strokeWidth: 0 }}
                        />
                    </ComposedChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
