import type { ReactElement } from "react";
import { EvilPieChart } from "@/components/evilcharts/charts/recharts-pie-chart";
import type { ChartConfig } from "@/components/evilcharts/ui/recharts-chart";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useTranslation } from "@/hooks/useTranslation";
import type { DashboardSection } from "@/hooks/useDashboard";
import { MUTED_SERIES, SERIES_COLORS, formatCount, formatPercent, formatPeriod, share } from "@/lib/dashboardFormat";
import type { TranslationKey } from "@/translations";
import type { DashboardSalesSplit, DashboardSalesSummary } from "@/types";
import { DashboardCard, SectionMessage } from "./DashboardCard";

type SplitKey = Exclude<keyof DashboardSalesSplit, "pct_sepa">;

interface MixGroup {
    title: TranslationKey;
    parts: { key: SplitKey; label: TranslationKey; color: string }[];
}

const MIX_GROUPS: MixGroup[] = [
    {
        title: "dashboardMixSupply",
        parts: [
            { key: "luce", label: "dashboardPower", color: SERIES_COLORS[0] },
            { key: "gas", label: "dashboardGas", color: SERIES_COLORS[1] },
            { key: "altro_udm", label: "dashboardOtherSupply", color: MUTED_SERIES },
        ],
    },
    {
        title: "dashboardMixCustomer",
        parts: [
            { key: "domestico", label: "dashboardResidential", color: SERIES_COLORS[2] },
            { key: "non_domestico", label: "dashboardBusiness", color: SERIES_COLORS[9] },
        ],
    },
    {
        title: "dashboardMixPayment",
        parts: [
            { key: "sepa", label: "dashboardSepa", color: SERIES_COLORS[0] },
            { key: "altri_metodi", label: "dashboardOtherPayment", color: MUTED_SERIES },
        ],
    },
];

interface ContractMixChartProps {
    section: DashboardSection<DashboardSalesSummary>;
    loading: boolean;
}

export function ContractMixChart({ section, loading }: ContractMixChartProps): ReactElement {
    const { t, language } = useTranslation();
    const title = t("dashboardMix");
    const description = t("dashboardMixDescription");

    if (section.status !== "ready") {
        return (
            <DashboardCard title={title} loading={loading}>
                <SectionMessage tone={section.status} message={section.message} />
            </DashboardCard>
        );
    }

    const { periodo, split_n, split_n_1 } = section.data;
    const period = formatPeriod(periodo, language);

    function groupTotal(group: MixGroup, split: DashboardSalesSplit): number {
        return group.parts.reduce((sum, part) => sum + split[part.key], 0);
    }

    if (groupTotal(MIX_GROUPS[0], split_n) === 0) {
        return (
            <DashboardCard title={title} period={period} description={description} loading={loading}>
                <SectionMessage tone="empty" message={t("dashboardNoContracts")} />
            </DashboardCard>
        );
    }

    const table = (
        <Table>
            <TableHeader>
                <TableRow>
                    <TableHead />
                    <TableHead className="text-right">{periodo.anno_n_1}</TableHead>
                    <TableHead className="text-right">{periodo.anno_n}</TableHead>
                </TableRow>
            </TableHeader>
            <TableBody>
                {MIX_GROUPS.flatMap((group) =>
                    group.parts.map((part) => (
                        <TableRow key={part.key}>
                            <TableCell className="py-2">
                                {t(group.title)}: {t(part.label)}
                            </TableCell>
                            {[split_n_1, split_n].map((split, index) => (
                                <TableCell key={index} className="py-2 text-right tabular-nums">
                                    {formatCount(split[part.key], language)} (
                                    {formatPercent(share(split[part.key], groupTotal(group, split)), language)})
                                </TableCell>
                            ))}
                        </TableRow>
                    )),
                )}
            </TableBody>
        </Table>
    );

    return (
        <DashboardCard title={title} period={period} description={description} loading={loading} table={table}>
            <div className="grid gap-6 sm:grid-cols-3">
                {MIX_GROUPS.map((group) => {
                    const total = groupTotal(group, split_n);
                    // Parts with no contracts (usually "Altro") would only add an empty legend row.
                    const parts = group.parts.filter((part) => split_n[part.key] > 0);

                    // The largest part leads, named, so an empty first part never headlines as "0%".
                    const lead = parts.reduce(
                        (top, part) => (split_n[part.key] > split_n[top.key] ? part : top),
                        parts[0],
                    );

                    return (
                        <figure key={group.title} className="min-w-0 space-y-3">
                            <figcaption className="text-sm text-muted-foreground">{t(group.title)}</figcaption>
                            <p className="flex items-baseline gap-2">
                                <span className="font-mono text-3xl font-light tabular-nums text-foreground">
                                    {formatPercent(share(split_n[lead.key], total), language)}
                                </span>
                                <span className="text-sm text-muted-foreground">{t(lead.label)}</span>
                            </p>
                            <EvilPieChart
                                config={
                                    Object.fromEntries(
                                        parts.map((part) => [
                                            part.key,
                                            { label: t(part.label), colors: { light: [part.color] } },
                                        ]),
                                    ) satisfies ChartConfig
                                }
                                data={parts.map((part) => ({
                                    part: part.key,
                                    count: split_n[part.key],
                                }))}
                                dataKey="count"
                                nameKey="part"
                                className="aspect-auto h-[220px] w-full"
                            >
                                <EvilPieChart.Pie innerRadius="60%" outerRadius="90%" />
                                <EvilPieChart.Tooltip valueFormatter={(value) => formatCount(value, language)} />
                                <EvilPieChart.Legend />
                            </EvilPieChart>
                        </figure>
                    );
                })}
            </div>
        </DashboardCard>
    );
}
