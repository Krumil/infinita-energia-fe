import { Fragment, useMemo, useState, type ReactElement } from "react";
import { AlertTriangle, ChevronRight, Search, Trash2, X } from "lucide-react";
import { useTranslation } from "@/hooks/useTranslation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow, TableFooter } from "@/components/ui/table";
import { rowAmount, type DraftAgent, type DraftRow } from "@/lib/calculationDraft";
import { formatCurrency } from "@/lib/utils";
import type { CalculationResultsProps } from "@/types/components";
import type { CalculationDetail } from "@/types";

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

// Sorting and filtering return the same row objects, so a row keeps its identity whatever the operator sees.
function sortByCustomer(rows: DraftRow[]): DraftRow[] {
    return [...rows].sort((a, b) => (a.detail.cliente ?? "").localeCompare(b.detail.cliente ?? "", "it"));
}

function filterRows(rows: DraftRow[], query: string): DraftRow[] {
    const lowerQuery = query.trim().toLowerCase();

    if (!lowerQuery) return rows;

    return rows.filter(({ detail }) =>
        [detail.cliente, detail.pod_pdr, detail.regola, detail.venditore, detail.cf_piva].some((value) =>
            value?.toLowerCase().includes(lowerQuery),
        ),
    );
}

export function CalculationResults({ month, draft, summary, unmatched, agents, editDraft }: CalculationResultsProps): ReactElement {
    const { t, language } = useTranslation();
    const [expandedAgentId, setExpandedAgentId] = useState<number | null>(null);
    const [filterQuery, setFilterQuery] = useState<string>("");

    const agentNames = useMemo(() => new Map(agents.map((agent) => [agent.id, agent.nome_cognome])), [agents]);
    const periodDisplay = formatMonthLabel(month, language);
    const provisional = summary.invalidIncludedRows > 0;

    const displayName = (agent: DraftAgent): string =>
        agentNames.get(agent.agente_id) ?? agent.nome_agente ?? t("agentIdLabel").replace("{id}", String(agent.agente_id));

    const agentTotals = (agent: DraftAgent): { total: number; invalidRows: number } =>
        summary.agentTotals.get(agent.agente_id) ?? { total: 0, invalidRows: 0 };

    // Rows sold by someone other than the beneficiary are the backend's parent override on a child's sale.
    const childOriginSeller = (agent: DraftAgent, detail: CalculationDetail): string | null => {
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

    const renderDetails = (agent: DraftAgent): ReactElement => {
        const visibleRows = filterRows(sortByCustomer(agent.rows), filterQuery);
        const visibleTotal = visibleRows.reduce((sum, row) => sum + (rowAmount(row) ?? 0), 0);

        return (
            <TableRow>
                <TableCell colSpan={5} className="p-0 bg-secondary/10">
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
                                <TableHeader className="sticky top-0 z-10 bg-secondary/80 backdrop-blur-sm">
                                    <TableRow>
                                        <TableHead>{t("client")}</TableHead>
                                        <TableHead>{t("podPdr")}</TableHead>
                                        <TableHead>{t("taxId")}</TableHead>
                                        <TableHead>{t("seller")}</TableHead>
                                        <TableHead>{t("rule")}</TableHead>
                                        <TableHead>{t("competenceTo")}</TableHead>
                                        <TableHead className="text-right">{t("commission")}</TableHead>
                                        <TableHead className="w-12">
                                            <span className="sr-only">{t("actions")}</span>
                                        </TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {visibleRows.length > 0 ? (
                                        visibleRows.map((row) => {
                                            const { detail } = row;
                                            const childSeller = childOriginSeller(agent, detail);
                                            const client = detail.cliente ?? EMPTY_VALUE;
                                            const invalid = rowAmount(row) === undefined;
                                            const errorId = `amount-error-${row.id}`;

                                            return (
                                                <TableRow key={row.id}>
                                                    <TableCell className="font-medium">{client}</TableCell>
                                                    <TableCell className="font-mono text-xs">{detail.pod_pdr ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="font-mono text-xs">{detail.cf_piva ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="text-sm">
                                                        {childSeller ? (
                                                            <Badge variant="outline">
                                                                {t("childOriginLabel").replace("{seller}", childSeller)}
                                                            </Badge>
                                                        ) : (
                                                            (detail.venditore ?? EMPTY_VALUE)
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-sm text-muted-foreground">{detail.regola ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="font-mono text-xs">{detail.comp_al ?? EMPTY_VALUE}</TableCell>
                                                    <TableCell className="text-right">
                                                        <Input
                                                            inputMode="decimal"
                                                            value={row.amountText}
                                                            readOnly={!editDraft}
                                                            aria-label={t("previewAmountLabel").replace("{client}", client)}
                                                            aria-invalid={invalid}
                                                            aria-describedby={invalid ? errorId : undefined}
                                                            onChange={(e) => editDraft?.setRowAmount(agent.agente_id, row.id, e.target.value)}
                                                            className="ml-auto h-8 w-28 text-right font-mono aria-[invalid=true]:border-destructive"
                                                        />
                                                        {invalid && (
                                                            <p id={errorId} className="mt-1 text-xs font-medium text-destructive">
                                                                {t("previewInvalidAmount")}
                                                            </p>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="w-12">
                                                        <Button
                                                            type="button"
                                                            variant="ghost"
                                                            size="icon"
                                                            disabled={!editDraft}
                                                            aria-label={t("previewRemoveRow").replace("{client}", client)}
                                                            className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                                            onClick={() => editDraft?.removeRow(agent.agente_id, row.id)}
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        })
                                    ) : (
                                        <TableRow>
                                            <TableCell colSpan={8} className="text-center text-muted-foreground py-8">
                                                {t("noDataFound")}
                                            </TableCell>
                                        </TableRow>
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        <div className="flex items-center justify-between text-xs text-muted-foreground">
                            <span>
                                {filterQuery && visibleRows.length !== agent.rows.length
                                    ? `${t("showing")} ${visibleRows.length} ${t("of")} ${agent.rows.length}`
                                    : `${agent.rows.length} ${t("records").toLowerCase()}`}
                            </span>
                            {visibleRows.length > 0 && (
                                <span className="font-mono">
                                    {t("total")}: {formatCurrency(visibleTotal)}
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

            {draft.agents.length > 0 ? (
                <>
                    <div className="kpi-card p-6 text-center">
                        <span className="kpi-label">
                            {t("totalCommission")}
                            <span className="text-energia-accent"> — {periodDisplay}</span>
                        </span>
                        <div className="kpi-value text-5xl mt-3">{formatCurrency(summary.total)}</div>
                        {provisional && (
                            <p className="mt-3 text-sm font-medium text-destructive">
                                {summary.invalidIncludedRows === 1
                                    ? t("previewProvisionalTotalOne")
                                    : t("previewProvisionalTotalOther").replace("{count}", String(summary.invalidIncludedRows))}
                            </p>
                        )}
                        <p className="font-body text-muted-foreground mt-3 text-sm italic">
                            {summary.includedAgents} {t("beneficiary").toLowerCase()}(i)
                        </p>
                        <p className="mt-2 text-xs font-medium text-muted-foreground">{t("previewNotSaved")}</p>
                    </div>

                    <div className="section-divider" />

                    <div className="space-y-4">
                        <div>
                            <h3 className="font-display text-xl">
                                {t("summaryByBeneficiary")}
                                <span className="text-muted-foreground font-normal"> — {periodDisplay}</span>
                            </h3>
                            <p className="mt-1 text-sm text-muted-foreground">{t("previewExclusionNote")}</p>
                        </div>
                        <div className="ledger-card overflow-hidden">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead className="w-12"></TableHead>
                                        <TableHead className="w-16">{t("previewIncludeColumn")}</TableHead>
                                        <TableHead>{t("beneficiary")}</TableHead>
                                        <TableHead className="text-right">{t("records")}</TableHead>
                                        <TableHead className="text-right">{t("totalCommission")}</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {draft.agents.map((agent) => {
                                        const expanded = expandedAgentId === agent.agente_id;
                                        const name = displayName(agent);
                                        const totals = agentTotals(agent);

                                        return (
                                            <Fragment key={agent.agente_id}>
                                                <TableRow
                                                    className={`cursor-pointer hover:bg-secondary/20 ${agent.included ? "" : "text-muted-foreground"}`}
                                                    onClick={() => handleExpandAgent(agent.agente_id)}
                                                >
                                                    <TableCell className="w-12">
                                                        <Button
                                                            type="button"
                                                            variant="unstyled"
                                                            size="unstyled"
                                                            aria-expanded={expanded}
                                                            aria-label={name}
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
                                                    <TableCell className="w-16">
                                                        <Checkbox
                                                            checked={agent.included}
                                                            disabled={!editDraft || agent.rows.length === 0}
                                                            aria-label={t("previewIncludeAgent").replace("{name}", name)}
                                                            onClick={(e) => e.stopPropagation()}
                                                            onCheckedChange={(checked) =>
                                                                editDraft?.setAgentIncluded(agent.agente_id, checked === true)
                                                            }
                                                        />
                                                    </TableCell>
                                                    <TableCell className="font-medium">
                                                        {name}
                                                        <span className="ml-2 font-mono text-xs font-normal text-muted-foreground">
                                                            #{agent.agente_id}
                                                        </span>
                                                        {!agent.included && (
                                                            <Badge variant="outline" className="ml-2">
                                                                {agent.rows.length === 0 ? t("previewExcludedNoRows") : t("previewExcluded")}
                                                            </Badge>
                                                        )}
                                                    </TableCell>
                                                    <TableCell className="text-right font-mono">{agent.rows.length}</TableCell>
                                                    <TableCell
                                                        className={`text-right font-mono font-semibold ${agent.included ? "text-energia-accent" : "line-through"}`}
                                                    >
                                                        {formatCurrency(totals.total)}
                                                        {agent.included && totals.invalidRows > 0 && (
                                                            <span className="block text-xs font-medium text-destructive">{t("previewProvisional")}</span>
                                                        )}
                                                    </TableCell>
                                                </TableRow>
                                                {expanded && renderDetails(agent)}
                                            </Fragment>
                                        );
                                    })}
                                </TableBody>
                                <TableFooter>
                                    <TableRow>
                                        <TableCell colSpan={3} className="font-display font-semibold">
                                            {t("total")}
                                        </TableCell>
                                        <TableCell className="text-right font-mono">{summary.includedRows}</TableCell>
                                        <TableCell className="text-right font-mono font-bold text-lg text-energia-accent">
                                            {formatCurrency(summary.total)}
                                            {provisional && (
                                                <span className="block text-xs font-medium text-destructive">{t("previewProvisional")}</span>
                                            )}
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
