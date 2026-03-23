import { useState, useCallback, useEffect } from "react";
import { Check, X as XIcon, Pencil } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { useTranslation } from "@/hooks/useTranslation";
import { formatCurrency, cn } from "@/lib/utils";
import { parseEuroNumber } from "@/lib/numbers";
import type { RegoleTableProps } from "@/types/components";
import type { Regola } from "@/types/domain";

export function RegoleTable({ regole, onToggleUtilizzato, onUpdateDefault, onUpdateTipoUtenza, onUpdateTipoServizio }: RegoleTableProps) {
    const { t } = useTranslation();
    const [editingId, setEditingId] = useState<number | null>(null);
    const [editValue, setEditValue] = useState("");
    const [popoverState, setPopoverState] = useState<{ regolaId: number; activated: boolean } | null>(null);

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
                onUpdateDefault(regola, parsed);
            }
            setEditingId(null);
        },
        [editValue, onUpdateDefault],
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

    return (
        <div className="border border-border/50 overflow-x-auto rounded-sm shadow-sm">
            <table className="ledger-table w-full">
                <thead>
                    <tr>
                        <th className="font-medium text-sm normal-case tracking-normal">{t("ruleDescription")}</th>
                        <th className="text-center w-28 font-medium text-sm normal-case tracking-normal">{t("ruleActive")}</th>
                        <th className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoUtenza")}</th>
                        <th className="w-40 font-medium text-sm normal-case tracking-normal">{t("tipoServizio")}</th>
                        <th className="text-right w-48 font-medium text-sm normal-case tracking-normal">{t("ruleDefault")}</th>
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
                        regole.map((regola) => (
                            <tr
                                key={regola.id}
                                className={cn(
                                    "transition-opacity",
                                    !regola.utilizzato && "opacity-50",
                                )}
                            >
                                <td className="font-body font-medium">{regola.descrizione}</td>
                                <td className="text-center align-middle">
                                    <div className="flex items-center justify-center">
                                        <Popover open={popoverState?.regolaId === regola.id}>
                                            <PopoverTrigger asChild>
                                                <div>
                                                    <Checkbox
                                                        checked={regola.utilizzato}
                                                        onCheckedChange={(checked) =>
                                                            handleToggle(regola, checked === true)
                                                        }
                                                        aria-label={`${t("ruleActive")} ${regola.descrizione}`}
                                                        className="h-5 w-5 data-[state=checked]:bg-energia-accent data-[state=checked]:border-energia-accent data-[state=checked]:text-accent-foreground cursor-pointer"
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
                                <td>
                                    <Select
                                        value={regola.tipo_utenza ?? "__none__"}
                                        onValueChange={(value) =>
                                            onUpdateTipoUtenza(regola, value === "__none__" ? null : value as "residenziale" | "business")
                                        }
                                    >
                                        <SelectTrigger className="h-8 text-sm">
                                            <SelectValue placeholder="—" />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="__none__">—</SelectItem>
                                            <SelectItem value="residenziale">{t("residenziale")}</SelectItem>
                                            <SelectItem value="business">{t("business")}</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </td>
                                <td>
                                    <Select
                                        value={regola.tipo_servizio ?? "__none__"}
                                        onValueChange={(value) =>
                                            onUpdateTipoServizio(regola, value === "__none__" ? null : value as "gas" | "luce")
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
                                            className="group inline-flex items-center gap-2 font-mono cursor-pointer rounded px-2 py-1 hover:bg-muted/50 hover:text-energia-accent transition-colors border border-transparent hover:border-border/50"
                                            onClick={() => startEditing(regola)}
                                            title={t("clickToEdit")}
                                        >
                                            {formatCurrency(regola.valore_default)}
                                            <Pencil className="h-3 w-3 opacity-0 group-hover:opacity-60 transition-opacity" />
                                        </span>
                                    )}
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
    );
}
