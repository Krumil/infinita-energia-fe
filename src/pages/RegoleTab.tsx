import { RefreshCw, Loader2, BookOpen, Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState, RegoleTable, ScaglioniTable } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { Regola, Scaglione } from "@/types";

interface RegoleTabProps {
    regole: Regola[];
    loading: boolean;
    importing: boolean;
    onRefresh: () => void;
    onImportRegole: () => void;
    onToggleUtilizzato: (regola: Regola, value: boolean) => Promise<void>;
    onUpdateDefault: (regola: Regola, value: number) => Promise<void>;
    onUpdateTipoUtenza: (regola: Regola, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateTipoServizio: (regola: Regola, value: "gas" | "luce" | null) => Promise<void>;
    scaglioni: Scaglione[];
    scaglioniLoading: boolean;
    scaglioniImporting: boolean;
    onRefreshScaglioni: () => void;
    onImportScaglioni: () => void;
    onUpdateScaglioneTipoUtenza: (scaglione: Scaglione, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateScaglioneTipoServizio: (scaglione: Scaglione, value: "gas" | "luce" | null) => Promise<void>;
}

export function RegoleTab({
    regole,
    loading,
    importing,
    onRefresh,
    onImportRegole,
    onToggleUtilizzato,
    onUpdateDefault,
    onUpdateTipoUtenza,
    onUpdateTipoServizio,
    scaglioni,
    scaglioniLoading,
    scaglioniImporting,
    onRefreshScaglioni,
    onImportScaglioni,
    onUpdateScaglioneTipoUtenza,
    onUpdateScaglioneTipoServizio,
}: RegoleTabProps) {
    const { t } = useTranslation();
    const activeCount = regole.filter((r) => r.utilizzato).length;

    return (
        <div className="space-y-10">
            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="font-display text-2xl">{t("regole")}</h2>
                        {regole.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                                {activeCount}/{regole.length} {t("ruleActive").toLowerCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onImportRegole}
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
                    {loading && regole.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                        </div>
                    ) : regole.length === 0 ? (
                        <EmptyState message={t("noRegoleYet")} icon={<BookOpen className="h-16 w-16" />} />
                    ) : (
                        <RegoleTable
                            regole={regole}
                            scaglioni={scaglioni}
                            onToggleUtilizzato={onToggleUtilizzato}
                            onUpdateDefault={onUpdateDefault}
                            onUpdateTipoUtenza={onUpdateTipoUtenza}
                            onUpdateTipoServizio={onUpdateTipoServizio}
                        />
                    )}
                </div>
            </div>

            <div className="space-y-6">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <h2 className="font-display text-2xl">{t("scaglioni")}</h2>
                        {scaglioni.length > 0 && (
                            <span className="text-sm text-muted-foreground">
                                {scaglioni.length} {t("total").toLowerCase()}
                            </span>
                        )}
                    </div>
                    <div className="flex items-center gap-3">
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onImportScaglioni}
                            disabled={scaglioniLoading || scaglioniImporting}
                            className="btn-ghost"
                        >
                            {scaglioniImporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                            <span className="ml-2">{t("importScaglioni")}</span>
                        </Button>
                        <Button variant="outline" size="sm" onClick={onRefreshScaglioni} disabled={scaglioniLoading} className="btn-ghost">
                            {scaglioniLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
                            <span className="ml-2">{t("refreshAgents")}</span>
                        </Button>
                    </div>
                </div>

                <div className="ledger-card p-6">
                    {scaglioniLoading && scaglioni.length === 0 ? (
                        <div className="flex items-center justify-center py-16">
                            <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                        </div>
                    ) : scaglioni.length === 0 ? (
                        <EmptyState message={t("noScaglioniYet")} icon={<BookOpen className="h-16 w-16" />} />
                    ) : (
                        <ScaglioniTable
                            scaglioni={scaglioni}
                            onUpdateTipoUtenza={onUpdateScaglioneTipoUtenza}
                            onUpdateTipoServizio={onUpdateScaglioneTipoServizio}
                        />
                    )}
                </div>
            </div>
        </div>
    );
}
