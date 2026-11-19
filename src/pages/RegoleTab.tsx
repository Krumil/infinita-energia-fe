import { RefreshCw, Loader2, BookOpen, Download } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { EmptyState, RulesTable, TiersTable } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Rule, Tier } from "@/types";

// Same look as the Ordini inner tabs.
const TAB_TRIGGER_CLASSES = "gap-2 px-3 py-2 data-[state=active]:bg-secondary data-[state=active]:shadow-none";

const COUNT_PILL_CLASSES = "rounded bg-background/60 px-1.5 py-0.5 text-xs tabular-nums text-muted-foreground";

interface RulesTabProps {
    rules: Rule[];
    loading: boolean;
    importing: boolean;
    onRefresh: () => void;
    onImportRules: () => void;
    onToggleEnabled: (rule: Rule, value: boolean) => Promise<void>;
    onUpdateDefault: (rule: Rule, value: number) => Promise<void>;
    onUpdateCustomerType: (rule: Rule, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateServiceType: (rule: Rule, value: "gas" | "luce" | null) => Promise<void>;
    tiers: Tier[];
    tiersLoading: boolean;
    tiersImporting: boolean;
    onRefreshTiers: () => void;
    onImportTiers: () => void;
    onUpdateTierCustomerType: (tier: Tier, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateTierServiceType: (tier: Tier, value: "gas" | "luce" | null) => Promise<void>;
}

export function RulesTab({
    rules,
    loading,
    importing,
    onRefresh,
    onImportRules,
    onToggleEnabled,
    onUpdateDefault,
    onUpdateCustomerType,
    onUpdateServiceType,
    tiers,
    tiersLoading,
    tiersImporting,
    onRefreshTiers,
    onImportTiers,
    onUpdateTierCustomerType,
    onUpdateTierServiceType,
}: RulesTabProps) {
    const { t } = useTranslation();
    const [view, setView] = useState<"rules" | "tiers">("rules");
    const activeCount = rules.filter((r) => r.utilizzato).length;
    const showRules = view === "rules";

    const [busy, importBusy, onImport, onReload] = showRules
        ? [loading, importing, onImportRules, onRefresh]
        : [tiersLoading, tiersImporting, onImportTiers, onRefreshTiers];

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-8.5rem)]">
            <h2 className="shrink-0 font-display text-2xl leading-tight">{t("regole")}</h2>

            <section className="flex min-h-0 flex-1 flex-col gap-4">
                <div className="flex shrink-0 flex-wrap items-center justify-between gap-3">
                    <Tabs value={view} onValueChange={(value) => setView(value === "tiers" ? "tiers" : "rules")}>
                        <TabsList className="h-auto gap-1 bg-transparent p-0">
                            <TabsTrigger value="rules" className={TAB_TRIGGER_CLASSES}>
                                {t("regole")}
                                <span className={COUNT_PILL_CLASSES}>
                                    {activeCount}/{rules.length} {t("rulesActiveSuffix")}
                                </span>
                            </TabsTrigger>
                            <TabsTrigger value="tiers" className={TAB_TRIGGER_CLASSES}>
                                {t("scaglioni")}
                                <span className={COUNT_PILL_CLASSES}>{tiers.length}</span>
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" size="sm" onClick={onImport} disabled={busy || importBusy} className="btn-ghost">
                            {importBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            <span className="ml-2">{t(showRules ? "importRules" : "importScaglioni")}</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={onReload} disabled={busy} className="btn-ghost">
                            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="ml-2">{t("refreshAgents")}</span>
                        </Button>
                    </div>
                </div>

                {busy && (showRules ? rules : tiers).length === 0 ? (
                    <div className="ledger-card flex flex-1 items-center justify-center py-16">
                        <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                    </div>
                ) : (showRules ? rules : tiers).length === 0 ? (
                    <div className="ledger-card p-6">
                        <EmptyState message={t(showRules ? "noRegoleYet" : "noScaglioniYet")} icon={<BookOpen className="h-16 w-16" />} />
                    </div>
                ) : showRules ? (
                    <RulesTable
                        rules={rules}
                        tiers={tiers}
                        onToggleEnabled={onToggleEnabled}
                        onUpdateDefault={onUpdateDefault}
                        onUpdateCustomerType={onUpdateCustomerType}
                        onUpdateServiceType={onUpdateServiceType}
                    />
                ) : (
                    <TiersTable tiers={tiers} onUpdateCustomerType={onUpdateTierCustomerType} onUpdateServiceType={onUpdateTierServiceType} />
                )}
            </section>
        </div>
    );
}
