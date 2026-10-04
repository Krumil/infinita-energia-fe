import type { ReactElement } from "react";
import { ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import { formatMonthLabel } from "@/lib/competenceDates";
import { cn } from "@/lib/utils";

interface PreviewOutlineProps {
    month: string;
    loading: boolean;
    onGoToOrders: () => void;
}

const PLACEHOLDER_ROW_WIDTHS = ["w-40", "w-56", "w-32"];

// Before the first preview, the page shows the outline of the results so the total and the table fill in place.
// The placeholder parts are hidden from assistive technology; only the message and the Ordini link are read.
export function PreviewOutline({ month, loading, onGoToOrders }: PreviewOutlineProps): ReactElement {
    const { t, language } = useTranslation();
    const pulse = loading && "animate-pulse";

    return (
        <div aria-busy={loading} className="space-y-6">
            <div className="kpi-card p-6 text-center">
                <span aria-hidden="true" className="kpi-label">
                    {t("totalCommission")}
                    {month && <span className="text-energia-accent"> — {formatMonthLabel(month, language)}</span>}
                </span>
                {loading ? (
                    <div className="mt-3 flex h-12 items-center justify-center gap-3">
                        <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
                        <span className="font-display">{t("previewLoading")}</span>
                    </div>
                ) : (
                    <>
                        <div aria-hidden="true" className="mt-3 font-mono text-5xl font-semibold tracking-tight text-muted-foreground/40">
                            — €
                        </div>
                        <p className="mt-3 text-sm text-muted-foreground">{t("previewIdle")}</p>
                    </>
                )}
            </div>

            <div className="space-y-4">
                <h3 aria-hidden="true" className="font-display text-xl text-muted-foreground">
                    {t("summaryByBeneficiary")}
                </h3>
                <div className="ledger-card overflow-hidden">
                    <Table aria-hidden="true">
                        <TableHeader>
                            <TableRow>
                                <TableHead className="w-12"></TableHead>
                                <TableHead className="w-16">{t("previewIncludeColumn")}</TableHead>
                                <TableHead>{t("beneficiary")}</TableHead>
                                <TableHead className="text-right">{t("records")}</TableHead>
                                <TableHead className="text-right">{t("totalCommission")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {PLACEHOLDER_ROW_WIDTHS.map((width) => (
                                <TableRow key={width} className="hover:bg-transparent">
                                    <TableCell />
                                    <TableCell>
                                        <div className="h-4 w-4 rounded-sm bg-muted" />
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("h-3 rounded-sm bg-muted", width, pulse)} />
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("ml-auto h-3 w-8 rounded-sm bg-muted", pulse)} />
                                    </TableCell>
                                    <TableCell>
                                        <div className={cn("ml-auto h-3 w-20 rounded-sm bg-muted", pulse)} />
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    <p className="flex flex-wrap items-center justify-center gap-x-2 border-t border-border/50 px-4 py-3 text-sm text-muted-foreground">
                        {t("previewImportHint")}
                        <Button variant="link" size="unstyled" className="h-auto p-0" onClick={onGoToOrders}>
                            {t("previewGoToOrders")}
                            <ArrowRight className="h-3.5 w-3.5" />
                        </Button>
                    </p>
                </div>
            </div>
        </div>
    );
}
