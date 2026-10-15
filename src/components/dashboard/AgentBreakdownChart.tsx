import type { ReactElement } from "react";
import { LabelList, type LabelProps } from "recharts";
import { z } from "zod";
import { EvilBarChart } from "@/components/evilcharts/charts/recharts-bar-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import {
    MUTED_SERIES,
    SERIES_COLORS,
    barChartHeight,
    bySepaShare,
    displayName,
    fillTemplate,
    formatCount,
    formatPercent,
    formatPeriodComparison,
} from "@/lib/dashboardFormat";
import type { TranslationKey } from "@/translations";
import type { DashboardAgentComparison, DashboardAgentMetrics, DashboardAgentRow } from "@/types";
import { DashboardCard, SectionMessage } from "./DashboardCard";

type CountKey = "luce" | "gas" | "altro_udm" | "domestico" | "non_domestico";

interface StackPart {
    key: CountKey;
    label: TranslationKey;
    color: string;
}

/** Colors match the contract mix donuts, so "Luce" or "Domestico" reads the same everywhere. */
const STACKS = {
    supply: {
        title: "dashboardAgentsSupplyTitle",
        parts: [
            { key: "luce", label: "dashboardPower", color: SERIES_COLORS[0] },
            { key: "gas", label: "dashboardGas", color: SERIES_COLORS[1] },
            { key: "altro_udm", label: "dashboardOtherSupply", color: MUTED_SERIES },
        ],
    },
    customer: {
        title: "dashboardAgentsCustomerTitle",
        parts: [
            { key: "domestico", label: "dashboardResidential", color: SERIES_COLORS[2] },
            { key: "non_domestico", label: "dashboardBusiness", color: SERIES_COLORS[9] },
        ],
    },
} satisfies Record<string, { title: TranslationKey; parts: StackPart[] }>;

export type AgentBreakdownKind = keyof typeof STACKS | "sepa";

// Same color as SEPA in the company mix.
const SEPA_COLOR = SERIES_COLORS[0];

function formatShare(value: number | null, language: Parameters<typeof formatPercent>[1]): string {
    return value === null ? "–" : formatPercent(value, language);
}

/** The backend reports no change for "Altro", so its segments go unlabeled. */
function changeOf(agent: DashboardAgentRow, key: CountKey): number | null | undefined {
    return key === "altro_udm" ? undefined : agent.variazione_pct[key];
}

// Recharts types label geometry loosely; on a bar segment it's always numbers. A missing value means "no label here".
const changeLabelProps = z.object({
    x: z.number(),
    y: z.number(),
    width: z.number(),
    height: z.number(),
    value: z.string(),
});

/** A segment's change from the previous year, drawn only where the text fits inside the segment. */
function ChangeLabel(props: LabelProps): ReactElement | null {
    const parsed = changeLabelProps.safeParse(props);

    if (!parsed.success) return null;

    const { x, y, width, height, value } = parsed.data;

    // About 6.5px per character at 11px, plus padding on both sides.
    if (width < value.length * 6.5 + 10) return null;

    return (
        <text
            x={x + width / 2}
            y={y + height / 2}
            textAnchor="middle"
            dominantBaseline="central"
            // A halo in the card color keeps the text readable on every segment color in both themes.
            className="fill-foreground text-[11px] font-medium tabular-nums"
            style={{ paintOrder: "stroke", stroke: "hsl(var(--card))", strokeWidth: 3, strokeLinejoin: "round" }}
        >
            {value}
        </text>
    );
}

interface AgentBreakdownChartProps {
    kind: AgentBreakdownKind;
    section: DashboardSection<DashboardAgentComparison>;
    loading: boolean;
}

/**
 * One reference-report chart per kind: luce/gas and domestico/non domestico stacked per agent,
 * or the share of SEPA contracts per agent. Same agents and threshold as "Contratti per agente".
 */
export function AgentBreakdownChart({ kind, section, loading }: AgentBreakdownChartProps): ReactElement {
    const { t, language } = useTranslation();
    const title = t(kind === "sepa" ? "dashboardAgentsSepaTitle" : STACKS[kind].title);

    if (section.status !== "ready") {
        return (
            <DashboardCard title={title} loading={loading}>
                <SectionMessage tone={section.status} message={section.message} />
            </DashboardCard>
        );
    }

    const { periodo, agenti, min_contratti } = section.data;
    const period = formatPeriodComparison(periodo, language);
    const description = fillTemplate(t("dashboardAgentsThreshold"), { min: min_contratti });

    if (agenti.length === 0) {
        return (
            <DashboardCard title={title} period={period} description={description} loading={loading}>
                <SectionMessage tone="empty" message={fillTemplate(t("dashboardAgentsEmpty"), { min: min_contratti })} />
            </DashboardCard>
        );
    }

    if (kind === "sepa") {
        const sorted = [...agenti].sort(bySepaShare);

        const table = (
            <Table>
                <TableHeader>
                    <TableRow>
                        <TableHead>{t("agent")}</TableHead>
                        <TableHead className="text-right">{`${t("dashboardSepaShare")} ${periodo.anno_n}`}</TableHead>
                        <TableHead className="text-right">{`${t("dashboardSepaShare")} ${periodo.anno_n_1}`}</TableHead>
                        <TableHead className="text-right">{t("dashboardSepa")}</TableHead>
                        <TableHead className="text-right">{`${t("contracts")} ${periodo.anno_n}`}</TableHead>
                    </TableRow>
                </TableHeader>
                <TableBody>
                    {sorted.map((agent) => (
                        <TableRow key={agent.agente_id}>
                            <TableCell className="py-2">{agent.agente}</TableCell>
                            <TableCell className="py-2 text-right tabular-nums">
                                {formatShare(agent.n.pct_sepa, language)}
                            </TableCell>
                            <TableCell className="py-2 text-right tabular-nums">
                                {formatShare(agent.n_1.pct_sepa, language)}
                            </TableCell>
                            <TableCell className="py-2 text-right tabular-nums">{formatCount(agent.n.sepa, language)}</TableCell>
                            <TableCell className="py-2 text-right tabular-nums">
                                {formatCount(agent.n.contratti_totali, language)}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        );

        // An agent with no contracts in a year has no share, so that year's bar is left out rather than drawn at 0%.
        const sepaRows = sorted.map((agent) => ({
            agent: displayName(agent.agente),
            n: agent.n.pct_sepa,
            n_1: agent.n_1.pct_sepa,
        }));

        const sepaConfig = {
            n: { label: String(periodo.anno_n), colors: { light: [SEPA_COLOR] } },
            n_1: { label: String(periodo.anno_n_1), colors: { light: [MUTED_SERIES] } },
        } satisfies ChartConfig;

        return (
            <DashboardCard
                title={title}
                period={period}
                description={`${description} ${fillTemplate(t("dashboardAgentsSepaNoBase"), { year: periodo.anno_n_1 })}`}
                loading={loading}
                table={table}
            >
                {/* Two bars per agent, so each row needs twice the single-bar height. */}
                <div style={{ height: barChartHeight(sorted.length * 2, true) }}>
                    <EvilBarChart
                        config={sepaConfig}
                        data={sepaRows}
                        layout="horizontal"
                        stackType="default"
                        className="aspect-auto h-full w-full"
                        chartProps={{ margin: { top: 0, right: 12, left: 0 } }}
                    >
                        <EvilBarChart.Grid />
                        <EvilBarChart.XAxis
                            domain={[0, 100]}
                            tickFormatter={(value: number) => formatPercent(value, language)}
                        />
                        <EvilBarChart.YAxis dataKey="agent" interval={0} />
                        <EvilBarChart.Tooltip valueFormatter={(value) => formatPercent(value, language)} />
                        <EvilBarChart.Legend align="left" />
                        <EvilBarChart.Bar dataKey="n" />
                        <EvilBarChart.Bar dataKey="n_1" />
                    </EvilBarChart>
                </div>
            </DashboardCard>
        );
    }

    // "Altro" is almost always empty; it only gets a series when some agent has one.
    const parts = STACKS[kind].parts.filter((part) => agenti.some((agent) => agent.n[part.key] > 0));

    const countCells = (metrics: DashboardAgentMetrics, year: number): ReactElement[] =>
        parts.map((part) => (
            <TableCell key={`${part.key}-${year}`} className="py-2 text-right tabular-nums">
                {formatCount(metrics[part.key], language)}
            </TableCell>
        ));

    const table = (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead>{t("agent")}</TableHead>
                    {[periodo.anno_n, periodo.anno_n_1].flatMap((year) =>
                        parts.map((part) => (
                            <TableHead key={`${part.key}-${year}`} className="text-right">
                                {`${t(part.label)} ${year}`}
                            </TableHead>
                        )),
                    )}
                </TableRow>
            </TableHeader>
            <TableBody>
                {agenti.map((agent) => (
                    <TableRow key={agent.agente_id}>
                        <TableCell className="py-2">{agent.agente}</TableCell>
                        {countCells(agent.n, periodo.anno_n)}
                        {countCells(agent.n_1, periodo.anno_n_1)}
                    </TableRow>
                ))}
            </TableBody>
        </Table>
    );

    // The change label of an empty segment would sit on nothing, so it's left out.
    const changeLabel = (agent: DashboardAgentRow, key: CountKey): string | undefined => {
        const change = changeOf(agent, key);

        if (change === undefined || agent.n[key] === 0) return undefined;

        return change === null ? t("dashboardChangeUnavailable") : formatPercent(Math.round(change), language, true);
    };

    // Dynamic series keys, so rows are a string-keyed record.
    const partsRows = agenti.map((agent) =>
        Object.fromEntries([
            ["agent", displayName(agent.agente)],
            ...parts.flatMap((part) => [
                [part.key, agent.n[part.key]],
                [`${part.key}_change`, changeLabel(agent, part.key)],
            ]),
        ]),
    );

    const partsConfig = Object.fromEntries(
        parts.map((part) => [part.key, { label: t(part.label), colors: { light: [part.color] } }]),
    ) satisfies ChartConfig;

    return (
        <DashboardCard
            title={title}
            period={period}
            description={`${description} ${fillTemplate(t("dashboardAgentsChangeLabels"), { year: periodo.anno_n_1 })}`}
            loading={loading}
            table={table}
        >
            <div style={{ height: barChartHeight(agenti.length, true) }}>
                <EvilBarChart
                    config={partsConfig}
                    data={partsRows}
                    layout="horizontal"
                    stackType="stacked"
                    className="aspect-auto h-full w-full"
                    chartProps={{ margin: { top: 0, right: 12, left: 0 } }}
                >
                    <EvilBarChart.Grid />
                    <EvilBarChart.XAxis
                        allowDecimals={false}
                        tickFormatter={(value: number) => formatCount(value, language)}
                    />
                    <EvilBarChart.YAxis dataKey="agent" interval={0} />
                    <EvilBarChart.Tooltip valueFormatter={(value) => formatCount(value, language)} />
                    <EvilBarChart.Legend align="left" />
                    {parts.map((part) => (
                        <EvilBarChart.Bar
                            key={part.key}
                            dataKey={part.key}
                            barProps={{ children: <LabelList dataKey={`${part.key}_change`} content={ChangeLabel} /> }}
                        />
                    ))}
                </EvilBarChart>
            </div>
        </DashboardCard>
    );
}
