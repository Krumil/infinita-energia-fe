import { useId, type ReactElement } from "react";
import { AlertTriangle, ArrowRight, CheckCircle2, Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ZipDownloadButton } from "@/components/ZipDownloadButton";
import { useTranslation } from "@/hooks/useTranslation";
import type { ConfirmationState } from "@/hooks/useCalcolo";
import { buildSavedZip, SavedInviteDetailError } from "@/lib/calculationExport";
import { formatMonthLabel } from "@/lib/competenceDates";
import { formatCurrency } from "@/lib/utils";
import type { ConfirmationResult } from "@/types";

const EMPTY_VALUE = "—";

interface ConfirmationOutcomeProps {
    confirmation: Exclude<ConfirmationState, { status: "idle" }>;
    // The draft was edited after a successful save, so the outcome no longer describes what is on screen.
    changedAfterSave: boolean;
    onOpenInvites: () => void;
}

export function ConfirmationOutcome({ confirmation, changedAfterSave, onOpenInvites }: ConfirmationOutcomeProps): ReactElement {
    const { t, language } = useTranslation();
    const titleId = useId();
    const { snapshot } = confirmation;
    const savedCount = confirmation.status === "done" ? confirmation.results.filter((result) => result.salvato).length : 0;

    const agentName = (agentId: number): string =>
        snapshot.agents.find((agent) => agent.agente_id === agentId)?.nome_agente ?? t("agentIdLabel").replace("{id}", String(agentId));

    const describeSavedExportError = (cause: unknown): string =>
        cause instanceof SavedInviteDetailError
            ? t("exportSavedDetailFailed").replace("{invite}", String(cause.inviteId)).replace("{agent}", agentName(cause.agentId))
            : t("exportFailed");

    const renderDone = (results: ConfirmationResult[]): ReactElement => {
        const saved = results.filter((result) => result.salvato).length;
        const skipped = results.length - saved;

        const summary =
            skipped === 0 ? (
                <p role="status" className="flex items-center gap-2 rounded-md border border-emerald-500/40 bg-emerald-50 p-3 text-sm text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-300">
                    <CheckCircle2 className="h-4 w-4 shrink-0" />
                    {t("confirmDoneAll").replace("{saved}", String(saved))}
                </p>
            ) : saved === 0 ? (
                <p role="status" className="flex items-center gap-2 rounded-md border border-sky-500/40 bg-sky-50 p-3 text-sm text-sky-800 dark:bg-sky-950/30 dark:text-sky-300">
                    <Info className="h-4 w-4 shrink-0" />
                    {t("confirmDoneNone").replace("{skipped}", String(skipped))}
                </p>
            ) : (
                <p role="status" className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300">
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {t("confirmDonePartial").replace("{saved}", String(saved)).replace("{skipped}", String(skipped))}
                </p>
            );

        return (
            <>
                {summary}
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>{t("confirmColumnAgent")}</TableHead>
                                <TableHead>{t("confirmColumnOutcome")}</TableHead>
                                <TableHead>{t("confirmColumnInvite")}</TableHead>
                                <TableHead className="text-right">{t("confirmColumnSavedTotal")}</TableHead>
                                <TableHead>{t("confirmColumnReason")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {results.map((result) => (
                                <TableRow key={result.agente_id}>
                                    <TableCell className="font-medium">{agentName(result.agente_id)}</TableCell>
                                    <TableCell>
                                        <Badge variant={result.salvato ? "secondary" : "outline"}>
                                            {result.salvato ? t("confirmSaved") : t("confirmSkipped")}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="font-mono text-xs">#{result.invito_id}</TableCell>
                                    <TableCell className="text-right font-mono">
                                        {result.salvato ? formatCurrency(result.totale_invito) : EMPTY_VALUE}
                                    </TableCell>
                                    <TableCell className="text-sm text-muted-foreground">
                                        {result.salvato ? EMPTY_VALUE : result.motivo}
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>
                {changedAfterSave && (
                    <p className="flex items-center gap-2 text-sm text-amber-700 dark:text-amber-300">
                        <AlertTriangle className="h-4 w-4 shrink-0" />
                        {t("confirmChangedAfterSave")}
                    </p>
                )}
            </>
        );
    };

    const renderStatus = (): ReactElement => {
        switch (confirmation.status) {
            case "submitting":
                return (
                    <p role="status" className="flex items-center gap-2 text-sm">
                        <Loader2 className="h-4 w-4 animate-spin text-energia-accent" />
                        {t("confirmSubmitting")}
                    </p>
                );

            case "done":
                return renderDone(confirmation.results);

            case "rejected":
                return (
                    <div role="alert" className="space-y-2 rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm">
                        <p className="font-medium">{t("confirmRejectedTitle")}</p>
                        <p>{confirmation.message}</p>
                        <p className="text-muted-foreground">{t("confirmRejectedDescription")}</p>
                    </div>
                );

            case "unknown":
                return (
                    <div role="alert" className="space-y-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-900 dark:bg-amber-950/30 dark:text-amber-200">
                        <p className="font-medium">{t("confirmUnknownTitle")}</p>
                        <p>{t("confirmUnknownDescription")}</p>
                        {confirmation.message && <p className="text-amber-800/80 dark:text-amber-300/80">{confirmation.message}</p>}
                    </div>
                );
        }
    };

    return (
        <section aria-labelledby={titleId} className="ledger-card space-y-4 p-4">
            <div className="space-y-1">
                <h3 id={titleId} className="font-display text-lg">
                    {t("confirmOutcomeTitle")}
                </h3>
                <p className="text-sm text-muted-foreground">
                    {t("confirmSnapshot")
                        .replace("{month}", formatMonthLabel(snapshot.month, language))
                        .replace("{agents}", String(snapshot.agents.length))
                        .replace("{rows}", String(snapshot.rows))
                        .replace("{total}", formatCurrency(snapshot.total))}
                </p>
            </div>
            {renderStatus()}
            {confirmation.status !== "submitting" && (
                <div className="flex flex-wrap items-start gap-3">
                    <Button variant="outline" size="sm" onClick={onOpenInvites}>
                        {t("confirmOpenInvites")}
                        <ArrowRight className="h-4 w-4" />
                    </Button>
                    {confirmation.status === "done" && (
                        <ZipDownloadButton
                            label={t("exportSavedAction")}
                            note={savedCount === 0 ? t("exportSavedNone") : t("exportSavedNote")}
                            disabled={savedCount === 0}
                            build={() => buildSavedZip(snapshot, confirmation.results)}
                            describeError={describeSavedExportError}
                        />
                    )}
                </div>
            )}
        </section>
    );
}
