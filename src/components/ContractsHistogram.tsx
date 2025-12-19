import { Bar, BarChart, CartesianGrid, XAxis, YAxis } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from "@/components/ui/chart";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2 } from "lucide-react";
import type { DashboardContrattiMensili } from "@/types";

interface ContractsHistogramProps {
    data: DashboardContrattiMensili | null;
    selectedYear: number;
    loading?: boolean;
}

const chartConfig = {
    contracts: {
        label: "Contratti",
        color: "hsl(var(--energia-primary))",
    },
} satisfies ChartConfig;

const SHORT_MONTHS = ["Gen", "Feb", "Mar", "Apr", "Mag", "Giu", "Lug", "Ago", "Set", "Ott", "Nov", "Dic"];

export function ContractsHistogram({ data, selectedYear, loading = false }: ContractsHistogramProps) {
    const { t } = useTranslation();

    // Transform API data to chart format
    const chartData = data?.dati.map((item) => ({
        month: SHORT_MONTHS[item.mese_num - 1] ?? item.mese_nome.substring(0, 3),
        contracts: item.anno_n,
    })) ?? [];

    return (
        <Card className="animate-fade-up" style={{ animationDelay: "100ms" }}>
            <CardHeader>
                <CardTitle className="font-display">{t("contractsSubscribed")}</CardTitle>
                <CardDescription>{selectedYear}</CardDescription>
            </CardHeader>
            <CardContent className="pb-4">
                {loading && !data ? (
                    <div className="flex items-center justify-center h-[220px]">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : (
                    <ChartContainer config={chartConfig} className="h-[220px] w-full">
                        <BarChart accessibilityLayer data={chartData}>
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
                )}
            </CardContent>
        </Card>
    );
}
