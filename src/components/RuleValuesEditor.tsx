import { useState, useMemo } from "react";
import { Loader2, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { ConfigurazioneRegola, Scaglione } from "@/types/domain";

interface RuleValuesEditorProps {
    configurazione: ConfigurazioneRegola[];
    scaglioni: Scaglione[];
    loading: boolean;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, tassoId: number, value: string) => void;
}

function normalizeLabel(value: string): string {
    return value.trim().toLocaleLowerCase();
}

export function RuleValuesEditor({ configurazione, scaglioni, loading, editedValues, onValueChange }: RuleValuesEditorProps) {
    const { t } = useTranslation();
    const [openRules, setOpenRules] = useState<Set<number>>(new Set());
    const scaglioniById = useMemo(
        () => new Map(scaglioni.map((scaglione) => [scaglione.id, scaglione.descrizione])),
        [scaglioni],
    );

    const grouped = useMemo(() => {
        const byRegola = new Map<number, {
            nome: string;
            tassi: Array<{
                tasso_id: number;
                tasso_nome: string;
                tasso_descrizione?: string;
                valore: number;
                is_custom: boolean;
            }>;
        }>();
        for (const item of configurazione) {
            let group = byRegola.get(item.regola_id);
            if (!group) {
                group = { nome: item.regola_nome, tassi: [] };
                byRegola.set(item.regola_id, group);
            }
            const tassoDescrizione = item.tasso_descrizione?.trim() || scaglioniById.get(item.tasso_id)?.trim() || undefined;
            group.tassi.push({
                tasso_id: item.tasso_id,
                tasso_nome: item.tasso_nome,
                tasso_descrizione: tassoDescrizione,
                valore: item.valore,
                is_custom: item.is_custom,
            });
        }
        return byRegola;
    }, [configurazione, scaglioniById]);

    const cellKey = (regolaId: number, tassoId: number) => `${regolaId}_${tassoId}`;

    const getCurrentValue = (regolaId: number, tassoId: number, originalValue: number): string => {
        return editedValues.get(cellKey(regolaId, tassoId)) ?? String(originalValue);
    };

    const isEdited = (regolaId: number, tassoId: number): boolean => {
        return editedValues.has(cellKey(regolaId, tassoId));
    };

    const toggleRule = (regolaId: number) => {
        setOpenRules((prev) => {
            const next = new Set(prev);
            if (next.has(regolaId)) {
                next.delete(regolaId);
            } else {
                next.add(regolaId);
            }
            return next;
        });
    };

    if (loading) {
        return (
            <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-energia-accent" />
            </div>
        );
    }

    if (configurazione.length === 0) {
        return (
            <p className="text-center py-6 text-muted-foreground italic text-sm">
                {t("noRegoleYet")}
            </p>
        );
    }

    return (
        <div className="space-y-1.5">
            {Array.from(grouped.entries()).map(([regolaId, group]) => {
                const isOpen = openRules.has(regolaId);

                return (
                    <Collapsible
                        key={regolaId}
                        open={isOpen}
                        onOpenChange={() => toggleRule(regolaId)}
                        className="border border-border/50 rounded-sm overflow-hidden"
                    >
                        <CollapsibleTrigger className="flex items-center gap-2 w-full px-4 py-2.5 bg-muted/30 hover:bg-muted/50 transition-colors cursor-pointer text-left">
                            <ChevronRight className={cn(
                                "h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200",
                                isOpen && "rotate-90",
                            )} />
                            <span className="font-display text-sm font-medium flex-1">
                                {group.nome}
                            </span>
                        </CollapsibleTrigger>
                        <CollapsibleContent>
                            <div className="divide-y divide-border/20">
                                {group.tassi.map((tasso) => {
                                    const currentVal = getCurrentValue(regolaId, tasso.tasso_id, tasso.valore);
                                    const edited = isEdited(regolaId, tasso.tasso_id);
                                    const hasDistinctDescription =
                                        Boolean(tasso.tasso_descrizione) &&
                                        normalizeLabel(tasso.tasso_nome) !== normalizeLabel(tasso.tasso_descrizione as string);

                                    return (
                                        <div
                                            key={tasso.tasso_id}
                                            className="flex items-center gap-3 px-4 py-2 hover:bg-muted/20 transition-colors"
                                        >
                                            <span className={cn(
                                                "flex-1 text-sm",
                                                !tasso.is_custom && !edited && "text-muted-foreground italic",
                                            )}>
                                                {tasso.tasso_nome}
                                                {hasDistinctDescription && (
                                                    <span className="text-muted-foreground"> {"\u2022"} {tasso.tasso_descrizione}</span>
                                                )}
                                            </span>
                                            {!tasso.is_custom && !edited && (
                                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm text-muted-foreground bg-muted/50 shrink-0">
                                                    {t("defaultValue")}
                                                </span>
                                            )}
                                            {(tasso.is_custom || edited) && (
                                                <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-sm text-emerald-600 bg-emerald-500/10 shrink-0">
                                                    {t("customValue")}
                                                </span>
                                            )}
                                            <Input
                                                type="text"
                                                inputMode="decimal"
                                                value={currentVal}
                                                onChange={(e) => onValueChange(regolaId, tasso.tasso_id, e.target.value)}
                                                className={cn(
                                                    "font-mono text-right h-8 w-28 shrink-0",
                                                    edited && "border-energia-accent",
                                                )}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </CollapsibleContent>
                    </Collapsible>
                );
            })}
        </div>
    );
}
