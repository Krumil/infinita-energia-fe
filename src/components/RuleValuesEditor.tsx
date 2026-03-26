import { useState, useMemo } from "react";
import { Loader2, ChevronRight, Home, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { ConfigurazioneRegola, Regola, Scaglione } from "@/types/domain";
import type { TipoUtenza } from "@/types/components";

interface RuleValuesEditorProps {
    configurazione: ConfigurazioneRegola[];
    regole: Regola[];
    scaglioni: Scaglione[];
    loading: boolean;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, tassoId: number, value: string) => void;
}

interface GroupedRule {
    nome: string;
    tipoUtenza: TipoUtenza | null;
    tassi: Array<{
        tasso_id: number;
        tasso_nome: string;
        tasso_descrizione?: string;
        valore: number;
        is_custom: boolean;
    }>;
}

function normalizeLabel(value: string): string {
    return value.trim().toLocaleLowerCase();
}

function TassoRow({
    regolaId,
    tasso,
    isCustom,
    editedValues,
    onValueChange,
}: {
    regolaId: number;
    tasso: GroupedRule["tassi"][number];
    isCustom: boolean;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, tassoId: number, value: string) => void;
}) {
    const key = `${regolaId}_${tasso.tasso_id}`;
    const currentVal = editedValues.get(key) ?? String(tasso.valore);
    const edited = editedValues.has(key);
    const showCustom = tasso.is_custom || edited;
    const hasDistinctDesc =
        Boolean(tasso.tasso_descrizione) &&
        normalizeLabel(tasso.tasso_nome) !== normalizeLabel(tasso.tasso_descrizione as string);

    return (
        <div className={cn(
            "grid grid-cols-[1fr_auto_5rem] items-center gap-2 px-3 py-1.5 text-sm",
            showCustom && "bg-emerald-500/[0.05]",
        )}>
            <span className={cn("font-body truncate", !showCustom && "text-muted-foreground")}>
                {tasso.tasso_nome}
                {hasDistinctDesc && (
                    <span className="text-muted-foreground/60 ml-1.5 text-xs">{tasso.tasso_descrizione}</span>
                )}
            </span>
            <span className={cn(
                "w-2 h-2 rounded-full shrink-0",
                showCustom ? "bg-emerald-500" : "bg-border",
            )} />
            <Input
                type="text"
                inputMode="decimal"
                value={currentVal}
                onChange={(e) => onValueChange(regolaId, tasso.tasso_id, e.target.value)}
                className={cn(
                    "font-mono text-right h-7 px-2 text-xs",
                    isCustom || edited ? "border-emerald-500/40 font-semibold" : "border-border/50",
                )}
            />
        </div>
    );
}

function RuleGroup({
    regolaId,
    group,
    isGeneral,
    editedValues,
    onValueChange,
}: {
    regolaId: number;
    group: GroupedRule;
    isGeneral: boolean;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, tassoId: number, value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full px-3 py-1.5 hover:bg-muted/30 transition-colors cursor-pointer text-left">
                <ChevronRight className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-90",
                )} />
                <span className="font-display text-xs font-medium flex-1 truncate">
                    {group.nome}
                </span>
                {isGeneral && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary font-mono uppercase">
                        Gen
                    </span>
                )}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="ml-1 border-l border-border/30 divide-y divide-border/10">
                    {group.tassi.map((tasso) => (
                        <TassoRow
                            key={tasso.tasso_id}
                            regolaId={regolaId}
                            tasso={tasso}
                            isCustom={tasso.is_custom}
                            editedValues={editedValues}
                            onValueChange={onValueChange}
                        />
                    ))}
                </div>
            </CollapsibleContent>
        </Collapsible>
    );
}

function ColumnSection({
    label,
    icon,
    accent,
    rules,
    customCount,
    editedValues,
    onValueChange,
}: {
    label: string;
    icon: React.ReactNode;
    accent: string;
    rules: Array<[number, GroupedRule]>;
    customCount: number;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, tassoId: number, value: string) => void;
}) {
    return (
        <div className="flex-1 min-w-0 border border-border/40 rounded-sm overflow-hidden">
            <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b border-border/30", accent)}>
                {icon}
                <h3 className="font-display text-sm uppercase tracking-widest flex-1">{label}</h3>
                <span className="text-[10px] font-mono text-muted-foreground">
                    {rules.length}r
                </span>
                {customCount > 0 && (
                    <span className="text-[10px] font-mono text-emerald-600">{customCount}c</span>
                )}
            </div>
            <div className="divide-y divide-border/20 max-h-[45vh] overflow-y-auto">
                {rules.map(([regolaId, group]) => (
                    <RuleGroup
                        key={regolaId}
                        regolaId={regolaId}
                        group={group}
                        isGeneral={group.tipoUtenza === null}
                        editedValues={editedValues}
                        onValueChange={onValueChange}
                    />
                ))}
            </div>
        </div>
    );
}

export function RuleValuesEditor({ configurazione, regole, scaglioni, loading, editedValues, onValueChange }: RuleValuesEditorProps) {
    const { t } = useTranslation();

    const scaglioniById = useMemo(
        () => new Map(scaglioni.map((s) => [s.id, s.descrizione])),
        [scaglioni],
    );

    const regolaUtenzaMap = useMemo(
        () => new Map(regole.map((r) => [r.id, r.tipo_utenza])),
        [regole],
    );

    const grouped = useMemo(() => {
        const byRegola = new Map<number, GroupedRule>();
        for (const item of configurazione) {
            let group = byRegola.get(item.regola_id);
            if (!group) {
                group = {
                    nome: item.regola_nome,
                    tipoUtenza: regolaUtenzaMap.get(item.regola_id) ?? null,
                    tassi: [],
                };
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
    }, [configurazione, scaglioniById, regolaUtenzaMap]);

    const { residenziale, business, resCustomCount, busCustomCount } = useMemo(() => {
        const res: Array<[number, GroupedRule]> = [];
        const bus: Array<[number, GroupedRule]> = [];
        let resCustom = 0;
        let busCustom = 0;

        for (const [regolaId, group] of grouped) {
            const customInGroup = group.tassi.filter((t) => t.is_custom).length;

            if (group.tipoUtenza === "residenziale" || group.tipoUtenza === null) {
                res.push([regolaId, group]);
                resCustom += customInGroup;
            }
            if (group.tipoUtenza === "business" || group.tipoUtenza === null) {
                bus.push([regolaId, group]);
                busCustom += customInGroup;
            }
        }

        return { residenziale: res, business: bus, resCustomCount: resCustom, busCustomCount: busCustom };
    }, [grouped]);

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
        <div className="space-y-3">
            <div className="flex gap-4">
                <ColumnSection
                    label={t("residenziale")}
                    icon={<Home className="h-4 w-4 text-primary" />}
                    accent="bg-primary/5"
                    rules={residenziale}
                    customCount={resCustomCount}
                    editedValues={editedValues}
                    onValueChange={onValueChange}
                />
                <ColumnSection
                    label={t("business")}
                    icon={<Building2 className="h-4 w-4 text-amber-600" />}
                    accent="bg-amber-500/5"
                    rules={business}
                    customCount={busCustomCount}
                    editedValues={editedValues}
                    onValueChange={onValueChange}
                />
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground font-body px-1">
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    {t("customValue")}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-border" />
                    {t("defaultValue")}
                </span>
                <span className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1 py-0.5 rounded-sm bg-primary/10 text-primary font-mono uppercase">Gen</span>
                    {t("tipoUtenza")}: -
                </span>
            </div>
        </div>
    );
}
