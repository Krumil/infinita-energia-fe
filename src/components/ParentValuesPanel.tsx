import { useEffect, useState, type Dispatch, type ReactElement, type SetStateAction } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { InputGroup, InputGroupAddon, InputGroupInput } from "@/components/ui/input-group";
import { Label } from "@/components/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
    AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { useTranslation } from "@/hooks/useTranslation";
import { ApiError } from "@/api/client";
import { getParentRuleConfiguration } from "@/api/agents";
import { parseEuroNumber } from "@/lib/numbers";
import { cn, formatCurrency } from "@/lib/utils";
import type { Agent, ParentRuleConfiguration } from "@/types";

export interface ParentValueEdit {
    regola_id: number;
    scaglione_id: number | null;
    input: string;
    // Undefined when the input is not a valid value, which blocks the dialog's Save.
    valore_padre: number | undefined;
}

interface ParentValuesPanelProps {
    agent: Agent;
    // Unsaved edits of the agent values tab, keyed by `${regola_id}_${scaglione_id}`.
    agentEdits: Map<string, string>;
    edits: Map<string, ParentValueEdit>;
    onEditsChange: Dispatch<SetStateAction<Map<string, ParentValueEdit>>>;
}

const headClass = "sticky top-0 z-10 h-10 bg-background px-3 text-left align-middle text-xs font-medium text-muted-foreground";

function rowKey(row: ParentRuleConfiguration): string {
    return `${row.regola_id}_${row.scaglione_id ?? "fisso"}`;
}

function parseParentValue(input: string): number | undefined {
    const value = parseEuroNumber(input);

    return value !== undefined && value >= 0 ? value : undefined;
}

// Postgres round(numeric, 2) rounds halves away from zero. toPrecision drops the binary float noise
// that would turn 0.575 into 57.49999999999999 cents.
function roundToCents(value: number): number {
    return (Math.sign(value) * Math.round(Number((Math.abs(value) * 100).toPrecision(12)))) / 100;
}

function formatInput(value: number): string {
    return String(value).replace(".", ",");
}

// The edits live in AgentDialog, so they survive a tab switch and go out with the dialog's Save.
export function ParentValuesPanel({ agent, agentEdits, edits, onEditsChange }: ParentValuesPanelProps): ReactElement {
    const { t } = useTranslation();

    const [configuration, setConfiguration] = useState<ParentRuleConfiguration[] | null>(null);
    const [loadError, setLoadError] = useState<unknown>(null);
    const [percentInput, setPercentInput] = useState("");
    const [confirmingPrefill, setConfirmingPrefill] = useState(false);
    // Inline instead of a toast: a toast sits on top of the dialog's Save button.
    const [prefilledPercent, setPrefilledPercent] = useState<string | null>(null);

    useEffect(() => {
        let ignore = false;

        const load = async (): Promise<void> => {
            try {
                const response = await getParentRuleConfiguration(agent.id);

                if (!ignore) setConfiguration(response.configurazione);
            } catch (error) {
                if (!ignore) setLoadError(error);
            }
        };

        void load();

        return () => {
            ignore = true;
        };
    }, [agent.id]);

    const percent = parseEuroNumber(percentInput);
    const isPercentValid = percent !== undefined && percent >= 0 && percent <= 100;

    const editedAgentValue = (row: ParentRuleConfiguration): number =>
        parseEuroNumber(agentEdits.get(`${row.regola_id}_${row.scaglione_id}`)) ?? row.valore;

    const handlePrefill = (configuration: ParentRuleConfiguration[]): void => {
        if (percent === undefined) return;

        const next = new Map<string, ParentValueEdit>();

        for (const row of configuration) {
            const valore = roundToCents((editedAgentValue(row) * percent) / 100);

            next.set(rowKey(row), {
                regola_id: row.regola_id,
                scaglione_id: row.scaglione_id,
                input: formatInput(valore),
                valore_padre: valore,
            });
        }

        setConfirmingPrefill(false);
        onEditsChange(next);
        setPrefilledPercent(percentInput.trim());
    };

    if (loadError !== null) {
        return (
            <p role="alert" className="py-10 text-center text-sm text-destructive">
                {loadError instanceof ApiError ? loadError.message : t("parentValuesLoadFailed")}
            </p>
        );
    }

    if (configuration === null) {
        return (
            <div role="status" className="flex min-h-48 items-center justify-center">
                <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
                <span className="sr-only">{t("loading")}</span>
            </div>
        );
    }

    if (configuration.length === 0) {
        return <p className="py-10 text-center text-sm italic text-muted-foreground">{t("parentValuesEmpty")}</p>;
    }

    return (
        <AlertDialog open={confirmingPrefill} onOpenChange={setConfirmingPrefill}>
            <div className="space-y-4">
                <p className="font-body text-sm text-muted-foreground">
                    {t("parentValuesDescription")
                        .replace("{parent}", agent.agente_padre ?? "")
                        .replace("{agent}", agent.nome_cognome)}
                </p>
                <div className="flex items-end gap-3">
                    <div className="space-y-1.5">
                        <Label htmlFor="parent_values_percent" className="editorial-caps text-muted-foreground">
                            {t("prefillPercent")}
                        </Label>
                        <InputGroup className="w-28" aria-invalid={percentInput !== "" && !isPercentValid}>
                            <InputGroupInput
                                id="parent_values_percent"
                                type="text"
                                inputMode="decimal"
                                value={percentInput}
                                onChange={(e) => setPercentInput(e.target.value)}
                                className="font-body pr-0 text-right"
                                aria-invalid={percentInput !== "" && !isPercentValid}
                            />
                            <InputGroupAddon align="inline-end" className="ml-1">%</InputGroupAddon>
                        </InputGroup>
                    </div>
                    <AlertDialogTrigger asChild>
                        <Button type="button" variant="outline" disabled={!isPercentValid}>
                            {t("prefillFromPercent")}
                        </Button>
                    </AlertDialogTrigger>
                </div>
                {prefilledPercent !== null && (
                    <p role="status" className="font-body text-sm text-muted-foreground">
                        {t("parentValuesPrefilled").replace("{percent}", prefilledPercent)}
                    </p>
                )}
                {/* Plain table: the default wrapper has its own overflow, which would stop the header from sticking to the dialog's scroll area. */}
                <div className="rounded-sm border border-border/50">
                    <Table appearance="plain" className="w-full text-sm [&_td]:px-3 [&_td]:py-2">
                        <TableHeader>
                            <TableRow className="border-b">
                                <TableHead className={headClass}>{t("rule")}</TableHead>
                                <TableHead className={headClass}>{t("tier")}</TableHead>
                                <TableHead className={cn(headClass, "text-right")}>{t("agentValue")}</TableHead>
                                <TableHead className={cn(headClass, "text-right")}>{t("parentValue")}</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {configuration.map((row) => {
                                const key = rowKey(row);
                                const input = edits.get(key)?.input ?? formatInput(row.valore_padre);

                                return (
                                    <TableRow key={key} className="border-b last:border-0">
                                        <TableCell>{row.regola_nome}</TableCell>
                                        <TableCell>{row.scaglione_nome}</TableCell>
                                        <TableCell className="text-right font-mono text-xs">
                                            {formatCurrency(editedAgentValue(row))}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                value={input}
                                                onChange={(e) => {
                                                    const edit = {
                                                        regola_id: row.regola_id,
                                                        scaglione_id: row.scaglione_id,
                                                        input: e.target.value,
                                                        valore_padre: parseParentValue(e.target.value),
                                                    };

                                                    onEditsChange((prev) => new Map(prev).set(key, edit));
                                                }}
                                                aria-label={`${t("parentValue")} ${row.regola_nome} ${row.scaglione_nome}`}
                                                aria-invalid={parseParentValue(input) === undefined}
                                                className="font-mono text-right h-8 w-28 ml-auto"
                                            />
                                        </TableCell>
                                    </TableRow>
                                );
                            })}
                        </TableBody>
                    </Table>
                </div>

                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle className="font-display text-xl">{t("prefillConfirmTitle")}</AlertDialogTitle>
                        <AlertDialogDescription className="font-body">
                            {t("prefillConfirmDescription").replace("{percent}", percentInput.trim())}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="btn-ghost">{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={() => handlePrefill(configuration)}>{t("prefill")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </div>
        </AlertDialog>
    );
}
