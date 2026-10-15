import { useState, useMemo } from "react";
import { Loader2, ChevronRight, Home, Building2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { useTranslation } from "@/hooks/useTranslation";
import { cn } from "@/lib/utils";
import type { RuleConfiguration, Rule } from "@/types/domain";

interface RuleValuesEditorProps {
    configuration: RuleConfiguration[];
    rules: Rule[];
    loading: boolean;
    editedValues: Map<string, string>;
    onValueChange: (ruleId: number, tierId: number, value: string) => void;
}

interface GroupedTier {
    tierId: number;
    tierName: string;
    value: number;
    isCustom: boolean;
}

interface GroupedRule {
    name: string;
    customerType: "residenziale" | "business" | null;
    tiers: GroupedTier[];
}

function TierRow({
    ruleId,
    tier,
    editedValues,
    onValueChange,
}: {
    ruleId: number;
    tier: GroupedTier;
    editedValues: Map<string, string>;
    onValueChange: (ruleId: number, tierId: number, value: string) => void;
}) {
    const key = `${ruleId}_${tier.tierId}`;
    const currentVal = editedValues.get(key) ?? String(tier.value);

    return (
        <div className="grid grid-cols-[1fr_5rem] items-center gap-2 px-3 py-1.5 text-xs">
            <span className="font-body">
                {tier.tierName}
            </span>
            <Input
                type="text"
                inputMode="decimal"
                value={currentVal}
                onChange={(e) => onValueChange(ruleId, tier.tierId, e.target.value)}
                className="font-mono text-right h-7 px-2 text-xs border-border/50"
            />
        </div>
    );
}

function RuleGroup({
    ruleId,
    group,
    isGeneral,
    editedValues,
    onValueChange,
}: {
    ruleId: number;
    group: GroupedRule;
    isGeneral: boolean;
    editedValues: Map<string, string>;
    onValueChange: (ruleId: number, tierId: number, value: string) => void;
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
                    {group.name}
                </span>
                {isGeneral && (
                    <span className="text-[9px] px-1.5 py-0.5 rounded-sm bg-primary/10 text-primary-text font-mono uppercase">
                        Gen
                    </span>
                )}
            </CollapsibleTrigger>
            <CollapsibleContent>
                <div className="ml-1 border-l border-border/30 divide-y divide-border/10">
                    {group.tiers.map((tier) => (
                        <TierRow
                            key={tier.tierId}
                            ruleId={ruleId}
                            tier={tier}
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
    onValueChange: (ruleId: number, tierId: number, value: string) => void;
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
                {rules.map(([ruleId, group]) => (
                    <RuleGroup
                        key={ruleId}
                        ruleId={ruleId}
                        group={group}
                        isGeneral={group.customerType === null}
                        editedValues={editedValues}
                        onValueChange={onValueChange}
                    />
                ))}
            </div>
        </div>
    );
}

export function RuleValuesEditor({ configuration, rules, loading, editedValues, onValueChange }: RuleValuesEditorProps) {
    const { t } = useTranslation();

    const ruleCustomerTypeMap = useMemo(
        () => new Map(rules.map((r) => [r.id, r.tipo_utenza])),
        [rules],
    );

    const grouped = useMemo(() => {
        const byRule = new Map<number, GroupedRule>();

        for (const item of configuration) {
            let group = byRule.get(item.regola_id);

            if (!group) {
                group = {
                    name: item.regola_nome,
                    customerType: ruleCustomerTypeMap.get(item.regola_id) ?? null,
                    tiers: [],
                };
                byRule.set(item.regola_id, group);
            }

            group.tiers.push({
                tierId: item.scaglione_id,
                tierName: item.scaglione_nome ?? "",
                value: item.valore,
                isCustom: item.is_custom,
            });
        }

        return byRule;
    }, [configuration, ruleCustomerTypeMap]);

    const { residenziale: residential, business } = useMemo(() => {
        const res: Array<[number, GroupedRule]> = [];
        const bus: Array<[number, GroupedRule]> = [];

        for (const [ruleId, group] of grouped) {
            if (group.customerType === "residenziale" || group.customerType === null) {
                res.push([ruleId, group]);
            }

            if (group.customerType === "business" || group.customerType === null) {
                bus.push([ruleId, group]);
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

    if (configuration.length === 0) {
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
                    rules={residential}
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
                    <span className="text-[9px] px-1 py-0.5 rounded-sm bg-primary/10 text-primary-text font-mono uppercase">Gen</span>
                    {t("tipoUtenza")}: -
                </span>
            </div>
        </div>
    );
}
