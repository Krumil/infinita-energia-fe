import { useState, useMemo } from "react";
import { Loader2, ChevronRight, Home, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { ConfigurazioneRegola, Regola } from "@/types/domain";

interface RuleValuesEditorProps {
    configurazione: ConfigurazioneRegola[];
    regole: Regola[];
    loading: boolean;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, scaglioneId: number, value: string) => void;
}

interface GroupedScaglione {
    scaglione_id: number;
    scaglione_nome: string;
    valore: number;
    is_custom: boolean;
}

interface GroupedRule {
    nome: string;
    tipoUtenza: "residenziale" | "business" | null;
    scaglioni: GroupedScaglione[];
}

function ScaglioneRow({
    regolaId,
    scaglione,
    editedValues,
    onValueChange,
}: {
    regolaId: number;
    scaglione: GroupedScaglione;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, scaglioneId: number, value: string) => void;
}) {
    const key = `${regolaId}_${scaglione.scaglione_id}`;
    const currentVal = editedValues.get(key) ?? String(scaglione.valore);

    return (
        <div className="grid grid-cols-[1fr_5rem] items-center gap-2 px-3 py-1.5 text-xs">
            <span className="font-body">
                {scaglione.scaglione_nome}
            </span>
            <Input
                type="text"
                inputMode="decimal"
                value={currentVal}
                onChange={(e) => onValueChange(regolaId, scaglione.scaglione_id, e.target.value)}
                className="font-mono text-right h-7 px-2 text-xs border-border/50"
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
    onValueChange: (regolaId: number, scaglioneId: number, value: string) => void;
}) {
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Collapsible open={isOpen} onOpenChange={setIsOpen}>
            <CollapsibleTrigger className="flex items-center gap-1.5 w-full px-3 py-1.5 hover:bg-muted/30 transition-colors cursor-pointer text-left">
                <ChevronRight className={cn(
                    "h-3 w-3 text-muted-foreground transition-transform duration-200",
                    isOpen && "rotate-90",
                )} />
                <span className="font-display text-xs font-medium flex-1">
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
                    {group.scaglioni.map((scaglione) => (
                        <ScaglioneRow
                            key={scaglione.scaglione_id}
                            regolaId={regolaId}
                            scaglione={scaglione}
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
    editedValues,
    onValueChange,
}: {
    label: string;
    icon: React.ReactNode;
    accent: string;
    rules: Array<[number, GroupedRule]>;
    editedValues: Map<string, string>;
    onValueChange: (regolaId: number, scaglioneId: number, value: string) => void;
}) {
    const { t } = useTranslation();
    return (
        <div className="flex-1 min-w-0 border border-border/40 rounded-sm overflow-hidden">
            <div className={cn("flex items-center gap-2 px-4 py-2.5 border-b border-border/30", accent)}>
                {icon}
                <h3 className="font-display text-sm uppercase tracking-widest flex-1">{label}</h3>
                <span className="text-[10px] font-mono text-muted-foreground">
                    {rules.length} {t("regole").toLowerCase()}
                </span>
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

export function RuleValuesEditor({ configurazione, regole, loading, editedValues, onValueChange }: RuleValuesEditorProps) {
    const { t } = useTranslation();

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
                    scaglioni: [],
                };
                byRegola.set(item.regola_id, group);
            }
            group.scaglioni.push({
                scaglione_id: item.scaglione_id,
                scaglione_nome: item.scaglione_nome ?? "",
                valore: item.valore,
                is_custom: item.is_custom,
            });
        }
        return byRegola;
    }, [configurazione, regolaUtenzaMap]);

    const { residenziale, business } = useMemo(() => {
        const res: Array<[number, GroupedRule]> = [];
        const bus: Array<[number, GroupedRule]> = [];

        for (const [regolaId, group] of grouped) {
            if (group.tipoUtenza === "residenziale" || group.tipoUtenza === null) {
                res.push([regolaId, group]);
            }
            if (group.tipoUtenza === "business" || group.tipoUtenza === null) {
                bus.push([regolaId, group]);
            }
        }

        return { residenziale: res, business: bus };
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
                    editedValues={editedValues}
                    onValueChange={onValueChange}
                />
                <ColumnSection
                    label={t("business")}
                    icon={<Building2 className="h-4 w-4 text-amber-600" />}
                    accent="bg-amber-500/5"
                    rules={business}
                    editedValues={editedValues}
                    onValueChange={onValueChange}
                />
            </div>
            <div className="flex items-center gap-6 text-xs text-muted-foreground font-body px-1">
                <span className="flex items-center gap-1.5">
                    <span className="text-[9px] px-1 py-0.5 rounded-sm bg-primary/10 text-primary font-mono uppercase">Gen</span>
                    {t("tipoUtenza")}: -
                </span>
            </div>
        </div>
    );
}
