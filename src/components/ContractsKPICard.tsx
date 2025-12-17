import { TrendingUp, TrendingDown } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { calculateYoYChange } from "@/data/dashboardMockData";
import { useTranslation } from "@/hooks/useTranslation";

interface ContractsKPICardProps {
    totalContracts: number;
    previousYearContracts: number;
    selectedYear: number;
}

export function ContractsKPICard({ totalContracts, previousYearContracts, selectedYear }: ContractsKPICardProps) {
    const { t } = useTranslation();
    const yoyChange = calculateYoYChange(totalContracts, previousYearContracts);
    const isPositive = yoyChange >= 0;

    return (
        <Card className="animate-fade-up w-full sm:w-auto sm:min-w-[280px]">
            <CardContent className="pt-4 pb-3">
                <div className="flex items-center gap-4">
                    <div>
                        <div className="text-xs font-medium text-muted-foreground mb-1">
                            {t("contracts")} {selectedYear}
                        </div>
                        <div className="text-3xl font-bold font-display tabular-nums">{totalContracts}</div>
                    </div>
                    <div className="flex flex-col items-end gap-1">
                        <div
                            className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                                isPositive
                                    ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                                    : "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400"
                            }`}
                        >
                            {isPositive ? <TrendingUp className="h-3 w-3" /> : <TrendingDown className="h-3 w-3" />}
                            <span>
                                {isPositive ? "+" : ""}
                                {yoyChange.toFixed(1)}%
                            </span>
                        </div>
                        <div className="text-xs text-muted-foreground">vs {previousYearContracts}</div>
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
