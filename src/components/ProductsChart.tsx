import { Bar, BarChart, CartesianGrid, XAxis, YAxis, Cell, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTranslation } from "@/hooks/useTranslation";
import { Loader2 } from "lucide-react";
import type { DashboardContrattiPerProdotto } from "@/types";

interface ProductsChartProps {
    data: DashboardContrattiPerProdotto | null;
    selectedYear: number;
    loading?: boolean;
}

// Color palette for products
const PRODUCT_COLORS = [
    "#003f5c", // Dark blue
    "#58508d", // Purple
    "#bc5090", // Pink/Magenta
    "#ff6361", // Coral/Red
    "#ffa600", // Orange/Yellow
];

function getProductColor(index: number): string {
    return PRODUCT_COLORS[index % PRODUCT_COLORS.length];
}

function getProductColorLight(index: number): string {
    // Return a lighter/more transparent version for previous year
    const baseColor = PRODUCT_COLORS[index % PRODUCT_COLORS.length];
    return `${baseColor}66`; // Add 40% opacity (66 in hex)
}

export function ProductsChart({ data, selectedYear, loading = false }: ProductsChartProps) {
    const { t } = useTranslation();

    // Transform API data to chart format, sorted by current year count descending
    const chartData =
        data?.dati
            ?.map((item) => ({
                prodotto: item.prodotto ?? "",
                currentYear: item.anno_n ?? 0,
                previousYear: item.anno_n_1 ?? 0,
            }))
            .sort((a, b) => b.currentYear - a.currentYear) ?? [];

    // Calculate dynamic width based on number of products
    const barWidth = 24;
    const barGap = 4;
    const groupGap = 16;
    const minWidth = 400;
    const calculatedWidth = Math.max(minWidth, chartData.length * (barWidth * 2 + barGap + groupGap) + 80);

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
                    <div className="overflow-x-auto">
                        <div style={{ minWidth: `${calculatedWidth}px`, height: 280 }}>
                            <BarChart
                                width={calculatedWidth}
                                height={280}
                                data={chartData}
                                barGap={barGap}
                                barCategoryGap={groupGap}
                                margin={{ top: 20, right: 20, bottom: 80, left: 40 }}
                            >
                                <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="hsl(var(--border))" />
                                <XAxis
                                    dataKey="prodotto"
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
                                    angle={-45}
                                    textAnchor="end"
                                    height={80}
                                    interval={0}
                                />
                                <YAxis
                                    tickLine={false}
                                    axisLine={false}
                                    tick={{ fontSize: 12, fill: "hsl(var(--muted-foreground))" }}
                                    width={40}
                                />
                                <Tooltip
                                    cursor={{ fill: "hsl(var(--muted))", opacity: 0.3 }}
                                    content={({ active, payload, label }) => {
                                        if (!active || !payload?.length) return null;
                                        const current = payload.find((p) => p.dataKey === "currentYear");
                                        const previous = payload.find((p) => p.dataKey === "previousYear");
                                        return (
                                            <div className="bg-popover border rounded-lg shadow-lg p-3 text-sm">
                                                <p className="font-semibold mb-2">{label}</p>
                                                <div className="space-y-1">
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-muted-foreground">{selectedYear}:</span>
                                                        <span className="font-medium">{current?.value ?? 0}</span>
                                                    </div>
                                                    <div className="flex justify-between gap-4">
                                                        <span className="text-muted-foreground">
                                                            {selectedYear - 1}:
                                                        </span>
                                                        <span className="font-medium">{previous?.value ?? 0}</span>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    }}
                                />
                                <Bar
                                    dataKey="currentYear"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={barWidth}
                                    name={String(selectedYear)}
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`current-${index}`} fill={getProductColor(index)} />
                                    ))}
                                </Bar>
                                <Bar
                                    dataKey="previousYear"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={barWidth}
                                    name={String(selectedYear - 1)}
                                >
                                    {chartData.map((_, index) => (
                                        <Cell key={`previous-${index}`} fill={getProductColorLight(index)} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </div>
                        <div className="flex justify-center gap-6 mt-2 text-sm">
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#003f5c" }} />
                                <span className="text-muted-foreground">
                                    {selectedYear} ({t("currentYear")})
                                </span>
                            </div>
                            <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-sm" style={{ backgroundColor: "#003f5c66" }} />
                                <span className="text-muted-foreground">
                                    {selectedYear - 1} ({t("previousYear")})
                                </span>
                            </div>
                        </div>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
