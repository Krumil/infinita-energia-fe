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
import type { RegoleTableProps } from "@/types/components";
import type { Regola } from "@/types/domain";

function normalizeDescription(value: string): string {
    return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function RegoleTable({
    regole,
    scaglioni,
    onToggleUtilizzato,
    onUpdateDefault,
    onUpdateTipoUtenza,
    onUpdateTipoServizio,
}: RegoleTableProps) {
    const { t } = useTranslation();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [popoverState, setPopoverState] = useState<{ regolaId: number; activated: boolean } | null>(null);
    const [pendingChange, setPendingChange] = useState<{
        regola: Regola;
        field: "tipo_utenza" | "tipo_servizio" | "valore_default";
        value: "residenziale" | "business" | "gas" | "luce" | number | null;
    } | null>(null);
    const incompleteScaglioni = new Set(
        scaglioni
            .filter((scaglione) => scaglione.tipo_utenza === null)
            .map((scaglione) => normalizeDescription(scaglione.descrizione)),
    );

    useEffect(() => {
        if (popoverState) {
            const timer = setTimeout(() => setPopoverState(null), 1500);
            return () => clearTimeout(timer);
        }
    }, [popoverState]);

    const handleToggle = useCallback(
        (regola: Regola, checked: boolean) => {
            setPopoverState({ regolaId: regola.id, activated: checked });
            onToggleUtilizzato(regola, checked);
        },
        [onToggleUtilizzato],
    );

    const startEditing = useCallback((regola: Regola) => {
        setEditingId(regola.id);
        setEditValue(String(regola.valore_default));
    }, []);

    const commitEdit = useCallback(
        (regola: Regola) => {
            const parsed = parseEuroNumber(editValue);
            if (parsed !== undefined && parsed !== regola.valore_default) {
                setPendingChange({ regola, field: "valore_default", value: parsed });
            }
            setEditingId(null);
        },
        [editValue],
    );

    const handleKeyDown = useCallback(
        (e: React.KeyboardEvent, regola: Regola) => {
            if (e.key === "Enter") {
                commitEdit(regola);
            } else if (e.key === "Escape") {
                setEditingId(null);
            }
        },
        [commitEdit],
    );

    const handleFieldChange = useCallback(
        (regola: Regola, field: "tipo_utenza" | "tipo_servizio", value: "residenziale" | "business" | "gas" | "luce" | null) => {
            setPendingChange({ regola, field, value });
        },
        [],
    );

    const confirmChange = useCallback(() => {
        if (!pendingChange) return;
        const { regola, field, value } = pendingChange;
        if (field === "tipo_utenza") {
            onUpdateTipoUtenza(regola, value as "residenziale" | "business" | null);
        } else if (field === "tipo_servizio") {
            onUpdateTipoServizio(regola, value as "gas" | "luce" | null);
        } else {
            onUpdateDefault(regola, value as number);
        }
        setPendingChange(null);
    }, [pendingChange, onUpdateTipoUtenza, onUpdateTipoServizio, onUpdateDefault]);

    return (
        <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
            <table className="ledger-table w-full">
                <thead>
                    <tr>
                        <th className="font-medium text-sm normal-case tracking-normal">{t("ruleDescription")}</th>
                        <th className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoUtenza")}</th>
                        <th className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoServizio")}</th>
                        <th className="!text-right font-medium text-sm normal-case tracking-normal">{t("ruleDefault")}</th>
                        <th className="text-center w-28 font-medium text-sm normal-case tracking-normal">{t("ruleActive")}</th>
                    </tr>
                </thead>
                <tbody>
                    {regole.length === 0 ? (
                        <tr>
                            <td colSpan={5} className="text-center py-12 font-display italic text-muted-foreground">
                                {t("noRegoleYet")}
                            </td>
                        </tr>
                    ) : (
                        regole.map((regola) => {
                            const hasIncompleteScaglione = incompleteScaglioni.has(normalizeDescription(regola.descrizione));
                            const isIncomplete = regola.tipo_utenza === null || hasIncompleteScaglione;
                            return (
                            <tr
                                key={regola.id}
                                className={cn(
                                    "transition-opacity",
                                    !regola.utilizzato && "opacity-50",
                                    isIncomplete && "bg-amber-500/5",
                                )}
                            >
                                <td className="font-body font-medium">
                                    <span className="inline-flex items-center gap-2">
                                        {isIncomplete && <AlertTriangle className="h-4 w-4 text-amber-500 shrink-0" />}
                                        {regola.descrizione}
                                    </span>
                                </td>
                                <td>
                                    <Select
                                        value={regola.tipo_utenza ?? "__none__"}
                                        onValueChange={(value) =>
                                            handleFieldChange(regola, "tipo_utenza", value === "__none__" ? null : value as "residenziale" | "business")
                                        }
                                    >
                                        <SelectTrigger className={cn("h-8 text-sm", isIncomplete && regola.tipo_utenza === null && "border-amber-500 ring-1 ring-amber-500/30")}>
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            {regola.tipo_utenza === null && <SelectItem value="__none__">—</SelectItem>}
                                            <SelectItem value="residenziale">{t("residenziale")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td>
                                    <Select
                                        value={regola.tipo_servizio ?? "__none__"}
                                        onValueChange={(value) =>
                                            handleFieldChange(regola, "tipo_servizio", value === "__none__" ? null : value as "gas" | "luce")
                                        }
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
                                </td>
                                <td className="text-right">
                                    {editingId === regola.id ? (
                                        <Input
                                            type="text"
                                            inputMode="decimal"
                                            value={editValue}
                                            onChange={(e) => setEditValue(e.target.value)}
                                            onBlur={() => commitEdit(regola)}
                                            onKeyDown={(e) => handleKeyDown(e, regola)}
                                            className="font-mono text-right h-8 w-32 ml-auto"
                                            autoFocus
                                        />
                                    ) : (
                                        <span
                                            className="group inline-flex items-center gap-2 font-mono cursor-pointer rounded px-2 py-1 bg-muted/30 hover:bg-muted/50 text-foreground hover:text-energia-accent transition-colors border border-border/40 hover:border-border float-right"
                                            onClick={() => startEditing(regola)}
                                            title={t("clickToEdit")}
                                        >
                                            {formatCurrency(regola.valore_default)}
                                            <Pencil className="h-3 w-3 opacity-40 group-hover:opacity-70 transition-opacity" />
                                        </span>
                                    )}
                                </td>
                                <td className="text-center align-middle">
                                    <div className="flex items-center justify-center">
                                        <Popover open={popoverState?.regolaId === regola.id}>
                                            <PopoverTrigger asChild>
                                                <div>
                                                    <Switch
                                                        checked={regola.utilizzato}
                                                        onCheckedChange={(checked) =>
                                                            handleToggle(regola, checked)
                                                        }
                                                        disabled={regola.tipo_utenza === null}
                                                        aria-label={`${t("ruleActive")} ${regola.descrizione}`}
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
                                </td>
                            </tr>
                            );
                        })
                    )}
                </tbody>
            </table>

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
