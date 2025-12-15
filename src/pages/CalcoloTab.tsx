import { Calculator, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileDropzone, EmptyState, CalcoloResults } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Liquidazione, CalcoloResult } from "@/types";
import type { UnmatchedAgent } from "@/hooks/useCalcolo";

interface CalcoloTabProps {
    data: Liquidazione[];
    result: CalcoloResult | null;
    loading: boolean;
    unmatchedAgents: UnmatchedAgent[];
    onUpload: (files: File[]) => void;
    onCalculate: () => void;
}

export function CalcoloTab({
    data,
    result,
    loading,
    unmatchedAgents,
    onUpload,
    onCalculate,
}: CalcoloTabProps) {
    const { t } = useTranslation();

    return (
        <div className="space-y-8">
            <div>
                <h2 className="font-display text-2xl">{t("calculateCommissionsTitle")}</h2>
                <p className="font-body text-muted-foreground mt-1">{t("calculateCommissionsDesc")}</p>
            </div>

            <div className="ledger-card p-6 space-y-6">
                <FileDropzone accept=".xlsx,.xls" maxSizeMB={50} onFiles={onUpload} disabled={loading} />
                {data.length > 0 && (
                    <div className="flex items-center justify-between p-4 bg-secondary/30 border border-border/30">
                        <span className="font-mono text-sm">
                            {t("parsedRecords")}: <span className="text-foreground font-semibold">{data.length}</span>
                        </span>
                        <Button onClick={onCalculate} disabled={loading} className="btn-primary">
                            {loading ? (
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                                <Calculator className="mr-2 h-4 w-4" />
                            )}
                            {t("calculateCommissions")}
                        </Button>
                    </div>
                )}
                {loading && (
                    <div className="flex items-center justify-center py-12 gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
                        <span className="font-display">{t("calculating")}</span>
                    </div>
                )}
            </div>

            {/* Unmatched Agents Warning */}
            {unmatchedAgents.length > 0 && data.length > 0 && (
                <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                    <AlertTriangle className="h-5 w-5 text-amber-600" />
                    <AlertTitle className="text-amber-800 dark:text-amber-400 font-display">
                        {t("unmatchedAgentsWarning")}
                    </AlertTitle>
                    <AlertDescription className="text-amber-700 dark:text-amber-300">
                        <p className="mb-3 font-body">{t("unmatchedAgentsDesc")}</p>
                        <div className="bg-white/50 dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800 p-3 max-h-48 overflow-y-auto">
                            <table className="w-full text-sm">
                                <thead>
                                    <tr className="border-b border-amber-200 dark:border-amber-800">
                                        <th className="text-left py-1 font-display">{t("seller")}</th>
                                        <th className="text-right py-1 font-display">{t("recordsAffected")}</th>
                                    </tr>
                                </thead>
                                <tbody className="font-mono">
                                    {unmatchedAgents.map((agent, idx) => (
                                        <tr
                                            key={idx}
                                            className="border-b border-amber-100 dark:border-amber-900 last:border-0"
                                        >
                                            <td className="py-1.5">{agent.name}</td>
                                            <td className="text-right py-1.5">{agent.count}</td>
                                        </tr>
                                    ))}
                                </tbody>
                                <tfoot>
                                    <tr className="border-t border-amber-200 dark:border-amber-800 font-semibold">
                                        <td className="py-1.5">
                                            {unmatchedAgents.length} {t("unmatchedAgentsCount")}
                                        </td>
                                        <td className="text-right py-1.5">
                                            {unmatchedAgents.reduce((sum, a) => sum + a.count, 0)} {t("recordsAffected")}
                                        </td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </AlertDescription>
                </Alert>
            )}

            {result && Object.keys(result).length > 0 ? (
                <CalcoloResults data={result} />
            ) : (
                !loading &&
                data.length === 0 && (
                    <EmptyState message={t("noCalculationYet")} icon={<Calculator className="h-16 w-16" />} />
                )
            )}
        </div>
    );
}
