import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";
import { useState, useCallback, useEffect } from "react";
import { Check, X as XIcon, Pencil, AlertTriangle } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
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
    | { rule: Rule; field: "tipo_servizio"; value: z.infer<typeof serviceTypeSchema> | null }
    | { rule: Rule; field: "valore_default"; value: number };

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
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [popoverState, setPopoverState] = useState<{ ruleId: number; activated: boolean } | null>(null);

    const [pendingChange, setPendingChange] = useState<PendingChange | null>(null);

    const incompleteTiers = new Set(
        tiers
            .filter((tier) => tier.tipo_utenza === null)
            .map((tier) => normalizeDescription(tier.descrizione)),
    );

    useEffect(() => {
        if (popoverState) {
            const timer = setTimeout(() => setPopoverState(null), 1500);

            return () => clearTimeout(timer);
        }
    }, [popoverState]);

    const handleToggle = useCallback(
        (rule: Rule, checked: boolean) => {
            setPopoverState({ ruleId: rule.id, activated: checked });
            onToggleEnabled(rule, checked);
        },
        [onToggleEnabled],
    );

    const startEditing = useCallback((rule: Rule) => {
        setEditingId(rule.id);
        setEditValue(String(rule.valore_default));
    }, []);

    const commitEdit = useCallback(
        (rule: Rule) => {
            const parsed = parseEuroNumber(editValue);

            if (parsed !== undefined && parsed !== rule.valore_default) {
                setPendingChange({ rule, field: "valore_default", value: parsed });
            }

            setEditingId(null);
        },
        [editValue],
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

    const handleFieldChange = useCallback(
        (rule: Rule, field: "tipo_utenza", value: z.infer<typeof customerTypeSchema> | null) => {
            setPendingChange({ rule, field, value });
        },
        [],
    );

    const confirmChange = useCallback(() => {
        if (!pendingChange) return;
        const { rule, field, value } = pendingChange;

        if (field === "tipo_utenza") {
            void onUpdateCustomerType(rule, value);
        } else if (field === "tipo_servizio") {
            void onUpdateServiceType(rule, value);
        } else {
            void onUpdateDefault(rule, value);
        }

        setPendingChange(null);
    }, [pendingChange, onUpdateCustomerType, onUpdateServiceType, onUpdateDefault]);

    return (
        <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
            <Table appearance="plain" className="ledger-table w-full">
                <TableHeader>
                    <TableRow>
                        <TableHead className="font-medium text-sm normal-case tracking-normal">{t("ruleDescription")}</TableHead>
                        <TableHead className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoUtenza")}</TableHead>
                        <TableHead className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoServizio")}</TableHead>
                        <TableHead className="!text-right font-medium text-sm normal-case tracking-normal">{t("ruleDefault")}</TableHead>
                        <TableHead className="text-center w-28 font-medium text-sm normal-case tracking-normal">{t("ruleActive")}</TableHead>
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
                                <TableCell className="font-body font-medium">
                                    <span className="inline-flex items-center gap-2">
                                        {isIncomplete && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                                        {rule.descrizione}
                                    </span>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={rule.tipo_utenza ?? "__none__"}
                                        onValueChange={(value) => {
                                            if (value === "__none__") {
                                                handleFieldChange(rule, "tipo_utenza", null);

                                                return;
                                            }

                                            const parsedValue = customerTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                handleFieldChange(rule, "tipo_utenza", parsedValue.data);
                                            }
                                        }}
                                    >
                                        <SelectTrigger className={cn("h-8 text-sm", isIncomplete && rule.tipo_utenza === null && "border-amber-500 ring-1 ring-amber-500/30")}>
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {rule.tipo_utenza === null && <SelectItem value="__none__">—</SelectItem>}
                                            <SelectItem value="residenziale">{t("residenziale")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </TableCell>
                                <TableCell>
                                    <Select
                                        value={rule.tipo_servizio ?? "__none__"}
                                        onValueChange={(value) => {
                                            if (value === "__none__") {
                                                setPendingChange({ rule, field: "tipo_servizio", value: null });

                                                return;
                                            }

                                            const parsedValue = serviceTypeSchema.safeParse(value);

                                            if (parsedValue.success) {
                                                setPendingChange({ rule, field: "tipo_servizio", value: parsedValue.data });
                                            }
                                        }}
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
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
                                            className="group inline-flex items-center gap-2 font-mono cursor-pointer rounded px-2 py-1 bg-muted/30 hover:bg-muted/50 text-foreground hover:text-energia-accent transition-colors border border-border/40 hover:border-border float-right"
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
                                        <Popover open={popoverState?.ruleId === rule.id}>
                                            <PopoverTrigger asChild>
                                                <div>
                                                    <Switch
                                                        checked={rule.utilizzato}
                                                        onCheckedChange={(checked) =>
                                                            handleToggle(rule, checked)
                                                        }
                                                        disabled={rule.tipo_utenza === null}
                                                        aria-label={`${t("ruleActive")} ${rule.descrizione}`}
                                                        className="data-[state=checked]:bg-energia-accent"
                                                    />
                                                </div>
                                            </PopoverTrigger>
                                            <PopoverContent
                                                side="top"
                                                className="w-auto px-3 py-2 text-sm font-medium"
                                                sideOffset={8}
                                            >
                                                <div className="flex items-center gap-2">
                                                    {popoverState?.activated ? (
                                                        <>
                                                            <Check className="h-4 w-4 text-energia-accent" />
                                                            <span>{t("ruleActivated")}</span>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <XIcon className="h-4 w-4 text-muted-foreground" />
                                                            <span>{t("ruleDeactivated")}</span>
                                                        </>
                                                    )}
                                                </div>
                                            </PopoverContent>
                                        </Popover>
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
                            {t("confirmRuleChangeDescription")}
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                        <AlertDialogAction onClick={confirmChange}>{t("confirm")}</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
