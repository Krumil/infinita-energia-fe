import { useState } from "react";
import { Calculator, AlertTriangle, Loader2, Upload, FileSpreadsheet, Users, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
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
    onNavigate?: (tab: string) => void;
}

export function CalcoloTab({
    data,
    result,
    loading,
    unmatchedAgents,
    onUpload,
    onCalculate,
    onNavigate,
}: CalcoloTabProps) {
    const { t } = useTranslation();
    const [showDropzone, setShowDropzone] = useState(true);
    const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);

    const hasData = data.length > 0;
    const hasUnmatched = unmatchedAgents.length > 0;
    const totalAffectedRecords = unmatchedAgents.reduce((sum, a) => sum + a.count, 0);
    const affectedPercentage = hasData ? Math.round((totalAffectedRecords / data.length) * 100) : 0;

    // When data is loaded, collapse the dropzone
    const shouldShowDropzone = showDropzone || !hasData;

    const handleCalculateClick = () => {
        if (hasUnmatched) {
            setConfirmDialogOpen(true);
        } else {
            onCalculate();
        }
    };

    const handleConfirmCalculate = () => {
        setConfirmDialogOpen(false);
        onCalculate();
    };

    const handleNewFile = () => {
        setShowDropzone(true);
    };

    const handleUpload = (files: File[]) => {
        onUpload(files);
        setShowDropzone(false);
    };

    return (
        <div className="space-y-6">
            {/* Header */}
            <div>
                <h2 className="font-display text-2xl">{t("calculateCommissionsTitle")}</h2>
                <p className="font-body text-muted-foreground mt-1">{t("calculateCommissionsDesc")}</p>
            </div>

            {/* Upload Section - Collapsible */}
            {shouldShowDropzone ? (
                <div className="ledger-card p-6">
                    <FileDropzone accept=".xlsx,.xls" maxSizeMB={50} onFiles={handleUpload} disabled={loading} />
                </div>
            ) : hasData ? (
                /* Compact Upload Bar */
                <div className="ledger-card p-4">
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-4 min-w-0">
                            <div className="flex items-center gap-3 min-w-0">
                                <FileSpreadsheet className="h-5 w-5 text-muted-foreground flex-shrink-0" />
                                <div className="min-w-0">
                                    <div className="flex items-center gap-2">
                                        <span className="font-mono font-semibold">{data.length}</span>
                                        <span className="text-muted-foreground text-sm">
                                            {t("records").toLowerCase()} {t("readyToCalculate")}
                                        </span>
                                    </div>
                                </div>
                            </div>

                            {/* Warning Badge with Popover */}
                            {hasUnmatched && (
                                <Popover>
                                    <PopoverTrigger asChild>
                                        <Badge
                                            variant="outline"
                                            className="cursor-pointer border-amber-500/50 bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-950/50"
                                        >
                                            <AlertTriangle className="h-3 w-3 mr-1" />
                                            {unmatchedAgents.length} {t("unmatchedShort")}
                                        </Badge>
                                    </PopoverTrigger>
                                    <PopoverContent className="w-96" align="start">
                                        <div className="space-y-4">
                                            {/* Header */}
                                            <div className="flex items-start gap-3">
                                                <div className="p-2 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                                    <AlertTriangle className="h-4 w-4 text-amber-600 dark:text-amber-400" />
                                                </div>
                                                <div>
                                                    <h4 className="font-display font-semibold text-amber-800 dark:text-amber-300">
                                                        {t("unmatchedAgentsWarning")}
                                                    </h4>
                                                    <p className="text-sm text-muted-foreground mt-0.5">
                                                        {t("unmatchedAgentsDesc")}
                                                    </p>
                                                </div>
                                            </div>

                                            <Separator />

                                            {/* Stats Summary */}
                                            <div className="grid grid-cols-3 gap-3 text-center">
                                                <div className="p-2 rounded-md bg-secondary/50">
                                                    <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                                                        {unmatchedAgents.length}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t("unmatchedAgentsCount")}
                                                    </div>
                                                </div>
                                                <div className="p-2 rounded-md bg-secondary/50">
                                                    <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                                                        {totalAffectedRecords}
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t("recordsAffected")}
                                                    </div>
                                                </div>
                                                <div className="p-2 rounded-md bg-secondary/50">
                                                    <div className="text-lg font-mono font-bold text-amber-600 dark:text-amber-400">
                                                        {affectedPercentage}%
                                                    </div>
                                                    <div className="text-xs text-muted-foreground">
                                                        {t("of")} {t("total").toLowerCase()}
                                                    </div>
                                                </div>
                                            </div>

                                            {/* Agents List */}
                                            <div className="max-h-40 overflow-y-auto border rounded-md bg-secondary/20">
                                                <table className="w-full text-sm">
                                                    <thead className="bg-secondary/50 sticky top-0">
                                                        <tr>
                                                            <th className="text-left py-2 px-3 font-medium text-xs uppercase tracking-wider">
                                                                {t("seller")}
                                                            </th>
                                                            <th className="text-right py-2 px-3 font-medium text-xs uppercase tracking-wider">
                                                                {t("records")}
                                                            </th>
                                                        </tr>
                                                    </thead>
                                                    <tbody className="font-mono text-xs">
                                                        {unmatchedAgents.map((agent, idx) => (
                                                            <tr
                                                                key={idx}
                                                                className="border-t border-border/50 hover:bg-secondary/30"
                                                            >
                                                                <td className="py-2 px-3 truncate max-w-[220px]" title={agent.name}>
                                                                    {agent.name}
                                                                </td>
                                                                <td className="text-right py-2 px-3 tabular-nums">
                                                                    {agent.count}
                                                                </td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>

                                            <Separator />

                                            {/* Action */}
                                            {onNavigate && (
                                                <Button
                                                    variant="outline"
                                                    size="sm"
                                                    className="w-full"
                                                    onClick={() => onNavigate("agenti")}
                                                >
                                                    <Users className="h-4 w-4 mr-2" />
                                                    {t("goToAgentsTab")}
                                                    <ExternalLink className="h-3 w-3 ml-auto opacity-50" />
                                                </Button>
                                            )}
                                        </div>
                                    </PopoverContent>
                                </Popover>
                            )}
                        </div>

                        <div className="flex items-center gap-2 flex-shrink-0">
                            <Button variant="ghost" size="sm" onClick={handleNewFile} disabled={loading}>
                                <Upload className="h-4 w-4 mr-1.5" />
                                {t("newFile")}
                            </Button>
                            <Button onClick={handleCalculateClick} disabled={loading} className="btn-primary">
                                {loading ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Calculator className="mr-2 h-4 w-4" />
                                )}
                                {t("calculateCommissions")}
                            </Button>
                        </div>
                    </div>
                </div>
            ) : null}

            {/* Loading State */}
            {loading && (
                <div className="flex items-center justify-center py-16 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
                    <span className="font-display">{t("calculating")}</span>
                </div>
            )}

            {/* Results Section */}
            {!loading && result && Object.keys(result).length > 0 ? (
                <CalcoloResults data={result} />
            ) : (
                !loading &&
                !hasData && (
                    <EmptyState message={t("noCalculationYet")} icon={<Calculator className="h-16 w-16" />} />
                )
            )}

            {/* Confirmation Dialog for Unmatched Agents */}
            <AlertDialog open={confirmDialogOpen} onOpenChange={setConfirmDialogOpen}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-amber-500" />
                            {t("continueWithUnmatched")}
                        </AlertDialogTitle>
                        <AlertDialogDescription asChild>
                            <div className="space-y-3">
                                <p>{t("unmatchedAgentsDesc")}</p>
                                <div className="max-h-48 overflow-y-auto border rounded-md bg-secondary/30">
                                    <table className="w-full text-sm">
                                        <thead className="bg-secondary/50 sticky top-0">
                                            <tr>
                                                <th className="text-left py-2 px-3 font-medium">{t("seller")}</th>
                                                <th className="text-right py-2 px-3 font-medium">
                                                    {t("recordsAffected")}
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody className="font-mono text-xs">
                                            {unmatchedAgents.map((agent, idx) => (
                                                <tr key={idx} className="border-t">
                                                    <td className="py-2 px-3">{agent.name}</td>
                                                    <td className="text-right py-2 px-3">{agent.count}</td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                                <p className="text-amber-600 dark:text-amber-400 font-medium">
                                    {totalAffectedRecords} {t("recordsWillBeSkipped")}
                                </p>
                            </div>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmCalculate}>
                            {t("continueAnyway")}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
