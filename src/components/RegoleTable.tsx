import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState, useCallback } from "react";
import { Pencil, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { SkipConfirmCheckbox } from "@/components/SkipConfirmCheckbox";
import { useConfirmSkip } from "@/hooks/useConfirmSkip";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, cn } from "@/lib/utils";
import { parseEuroNumber } from "@/lib/numbers";
import type { RulesTableProps } from "@/types/components";
import type { Rule } from "@/types/domain";
import { z } from "zod";

const customerTypeSchema = z.enum(["residenziale", "business"]);

const serviceTypeSchema = z.enum(["gas", "luce"]);

type PendingChange =
    | { rule: Rule; field: "tipo_utenza"; value: z.infer<typeof customerTypeSchema> | null }
    | { rule: Rule; field: "tipo_servizio"; value: z.infer<typeof serviceTypeSchema> | null };

function normalizeDescription(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function RulesTable({
    rules,
    tiers,
    onToggleEnabled,
    onUpdateDefault,
    onUpdateCustomerType,
    onUpdateServiceType,
}: RulesTableProps) {
    const { t } = useTranslation();
    const { toast } = useToast();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const skipConfirm = useConfirmSkip("rule-change");
    const { isSkipped, remember } = skipConfirm;

    const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

    const incompleteTiers = new Set(
        tiers
            .filter((tier) => tier.tipo_utenza === null)
            .map((tier) => normalizeDescription(tier.descrizione)),
    );

    const startEditing = useCallback((rule: Rule) => {
        setEditingId(rule.id);
        setEditValue(String(rule.valore_default));
    }, []);

    const applyChange = useCallback(
        (change: PendingChange) => {
            if (change.field === "tipo_utenza") {
                void onUpdateCustomerType(change.rule, change.value);
            } else {
                void onUpdateServiceType(change.rule, change.value);
            }
        },
        [onUpdateCustomerType, onUpdateServiceType],
    );

    const requestChange = useCallback(
        (change: PendingChange) => {
            // Only overwriting a type that's already set asks first; filling an empty one doesn't.
            if (change.rule[change.field] === null || isSkipped()) applyChange(change);
            else setPendingChange(change);
        },
        [isSkipped, applyChange],
    );

    const commitEdit = useCallback(
        (rule: Rule) => {
            const parsed = parseEuroNumber(editValue);

            if (parsed === undefined) {
                toast({ title: t("error"), description: t("invalidDefaultValue"), variant: "destructive" });
            } else if (parsed !== rule.valore_default) {
                void onUpdateDefault(rule, parsed);
            }

            setEditingId(null);
        },
        [editValue, toast, t, onUpdateDefault],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, rule: Rule) => {
            if (e.key === "Enter") {
                commitEdit(rule);
            } else if (e.key === "Escape") {
                setEditingId(null);
            }
        },
        [commitEdit],
    );

    const confirmChange = useCallback(() => {
        if (!pendingChange) return;
        remember();
        applyChange(pendingChange);
        setPendingChange(null);
    }, [pendingChange, remember, applyChange]);

    const typeLabel = (value: Rule["tipo_utenza"] | Rule["tipo_servizio"]): string => t(value ?? "typeNotSet");

    const changeDetail = (change: PendingChange): string => {
        const { rule } = change;

        return t("confirmRuleChangeDetail")
            .replace("{rule}", rule.descrizione)
            .replace("{field}", t(change.field === "tipo_utenza" ? "tipoUtenza" : "tipoServizio"))
            .replace("{old}", typeLabel(rule[change.field]))
            .replace("{new}", typeLabel(change.value));
    };

    return (
        <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
            <Table containerClassName="min-h-0 flex-1" className="table-fixed">
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("ruleDescription")}</TableHead>
                        <TableHead className="w-48">{t("tipoUtenza")}</TableHead>
                        <TableHead className="w-48">{t("tipoServizio")}</TableHead>
                        <TableHead className="text-right">{t("ruleDefault")}</TableHead>
                        <TableHead className="text-center w-28">{t("ruleActive")}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {rules.length === 0 ? (
                        <TableRow>
                            <TableCell colSpan={5} className="text-center py-12 font-display italic text-muted-foreground">
                                {t("noRegoleYet")}
                            </TableCell>
                        </TableRow>
                    ) : (
                        rules.map((rule) => {
                            const hasIncompleteTier = incompleteTiers.has(normalizeDescription(rule.descrizione));
                            const isIncomplete = rule.tipo_utenza === null || hasIncompleteTier;

                            return (
                            <TableRow
                                key={rule.id}
                                className={cn(
                                    "transition-opacity",
                                    !rule.utilizzato && "opacity-50",
                                    isIncomplete && "bg-amber-500/5",
                                )}
                            >
                                <TableCell className="font-body font-medium leading-snug">
                                    <span className="inline-flex items-center gap-2">
                                        {isIncomplete && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                                        {rule.descrizione}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={rule.tipo_utenza ?? ""}
                                        onValueChange={(value) => {
                                            const parsedValue = customerTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                requestChange({ rule, field: "tipo_utenza", value: parsedValue.data });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className={cn("h-8 gap-2 text-sm", isIncomplete && rule.tipo_utenza === null && "border-amber-500 ring-1 ring-amber-500/30")}>
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="residenziale">{t("residenziale")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={rule.tipo_servizio ?? ""}
                                        onValueChange={(value) => {
                                            if (value === "__none__") {
                                                requestChange({ rule, field: "tipo_servizio", value: null });

                                                return;
                                            }

                                            const parsedValue = serviceTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                requestChange({ rule, field: "tipo_servizio", value: parsedValue.data });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-8 gap-2 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rule.tipo_servizio !== null && <SelectItem value="__none__">—</SelectItem>}
                                            <SelectItem value="gas">{t("gas")}</SelectItem>
                                            <SelectItem value="luce">{t("luce")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                    {editingId === rule.id ? (
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => commitEdit(rule)}
                                            onKeyDown={(e) => handleKeyDown(e, rule)}
                                            className="font-mono text-right h-8 w-32 ml-auto"
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="group inline-flex items-center gap-2 font-mono cursor-pointer rounded px-2 py-1 bg-muted/30 hover:bg-muted/50 text-foreground hover:text-energia-accent-text transition-colors border border-border/40 hover:border-border float-right"
                                            onClick={() => startEditing(rule)}
                                            title={t("clickToEdit")}
                                        >
                                            {formatCurrency(rule.valore_default)}
                                            <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-70 transition-opacity" />
                                        </span>
                                    )}
                                </TableCell>
                                <TableCell className="text-center align-middle">
                                    <div className="flex items-center justify-center">
                                        {/* A disabled switch gets no pointer events, so the tooltip hangs on a wrapper. */}
                                        <Tooltip>
                                            <TooltipTrigger asChild>
                                                <span className="inline-flex" tabIndex={rule.tipo_utenza === null ? 0 : undefined}>
                                                    <Switch
                                                        checked={rule.utilizzato}
                                                        onCheckedChange={(checked) => void onToggleEnabled(rule, checked)}
                                                        disabled={rule.tipo_utenza === null}
                                                        aria-label={`${t("ruleActive")} ${rule.descrizione}`}
                                                        className="data-[state=checked]:bg-energia-accent"
                                                    />
                                                </span>
                                            </TooltipTrigger>
                                            {rule.tipo_utenza === null && (
                                                <TooltipContent>{t("ruleNeedsCustomerType")}</TooltipContent>
                                            )}
                                        </Tooltip>
                                    </div>
                                </TableCell>
                            </TableRow>
                            );
                        })
                    )}
                </TableBody>
            </Table>

            <AlertDialog open={pendingChange !== null} onOpenChange={(open) => !open && setPendingChange(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>{t("confirmRuleChangeTitle")}</AlertDialogTitle>
                        <AlertDialogDescription>
                            {pendingChange && <span className="block font-medium text-foreground">{changeDetail(pendingChange)}</span>}
                            {t("confirmRuleChangeDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <SkipConfirmCheckbox skip={skipConfirm} />
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmChange}>{t("confirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
