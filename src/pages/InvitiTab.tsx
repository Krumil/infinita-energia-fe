import { useState, useMemo } from "react";
import {
    Calculator,
    FileText,
    Loader2,
    RefreshCw,
    Search,
    X,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Check,
    Minus,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { SearchableSelect } from "@/components/SearchableSelect";
import { DatePicker, MonthPicker } from "@/components/DatePicker";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/useTranslation";
import { formatDate } from "@/lib/utils";
import { useInviti } from "@/hooks/useInviti";
import { useInvitiNonLiquidati } from "@/hooks/useInvitiNonLiquidati";
import type { Agente, StoricoInvito, UpdateInvitoRequest } from "@/types";

interface InvitiTabProps {
    agents: Agente[];
    agentsLoading: boolean;
}

type SortField =
    | "nome_agente"
    | "mese_competenza"
    | "totale_invito"
    | "stato"
    | "riferimento_fattura"
    | "data_fattura"
    | "pagato"
    | "data_pagamento";

type SortDirection = "asc" | "desc";


function formatMonth(isoDate: string): string {
    const date = new Date(isoDate);
    const monthNames = [
        "Gennaio", "Febbraio", "Marzo", "Aprile", "Maggio", "Giugno",
        "Luglio", "Agosto", "Settembre", "Ottobre", "Novembre", "Dicembre",
    ];
    return `${monthNames[date.getMonth()]} ${date.getFullYear()}`;
}

function formatCurrency(value: number): string {
    return value.toLocaleString("it-IT", { style: "currency", currency: "EUR" });
}

function isEligibleInvito(invito: StoricoInvito): boolean {
    return !invito.pagato && invito.stato !== "inviato";
}

function getStatoBadge(stato: string) {
    const configs: Record<string, { bg: string; text: string }> = {
        bozza: {
            bg: "bg-amber-100 dark:bg-amber-900/40",
            text: "text-amber-700 dark:text-amber-400",
        },
        inviato: {
            bg: "bg-blue-100 dark:bg-blue-900/40",
            text: "text-blue-700 dark:text-blue-400",
        },
        approvato: {
            bg: "bg-emerald-100 dark:bg-emerald-900/40",
            text: "text-emerald-700 dark:text-emerald-400",
        },
    };
    const config = configs[stato] || {
        bg: "bg-slate-100 dark:bg-slate-800",
        text: "text-slate-600 dark:text-slate-400",
    };
    return (
        <span
            className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${config.bg} ${config.text}`}
        >
            {stato.charAt(0).toUpperCase() + stato.slice(1)}
        </span>
    );
}

function getPagatoBadge(pagato: boolean) {
    if (pagato) {
        return (
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 dark:bg-emerald-900/40 text-emerald-700 dark:text-emerald-400">
                <Check className="h-3 w-3" />
            </span>
        );
    }
    return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
            <Minus className="h-3 w-3" />
        </span>
    );
}

interface SortableHeaderProps {
    label: string;
    field: SortField;
    currentField: SortField;
    direction: SortDirection;
    onSort: (field: SortField) => void;
}

function SortableHeader({ label, field, currentField, direction, onSort }: SortableHeaderProps) {
    const isActive = currentField === field;
    return (
        <button
            className="flex items-center gap-1 hover:text-foreground transition-colors"
            onClick={() => onSort(field)}
        >
            {label}
            {isActive ? (
                direction === "asc" ? (
                    <ArrowUp className="h-3 w-3" />
                ) : (
                    <ArrowDown className="h-3 w-3" />
                )
            ) : (
                <ArrowUpDown className="h-3 w-3 opacity-40" />
            )}
        </button>
    );
}

function filterInviti(inviti: StoricoInvito[], query: string): StoricoInvito[] {
    if (!query.trim()) return inviti;
    const lowerQuery = query.toLowerCase();
    return inviti.filter(
        (inv) =>
            inv.nome_agente.toLowerCase().includes(lowerQuery) ||
            inv.riferimento_fattura?.toLowerCase().includes(lowerQuery) ||
            inv.stato.toLowerCase().includes(lowerQuery) ||
            formatMonth(inv.mese_competenza).toLowerCase().includes(lowerQuery),
    );
}

function sortInviti(inviti: StoricoInvito[], field: SortField, direction: SortDirection): StoricoInvito[] {
    return [...inviti].sort((a, b) => {
        let aVal: string | number | boolean | null;
        let bVal: string | number | boolean | null;

        switch (field) {
            case "nome_agente":
                aVal = a.nome_agente.toLowerCase();
                bVal = b.nome_agente.toLowerCase();
                break;
            case "mese_competenza":
                aVal = a.mese_competenza;
                bVal = b.mese_competenza;
                break;
            case "totale_invito":
                aVal = a.totale_invito;
                bVal = b.totale_invito;
                break;
            case "stato":
                aVal = a.stato;
                bVal = b.stato;
                break;
            case "riferimento_fattura":
                aVal = a.riferimento_fattura?.toLowerCase() || "";
                bVal = b.riferimento_fattura?.toLowerCase() || "";
                break;
            case "data_fattura":
                aVal = a.data_fattura || "";
                bVal = b.data_fattura || "";
                break;
            case "pagato":
                aVal = a.pagato ? 1 : 0;
                bVal = b.pagato ? 1 : 0;
                break;
            case "data_pagamento":
                aVal = a.data_pagamento || "";
                bVal = b.data_pagamento || "";
                break;
            default:
                return 0;
        }

        if (aVal < bVal) return direction === "asc" ? -1 : 1;
        if (aVal > bVal) return direction === "asc" ? 1 : -1;
        return 0;
    });
}

interface EditFormData {
    stato: "bozza" | "inviato" | "approvato";
    riferimento_fattura: string;
    data_fattura: string;
    pagato: boolean;
    data_pagamento: string;
}

export function InvitiTab({ agents }: InvitiTabProps) {
    const { t } = useTranslation();
    const {
        inviti,
        loading,
        updating,
        selectedAgenteId,
        setSelectedAgenteId,
        selectedStato,
        setSelectedStato,
        selectedPagato,
        setSelectedPagato,
        dataInizio,
        setDataInizio,
        dataFine,
        setDataFine,
        fetchInviti,
        updateInvito,
    } = useInviti();

    const {
        selectionMode,
        selectedAgentId,
        selectedInvitoIds,
        loading: nonLiqLoading,
        nonLiquidatiInviti,
        selectionLoading,
        enterSelectionMode,
        exitSelectionMode,
        selectAgent,
        toggleInvito,
        runCalculation,
    } = useInvitiNonLiquidati();

    const [filterQuery, setFilterQuery] = useState("");
    const [sortField, setSortField] = useState<SortField>("mese_competenza");
    const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
    const [editingInvito, setEditingInvito] = useState<StoricoInvito | null>(null);
    const [editForm, setEditForm] = useState<EditFormData>({
        stato: "bozza",
        riferimento_fattura: "",
        data_fattura: "",
        pagato: false,
        data_pagamento: "",
    });

    const handleSort = (field: SortField) => {
        if (field === sortField) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc");
        } else {
            setSortField(field);
            setSortDirection("asc");
        }
    };

    const processedInviti = useMemo(() => {
        const filtered = filterInviti(inviti, filterQuery);
        return sortInviti(filtered, sortField, sortDirection);
    }, [inviti, filterQuery, sortField, sortDirection]);

    const eligibleInviti = useMemo(
        () => filterInviti(nonLiquidatiInviti, filterQuery).filter(isEligibleInvito),
        [nonLiquidatiInviti, filterQuery],
    );

    const agentGroups = useMemo(() => {
        const map = new Map<number, { id: number; name: string; count: number; total: number }>();
        for (const inv of eligibleInviti) {
            const existing = map.get(inv.agente_id);
            if (existing) {
                existing.count += 1;
                existing.total += inv.totale_invito;
            } else {
                map.set(inv.agente_id, {
                    id: inv.agente_id,
                    name: inv.nome_agente,
                    count: 1,
                    total: inv.totale_invito,
                });
            }
        }
        return [...map.values()].sort((a, b) => a.name.localeCompare(b.name, "it"));
    }, [eligibleInviti]);

    type RenderRow =
        | { kind: "group"; group: { id: number; name: string; count: number; total: number } }
        | { kind: "detail"; invito: StoricoInvito };

    const renderRows = useMemo<RenderRow[]>(() => {
        const byAgent = new Map<number, StoricoInvito[]>();
        for (const inv of eligibleInviti) {
            const list = byAgent.get(inv.agente_id);
            if (list) list.push(inv);
            else byAgent.set(inv.agente_id, [inv]);
        }
        const rows: RenderRow[] = [];
        for (const group of agentGroups) {
            rows.push({ kind: "group", group });
            const items = byAgent.get(group.id) ?? [];
            const sorted = [...items].sort((a, b) =>
                b.mese_competenza.localeCompare(a.mese_competenza),
            );
            for (const invito of sorted) {
                rows.push({ kind: "detail", invito });
            }
        }
        return rows;
    }, [eligibleInviti, agentGroups]);

    const eligibleByAgent = useMemo(() => {
        const map = new Map<number, number[]>();
        for (const inv of eligibleInviti) {
            const list = map.get(inv.agente_id);
            if (list) list.push(inv.id);
            else map.set(inv.agente_id, [inv.id]);
        }
        return map;
    }, [eligibleInviti]);

    const handleSelectAgent = (agentId: number) => {
        if (agentId === selectedAgentId) return;
        selectAgent(agentId, eligibleByAgent.get(agentId) ?? []);
    };

    const handleRowClick = (invito: StoricoInvito) => {
        if (selectionMode) return;
        setEditingInvito(invito);
        setEditForm({
            stato: invito.stato,
            riferimento_fattura: invito.riferimento_fattura || "",
            data_fattura: invito.data_fattura || "",
            pagato: invito.pagato,
            data_pagamento: invito.data_pagamento || "",
        });
    };

    const handleRunCalculation = () => {
        if (selectedAgentId == null) return;
        const group = agentGroups.find((g) => g.id === selectedAgentId);
        if (!group) return;
        const mesi = eligibleInviti
            .filter((inv) => inv.agente_id === selectedAgentId && selectedInvitoIds.has(inv.id))
            .map((inv) => inv.mese_competenza);
        void runCalculation({ id: group.id, name: group.name }, mesi);
    };

    const handleSave = async () => {
        if (!editingInvito) return;

        const data: UpdateInvitoRequest = {
            stato: editForm.stato,
            riferimento_fattura: editForm.riferimento_fattura || undefined,
            data_fattura: editForm.data_fattura || undefined,
            pagato: editForm.pagato,
            data_pagamento: editForm.pagato ? editForm.data_pagamento || undefined : undefined,
        };

        await updateInvito(editingInvito.id, data);
        setEditingInvito(null);
    };

    const sortedAgentOptions = useMemo(
        () =>
            [...agents]
                .sort((a, b) => a.nome_cognome.localeCompare(b.nome_cognome, "it"))
                .map((a) => ({ value: String(a.id), label: a.nome_cognome })),
        [agents],
    );

    const handleAgentFilterChange = (value: string | undefined) => {
        setSelectedAgenteId(value ? Number(value) : undefined);
    };

    const handleStatoFilterChange = (value: string) => {
        setSelectedStato(value === "all" ? undefined : value);
    };

    const handlePagatoFilterChange = (value: string) => {
        if (value === "paid") {
            setSelectedPagato(true);
        } else if (value === "unpaid") {
            setSelectedPagato(false);
        } else {
            setSelectedPagato(undefined);
        }
    };

    const pagatoFilterValue = selectedPagato === true ? "paid" : selectedPagato === false ? "unpaid" : "all";

    return (
        <div className="flex flex-col gap-6 lg:h-[calc(100dvh-11.5rem)]">
            {/* Two-row header: title row + filter strip */}
            <div className="shrink-0 border border-border/50 rounded-sm overflow-hidden">
                {/* Row 1: Title + count + refresh */}
                <div className="flex items-center justify-between px-4 py-3 border-b border-border/30">
                    <div className="flex items-center gap-3">
                        <FileText className="h-5 w-5 text-energia-accent" />
                        <h2 className="font-display text-xl">
                            {t("invoiceInvitations")}
                            {inviti.length > 0 && (
                                <span className="ml-2 text-muted-foreground font-normal text-base">
                                    ({inviti.length})
                                </span>
                            )}
                        </h2>
                    </div>
                    <Button variant="outline" size="sm" onClick={fetchInviti} disabled={loading}>
                        {loading ? (
                            <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                            <RefreshCw className="h-4 w-4" />
                        )}
                    </Button>
                </div>

                {/* Row 2: Compact filter strip */}
                <div className="flex items-center gap-3 px-4 py-2.5 bg-secondary/30">
                    {!selectionMode && (
                        <>
                            <SearchableSelect
                                value={selectedAgenteId ? String(selectedAgenteId) : undefined}
                                options={sortedAgentOptions}
                                onValueChange={handleAgentFilterChange}
                                placeholder={t("allAgents")}
                                searchPlaceholder={t("searchParentAgent")}
                                emptyMessage={t("noParentAgentsFound")}
                                clearLabel={t("allAgents")}
                                className="h-8 w-44 text-xs"
                            />

                            <div className="h-4 w-px bg-border/50" />

                            <div className="flex items-center gap-1.5">
                                <MonthPicker
                                    value={dataInizio}
                                    onChange={setDataInizio}
                                    placeholder={t("fromMonth")}
                                    className="h-8 text-xs"
                                />
                                <span className="text-xs text-muted-foreground">&ndash;</span>
                                <MonthPicker
                                    value={dataFine}
                                    onChange={setDataFine}
                                    placeholder={t("toMonth")}
                                    className="h-8 text-xs"
                                />
                            </div>

                            <div className="h-4 w-px bg-border/50" />

                            <Select
                                value={selectedStato || "all"}
                                onValueChange={handleStatoFilterChange}
                            >
                                <SelectTrigger className="h-8 w-32 text-xs">
                                    <SelectValue placeholder={t("allStatuses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("allStatuses")}</SelectItem>
                                    <SelectItem value="bozza">{t("draft")}</SelectItem>
                                    <SelectItem value="inviato">{t("sent")}</SelectItem>
                                    <SelectItem value="approvato">{t("approved")}</SelectItem>
                                </SelectContent>
                            </Select>

                            <div className="h-4 w-px bg-border/50" />

                            <Select
                                value={pagatoFilterValue}
                                onValueChange={handlePagatoFilterChange}
                            >
                                <SelectTrigger className="h-8 w-36 text-xs">
                                    <SelectValue placeholder={t("allPaymentStatuses")} />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">{t("allPaymentStatuses")}</SelectItem>
                                    <SelectItem value="paid">{t("paidOnly")}</SelectItem>
                                    <SelectItem value="unpaid">{t("unpaidOnly")}</SelectItem>
                                </SelectContent>
                            </Select>
                        </>
                    )}

                    <div className="flex-1" />

                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground/50" />
                        <Input
                            placeholder={t("filterPlaceholder")}
                            value={filterQuery}
                            onChange={(e) => setFilterQuery(e.target.value)}
                            className="pl-8 h-8 w-48 text-xs"
                        />
                        {filterQuery && (
                            <button
                                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                onClick={() => setFilterQuery("")}
                            >
                                <X className="h-3.5 w-3.5" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

            {selectionMode && selectionLoading ? (
                <div className="ledger-card flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                </div>
            ) : selectionMode ? (
                <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="w-[48px]" />
                                    <TableHead className="min-w-[160px]">{t("agent")}</TableHead>
                                    <TableHead className="w-[150px]">{t("competenceMonth")}</TableHead>
                                    <TableHead className="w-[120px] text-right">{t("invitationTotal")}</TableHead>
                                    <TableHead className="w-[110px]">{t("status")}</TableHead>
                                    <TableHead className="w-[150px]">{t("invoiceReference")}</TableHead>
                                    <TableHead className="w-[110px]">{t("invoiceDate")}</TableHead>
                                    <TableHead className="w-[70px]">{t("paid")}</TableHead>
                                    <TableHead className="w-[120px]">{t("paymentDate")}</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {renderRows.length > 0 ? (
                                    renderRows.map((row) => {
                                        if (row.kind === "group") {
                                            const isSelected = selectedAgentId === row.group.id;
                                            return (
                                                <TableRow
                                                    key={`group-${row.group.id}`}
                                                    className={`bg-secondary/40 hover:bg-secondary/60 cursor-pointer border-t border-border/40 ${
                                                        isSelected ? "ring-1 ring-inset ring-primary/40" : ""
                                                    }`}
                                                    onClick={() => handleSelectAgent(row.group.id)}
                                                >
                                                    <TableCell>
                                                        <span
                                                            role="radio"
                                                            aria-checked={isSelected}
                                                            aria-label={row.group.name}
                                                            className={`inline-flex h-5 w-5 items-center justify-center rounded-full border-2 ${
                                                                isSelected ? "border-primary" : "border-primary/70"
                                                            }`}
                                                        >
                                                            {isSelected && (
                                                                <span className="h-2.5 w-2.5 rounded-full bg-primary" />
                                                            )}
                                                        </span>
                                                    </TableCell>
                                                    <TableCell colSpan={8} className="font-semibold">
                                                        {row.group.name}
                                                        <span className="ml-2 text-muted-foreground font-normal text-xs">
                                                            {t("unpaidCalcGroupSummary")
                                                                .replace("{count}", String(row.group.count))
                                                                .replace(
                                                                    "{total}",
                                                                    formatCurrency(row.group.total),
                                                                )}
                                                        </span>
                                                    </TableCell>
                                                </TableRow>
                                            );
                                        }
                                        const { invito } = row;
                                        const inSelectedAgent = invito.agente_id === selectedAgentId;
                                        return (
                                            <TableRow
                                                key={`detail-${invito.id}`}
                                                className={inSelectedAgent ? "" : "opacity-60"}
                                            >
                                                <TableCell>
                                                    {inSelectedAgent && (
                                                        <Checkbox
                                                            checked={selectedInvitoIds.has(invito.id)}
                                                            onCheckedChange={() => toggleInvito(invito.id)}
                                                            aria-label={formatMonth(invito.mese_competenza)}
                                                            className="h-4 w-4 border-2 border-primary/70 data-[state=checked]:border-primary"
                                                        />
                                                    )}
                                                </TableCell>
                                                <TableCell />
                                                <TableCell className="text-muted-foreground">
                                                    {formatMonth(invito.mese_competenza)}
                                                </TableCell>
                                                <TableCell className="text-right font-mono text-xs">
                                                    {formatCurrency(invito.totale_invito)}
                                                </TableCell>
                                                <TableCell>{getStatoBadge(invito.stato)}</TableCell>
                                                <TableCell className="font-mono text-xs">
                                                    {invito.riferimento_fattura || "—"}
                                                </TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {formatDate(invito.data_fattura)}
                                                </TableCell>
                                                <TableCell>{getPagatoBadge(invito.pagato)}</TableCell>
                                                <TableCell className="font-mono text-xs text-muted-foreground">
                                                    {formatDate(invito.data_pagamento)}
                                                </TableCell>
                                            </TableRow>
                                        );
                                    })
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                                            {t("noDataFound")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            ) : loading && inviti.length === 0 ? (
                <div className="ledger-card flex flex-1 items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-energia-accent" />
                </div>
            ) : inviti.length === 0 ? (
                <div className="ledger-card flex flex-1 flex-col items-center justify-center py-16 text-center">
                    <FileText className="h-12 w-12 text-muted-foreground/30 mb-4" />
                    <p className="font-display text-lg text-muted-foreground">{t("noInvitiFound")}</p>
                    <p className="text-sm text-muted-foreground/70 mt-1">{t("noInvitiDesc")}</p>
                </div>
            ) : (
                <div className="ledger-card flex min-h-0 flex-1 flex-col overflow-hidden">
                    <div className="min-h-0 flex-1 overflow-auto">
                        <Table>
                            <TableHeader className="sticky top-0 bg-secondary/90 backdrop-blur-sm">
                                <TableRow>
                                    <TableHead className="min-w-[160px]">
                                        <SortableHeader
                                            label={t("agent")}
                                            field="nome_agente"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        <SortableHeader
                                            label={t("competenceMonth")}
                                            field="mese_competenza"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px] text-right">
                                        <SortableHeader
                                            label={t("invitationTotal")}
                                            field="totale_invito"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[110px]">
                                        <SortableHeader
                                            label={t("status")}
                                            field="stato"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[150px]">
                                        <SortableHeader
                                            label={t("invoiceReference")}
                                            field="riferimento_fattura"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[110px]">
                                        <SortableHeader
                                            label={t("invoiceDate")}
                                            field="data_fattura"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[70px]">
                                        <SortableHeader
                                            label={t("paid")}
                                            field="pagato"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                    <TableHead className="w-[120px]">
                                        <SortableHeader
                                            label={t("paymentDate")}
                                            field="data_pagamento"
                                            currentField={sortField}
                                            direction={sortDirection}
                                            onSort={handleSort}
                                        />
                                    </TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {processedInviti.length > 0 ? (
                                    processedInviti.map((invito) => (
                                        <TableRow
                                            key={invito.id}
                                            className="hover:bg-secondary/30 cursor-pointer"
                                            onClick={() => handleRowClick(invito)}
                                        >
                                            <TableCell className="font-medium">{invito.nome_agente}</TableCell>
                                            <TableCell className="text-muted-foreground">
                                                {formatMonth(invito.mese_competenza)}
                                            </TableCell>
                                            <TableCell className="text-right font-mono text-xs">
                                                {formatCurrency(invito.totale_invito)}
                                            </TableCell>
                                            <TableCell>{getStatoBadge(invito.stato)}</TableCell>
                                            <TableCell className="font-mono text-xs">
                                                {invito.riferimento_fattura || "\u2014"}
                                            </TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {formatDate(invito.data_fattura)}
                                            </TableCell>
                                            <TableCell>{getPagatoBadge(invito.pagato)}</TableCell>
                                            <TableCell className="font-mono text-xs text-muted-foreground">
                                                {formatDate(invito.data_pagamento)}
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                                            {t("noDataFound")}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </div>
            )}

            <div className="shrink-0 flex items-center justify-end gap-2">
                {selectionMode ? (
                    <>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={exitSelectionMode}
                            disabled={nonLiqLoading}
                        >
                            {t("unpaidCalcCancel")}
                        </Button>
                        <Button
                            size="sm"
                            className="btn-primary"
                            onClick={handleRunCalculation}
                            disabled={nonLiqLoading || selectedAgentId == null || selectedInvitoIds.size === 0}
                        >
                            {nonLiqLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : (
                                <Calculator className="h-4 w-4 mr-2" />
                            )}
                            {t("unpaidCalcRun")}
                            {selectedInvitoIds.size > 0 && ` (${selectedInvitoIds.size})`}
                        </Button>
                    </>
                ) : (
                    <Button
                        size="sm"
                        className="btn-primary"
                        onClick={() => void enterSelectionMode()}
                        disabled={selectionLoading}
                    >
                        <Calculator className="h-4 w-4 mr-2" />
                        {t("unpaidCalcButton")}
                    </Button>
                )}
            </div>

            <Dialog open={!!editingInvito} onOpenChange={(open) => !open && setEditingInvito(null)}>
                <DialogContent className="sm:max-w-[480px]">
                    <DialogHeader>
                        <DialogTitle className="font-display">{t("editInvitation")}</DialogTitle>
                        <DialogDescription>{t("editInvitationDesc")}</DialogDescription>
                    </DialogHeader>

                    {editingInvito && (
                        <div className="space-y-4 py-2">
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t("agent")}</span>
                                <span className="font-medium">{editingInvito.nome_agente}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t("competenceMonth")}</span>
                                <span className="font-medium">{formatMonth(editingInvito.mese_competenza)}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                                <span className="text-muted-foreground">{t("invitationTotal")}</span>
                                <span className="font-medium font-mono">
                                    {formatCurrency(editingInvito.totale_invito)}
                                </span>
                            </div>

                            <hr className="border-border/50" />

                            <div className="space-y-1">
                                <label className="text-sm font-medium">{t("status")}</label>
                                <Select
                                    value={editForm.stato}
                                    onValueChange={(v) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            stato: v as EditFormData["stato"],
                                        }))
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="bozza">{t("draft")}</SelectItem>
                                        <SelectItem value="inviato">{t("sent")}</SelectItem>
                                        <SelectItem value="approvato">{t("approved")}</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">{t("invoiceReference")}</label>
                                <Input
                                    value={editForm.riferimento_fattura}
                                    onChange={(e) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            riferimento_fattura: e.target.value,
                                        }))
                                    }
                                    placeholder="FT-2024/001"
                                />
                            </div>

                            <div className="space-y-1">
                                <label className="text-sm font-medium">{t("invoiceDate")}</label>
                                <DatePicker
                                    value={editForm.data_fattura}
                                    onChange={(v) =>
                                        setEditForm((prev) => ({ ...prev, data_fattura: v }))
                                    }
                                    className="w-full"
                                />
                            </div>

                            <div className="flex items-center gap-3">
                                <Checkbox
                                    id="pagato"
                                    checked={editForm.pagato}
                                    onCheckedChange={(checked) =>
                                        setEditForm((prev) => ({
                                            ...prev,
                                            pagato: !!checked,
                                            data_pagamento: checked ? prev.data_pagamento : "",
                                        }))
                                    }
                                />
                                <label htmlFor="pagato" className="text-sm font-medium cursor-pointer">
                                    {t("paid")}
                                </label>
                            </div>

                            {editForm.pagato && (
                                <div className="space-y-1">
                                    <label className="text-sm font-medium">{t("paymentDate")}</label>
                                    <DatePicker
                                        value={editForm.data_pagamento}
                                        onChange={(v) =>
                                            setEditForm((prev) => ({ ...prev, data_pagamento: v }))
                                        }
                                        className="w-full"
                                    />
                                </div>
                            )}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="outline" onClick={() => setEditingInvito(null)}>
                            {t("cancel")}
                        </Button>
                        <Button
                            onClick={handleSave}
                            disabled={updating === editingInvito?.id}
                            className="btn-primary"
                        >
                            {updating === editingInvito?.id ? (
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            ) : null}
                            {t("save")}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
