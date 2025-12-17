import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { type MonthlyData } from "@/data/dashboardMockData";
import { useTranslation } from "@/hooks/useTranslation";

interface ContractsHistogramProps {
    data: MonthlyData[];
    selectedYear: number;
}

const chartConfig = {
    contracts: {
        label: "Contratti",
        color: "hsl(var(--energia-primary))",
    },
} satisfies ChartConfig;

export function ContractsHistogram({ data, selectedYear }: ContractsHistogramProps) {
    const { t } = useTranslation();

    return (
        <Card className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <CardHeader>
                <CardTitle className="font-display">{t("contractsSubscribed")}</CardTitle>
                <CardDescription>{selectedYear}</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
                <ChartContainer config={chartConfig} className="h-[220px] w-full">
                    <BarChart accessibilityLayer data={data}>
                        <CartesianGrid vertical={false} strokeDasharray="3 3" />
                        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
                        <YAxis tickLine={false} axisLine={false} tickMargin={10} allowDecimals={false} />
                        <ChartTooltip
                            cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                            content={<ChartTooltipContent hideLabel />}
                        />
                        <Bar dataKey="contracts" fill="var(--color-contracts)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ChartContainer>
            </CardContent>
        </Card>
    );
}
