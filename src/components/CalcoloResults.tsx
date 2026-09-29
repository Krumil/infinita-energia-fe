import { Fragment, useMemo, useState, type ReactElement } from "react";
import { AlertTriangle, ChevronRight, Search, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { formatCurrency } from "@/lib/utils";
import type { CalculationResultsProps } from "@/types/components";
import type { CalculationDetail, PreviewAgent } from "@/types";

const EMPTY_VALUE = "—";

// Mirrors the backend's agent-name key: uppercase words sorted alphabetically, so "Rossi Mario" matches "MARIO ROSSI".
function normalizeName(name: string): string {
    return name.toUpperCase().split(/\s+/).filter(Boolean).sort().join(" ");
}

function formatMonthLabel(month: string, language: string): string {
    const [year, monthNumber] = month.split("-").map(Number);

    const label = new Date(year, monthNumber - 1, 1).toLocaleDateString(language === "it" ? "it-IT" : "en-GB", {
        month: "long",
        year: "numeric",
    });

    return label.charAt(0).toUpperCase() + label.slice(1);
}

function sortByCustomer(items: CalculationDetail[]): CalculationDetail[] {
    return [...items].sort((a, b) => (a.cliente ?? "").localeCompare(b.cliente ?? "", "it"));
}

function filterItems(items: CalculationDetail[], query: string): CalculationDetail[] {
    const lowerQuery = query.trim().toLowerCase();

    if (!lowerQuery) return items;

    return items.filter((item) =>
        [item.cliente, item.pod_pdr, item.regola, item.venditore, item.cf_piva].some((value) =>
            value?.toLowerCase().includes(lowerQuery),
        ),
    );
}

export function CalculationResults({ month, preview, agents }: CalculationResultsProps): ReactElement {
    const { t, language } = useTranslation();
    const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);
    const [filterQuery, setFilterQuery] = useState<string>("");

    const agentNames = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.nome_cognome])), [agents]);
    const previewAgents = [...preview.agenti].sort((a, b) => b.totale_provvigione - a.totale_provvigione);
    const grandTotal = previewAgents.reduce((sum, agent) => sum + agent.totale_provvigione, 0);
    const detailCount = previewAgents.reduce((sum, agent) => sum + agent.dettaglio.length, 0);
    const unmatched = preview.non_associati;
    const periodDisplay = formatMonthLabel(month, language);

    const displayName = (agent: PreviewAgent): string =>
        agentNames.get(agent.agente_id) ?? agent.nome_agente ?? t("agentIdLabel").replace("{id}", String(agent.agente_id));

    // Rows sold by someone other than the beneficiary are the backend's parent override on a child's sale.
    const childOriginSeller = (agent: PreviewAgent, detail: CalculationDetail): string | null => {
        const seller = detail.venditore?.trim();

        const beneficiaryNames = [agentNames.get(agent.agente_id), agent.nome_agente].flatMap((name) =>
            name?.trim() ? [normalizeName(name)] : [],
        );

        if (!seller || beneficiaryNames.length === 0) return null;

        return beneficiaryNames.includes(normalizeName(seller)) ? null : seller;
    };

    const handleExpandAgent = (agentId: number): void => {
        if (expandedAgentId !== agentId) setFilterQuery("");
        setExpandedAgentId(expandedAgentId === agentId ? null : agentId);
    };

    const renderDetails = (agent: PreviewAgent): ReactElement => {
        const filteredItems = filterItems(sortByCustomer(agent.dettaglio), filterQuery);

        return (
            <TableRow>
                <TableCell colSpan={4} className="p-0 bg-secondary/10">
                    <div className="p-4 space-y-3">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                            <Input
                                placeholder={t("filterPlaceholder")}
                                aria-label={t("filterPlaceholder")}
                                value={filterQuery}
                                onChange={(e) => setFilterQuery(e.target.value)}
                                className="pl-9 pr-9 h-9"
                            />
                            {filterQuery && (
                                <Button
                                    type="button"
                                    variant="unstyled"
                                    size="unstyled"
                                    aria-label={t("clearFilter")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    onClick={() => setFilterQuery("")}
                                >
                                    <X className="h-4 w-4" />
                                </Button>
                            )}
                        </div>

                        <div className="max-h-80 overflow-y-auto border rounded-md bg-background/50">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead>{t("client")}</TableHead>
                                        <TableHead>{t("podPdr")}</TableHead>
                                        <TableHead>{t("taxId")}</TableHead>
                                        <TableHead>{t("seller")}</TableHead>
                                        <TableHead>{t("rule")}</TableHead>
                                        <TableHead>{t("competenceTo")}</TableHead>
                                        <TableHead className="text-right">{t("commission")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {filteredItems.length > 0 ? (
                                        filteredItems.map((item, idx) => {
                                            const childSeller = childOriginSeller(agent, item);

                                            return (
                                                <TableRow key={idx}>
                                                    <TableCell className="font-medium">{item.cliente ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.pod_pdr ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.cf_piva ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {childSeller ? (
                                                            <Badge variant="outline">
                                                                {t("childOriginLabel").replace("{seller}", childSeller)}
                                                            </Badge>
                                                        ) : (
                                                            (item.venditore ?? EMPTY_VALUE)
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{item.regola ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="font-mono text-xs">{item.comp_al ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="text-right font-mono font-semibold">
                                                        {formatCurrency(item.importo_provvigione)}
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                                                {t("noDataFound")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {filterQuery && filteredItems.length !== agent.dettaglio.length
                                    ? `${t("showing")} ${filteredItems.length} ${t("of")} ${agent.dettaglio.length}`
                                    : `${agent.dettaglio.length} ${t("records").toLowerCase()}`}
                            </span>
                            {filteredItems.length > 0 && (
                                <span className="font-mono">
                                    {t("total")}:{" "}
                                    {formatCurrency(filteredItems.reduce((sum, item) => sum + item.importo_provvigione, 0))}
                                </span>
                            )}
                        </div>
                    </div>
                </TableCell>
            </TableRow>
        );
    };

    return (
        <div className="space-y-6">
            {unmatched.length > 0 && (
                <div
                    role="status"
                    className="flex items-center gap-2 rounded-md border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-800 dark:bg-amber-950/30 dark:text-amber-300"
                >
                    <AlertTriangle className="h-4 w-4 shrink-0" />
                    {unmatched.length === 1
                        ? t("unmatchedRowsWarningOne")
                        : t("unmatchedRowsWarningOther").replace("{count}", String(unmatched.length))}
                </div>
            )}

            {previewAgents.length > 0 ? (
                <>
                    <div className="kpi-card p-6 text-center">
                        <span className="kpi-label">
                            {t("totalCommission")}
                            <span className="text-energia-accent"> — {periodDisplay}</span>
                        </span>
                        <div className="kpi-value text-5xl mt-3">{formatCurrency(grandTotal)}</div>
                        <p className="font-body text-muted-foreground mt-3 text-sm italic">
                            {previewAgents.length} {t("beneficiary").toLowerCase()}(i)
                        </p>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">{t("previewNotSaved")}</p>
                    </div>

                    <div className="section-divider" />

                    <div className="space-y-4">
                        <h3 className="font-display text-xl">
                            {t("summaryByBeneficiary")}
                            <span className="text-muted-foreground font-normal"> — {periodDisplay}</span>
                        </h3>
                        <div className="ledger-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead>{t("beneficiary")}</TableHead>
                                        <TableHead className="text-right">{t("records")}</TableHead>
                                        <TableHead className="text-right">{t("totalCommission")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {previewAgents.map((agent) => {
                                        const expanded = expandedAgentId === agent.agente_id;

                                        return (
                                            <Fragment key={agent.agente_id}>
                                                <TableRow
                                                    className="cursor-pointer hover:bg-secondary/20"
                                                    onClick={() => handleExpandAgent(agent.agente_id)}
                                                >
                                                    <TableCell className="w-12">
                                                        <Button
                                                            type="button"
                                                            variant="unstyled"
                                                            size="unstyled"
                                                            aria-expanded={expanded}
                                                            aria-label={displayName(agent)}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleExpandAgent(agent.agente_id);
                                                            }}
                                                        >
                                                            <ChevronRight
                                                                className={`h-4 w-4 text-muted-foreground transition-transform duration-200 ${
                                                                    expanded ? "rotate-90" : ""
                                                                }`}
                                                            />
                                                        </Button>
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {displayName(agent)}
                                                        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                                            #{agent.agente_id}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{agent.dettaglio.length}</TableCell>
                                                    <TableCell className="text-right font-mono font-semibold text-energia-accent">
                                                        {formatCurrency(agent.totale_provvigione)}
                                                    </TableCell>
                                                </TableRow>
                                                {expanded && renderDetails(agent)}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={2} className="font-display font-semibold">
                                            {t("total")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{detailCount}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-lg text-energia-accent">
                                            {formatCurrency(grandTotal)}
                                        </TableCell>
                                    </TableRow>
                                </TableFooter>
                            </Table>
                        </div>
                    </div>
                </>
            ) : (
                <p className="ledger-card p-6 text-center text-sm text-muted-foreground">{t("previewNoAgents")}</p>
            )}

            {unmatched.length > 0 && (
                <section className="space-y-3" aria-labelledby="unmatched-rows-title">
                    <div>
                        <h3 id="unmatched-rows-title" className="font-display text-xl">
                            {t("unmatchedRowsTitle")}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">{t("unmatchedRowsDescription")}</p>
                    </div>
                    <div className="ledger-card overflow-hidden">
                        <div className="max-h-96 overflow-y-auto">
                            <Table>
                                <TableHeader className="sticky top-0 bg-secondary/80 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead>{t("seller")}</TableHead>
                                        <TableHead>{t("client")}</TableHead>
                                        <TableHead>{t("podPdr")}</TableHead>
                                        <TableHead>{t("taxId")}</TableHead>
                                        <TableHead>{t("rule")}</TableHead>
                                        <TableHead>{t("consumptionTier")}</TableHead>
                                        <TableHead>{t("competenceTo")}</TableHead>
                                        <TableHead className="text-right">{t("amount")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {unmatched.map((row, idx) => (
                                        <TableRow key={idx}>
                                            <TableCell className="font-medium">{row.venditore ?? EMPTY_VALUE}</TableCell>
                                            <TableCell>{row.cliente ?? EMPTY_VALUE}</TableCell>
                                            <TableCell className="font-mono text-xs">{row.pod_pdr ?? EMPTY_VALUE}</TableCell>
                                            <TableCell className="font-mono text-xs">{row.cf_piva ?? EMPTY_VALUE}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{row.regola ?? EMPTY_VALUE}</TableCell>
                                            {/* The backend sends a missing scaglione as an empty string, not null. */}
                                            <TableCell className="text-sm">{row.scaglione_consumo || EMPTY_VALUE}</TableCell>
                                            <TableCell className="font-mono text-xs">{row.comp_al ?? EMPTY_VALUE}</TableCell>
                                            <TableCell className="text-right font-mono">
                                                {row.importo_euro === null ? EMPTY_VALUE : formatCurrency(row.importo_euro)}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>
                    </div>
                </section>
            )}
        </div>
    );
}
