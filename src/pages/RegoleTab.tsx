import { RefreshCw, Loader2, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, RulesTable, TiersTable } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Rule, Tier } from "@/types";

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
    const activeCount = rules.filter((r) => r.utilizzato).length;

    return (
        <div className="space-y-10">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="font-display text-2xl">{t("regole")}</h2>
                        {rules.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                                {activeCount}/{rules.length} {t("ruleActive").toLowerCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onImportRules}
                            disabled={loading || importing}
                            className="btn-ghost"
                        >
                            {importing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            <span className="ml-2">{t("importRules")}</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={onRefresh} disabled={loading} className="btn-ghost">
                            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="ml-2">{t("refreshAgents")}</span>
                        </Button>
                    </div>
                </div>

                <div className="ledger-card p-6">
                    {loading && rules.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                        </div>
                    ) : rules.length === 0 ? (
                        <EmptyState message={t("noRegoleYet")} icon={<BookOpen className="h-16 w-16" />} />
                    ) : (
                        <RulesTable
                            rules={rules}
                            tiers={tiers}
                            onToggleEnabled={onToggleEnabled}
                            onUpdateDefault={onUpdateDefault}
                            onUpdateCustomerType={onUpdateCustomerType}
                            onUpdateServiceType={onUpdateServiceType}
                        />
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="font-display text-2xl">{t("scaglioni")}</h2>
                        {tiers.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                                {tiers.length} {t("total").toLowerCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onImportTiers}
                            disabled={tiersLoading || tiersImporting}
                            className="btn-ghost"
                        >
                            {tiersImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            <span className="ml-2">{t("importScaglioni")}</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={onRefreshTiers} disabled={tiersLoading} className="btn-ghost">
                            {tiersLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="ml-2">{t("refreshAgents")}</span>
                        </Button>
                    </div>
                </div>

                <div className="ledger-card p-6">
                    {tiersLoading && tiers.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                        </div>
                    ) : tiers.length === 0 ? (
                        <EmptyState message={t("noScaglioniYet")} icon={<BookOpen className="h-16 w-16" />} />
                    ) : (
                        <TiersTable
                            tiers={tiers}
                            onUpdateCustomerType={onUpdateTierCustomerType}
                            onUpdateServiceType={onUpdateTierServiceType}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
