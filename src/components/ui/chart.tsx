import * as React from "react";
import { z } from "zod";
import * as RechartsPrimitive from "recharts";
import { cn } from "@/lib/utils";

export interface ChartConfig {
    [key: string]: {
        label?: React.ReactNode;
        icon?: React.ComponentType;
        color?: string;
    };
}

interface ChartContextProps {
    config: ChartConfig;
}

interface ChartStyle extends React.CSSProperties {
    [property: `--${string}`]: string | number | undefined;
}

interface ChartDatum {
    [field: string]: string | number | null | undefined;
}

interface ChartPayloadSource {
    payload?: ChartDatum;
}

interface ChartTooltipItem extends ChartPayloadSource {
    name?: string;
    dataKey?: string | number;
    value?: number;
    color?: string;
}

const chartText = z.string();

const ChartContext = React.createContext<ChartContextProps | null>(null);

function useChart() {
    const context = React.useContext(ChartContext);

    if (!context) {
        throw new Error("useChart must be used within a <ChartContainer />");
    }

    return context;
}

const ChartContainer = React.forwardRef<
    HTMLDivElement,
    React.ComponentProps<"div"> & {
        config: ChartConfig;
        children: React.ComponentProps<typeof RechartsPrimitive.ResponsiveContainer>["children"];
    }
>(({ id, className, children, config, ...props }, ref) => {
    const uniqueId = React.useId();
    const chartId = `chart-${id || uniqueId.replace(/:/g, "")}`;

    // Generate CSS variables from config
    const cssVariables = React.useMemo(() => {
        const vars: ChartStyle = {};
        Object.entries(config).forEach(([key, value]) => {
            if (value.color) {
                vars[`--color-${key}`] = value.color;
            }
        });

        return vars;
    }, [config]);

    return (
        <ChartContext.Provider value={{ config }}>
            <div
                data-chart={chartId}
                ref={ref}
                className={cn(
                    "flex aspect-video justify-center text-xs [&_.recharts-cartesian-axis-tick_text]:fill-muted-foreground [&_.recharts-cartesian-grid_line[stroke='#ccc']]:stroke-border/50 [&_.recharts-curve.recharts-tooltip-cursor]:stroke-border [&_.recharts-dot[stroke='#fff']]:stroke-transparent [&_.recharts-layer]:outline-none [&_.recharts-polar-grid_[stroke='#ccc']]:stroke-border [&_.recharts-radial-bar-background-sector]:fill-muted [&_.recharts-rectangle.recharts-tooltip-cursor]:fill-muted [&_.recharts-reference-line_[stroke='#ccc']]:stroke-border [&_.recharts-sector[stroke='#fff']]:stroke-transparent [&_.recharts-sector]:outline-none [&_.recharts-surface]:outline-none",
                    className,
                )}
                style={cssVariables}
                {...props}
            >
                <RechartsPrimitive.ResponsiveContainer>{children}</RechartsPrimitive.ResponsiveContainer>
            </div>
        </ChartContext.Provider>
    );
});

ChartContainer.displayName = "Chart";

const ChartTooltip = RechartsPrimitive.Tooltip;

interface ChartTooltipContentProps extends React.ComponentProps<"div"> {
    active?: boolean;
    payload?: ChartTooltipItem[];
    label?: string;
    hideLabel?: boolean;
    hideIndicator?: boolean;
    indicator?: "line" | "dot" | "dashed";
    nameKey?: string;
    labelKey?: string;
    labelFormatter?: (value: React.ReactNode, payload: ChartTooltipItem[]) => React.ReactNode;
    formatter?: (value: number, name: string, item: ChartTooltipItem, index: number, payload: ChartDatum | undefined) => React.ReactNode;
    labelClassName?: string;
    color?: string;
}

const ChartTooltipContent = React.forwardRef<HTMLDivElement, ChartTooltipContentProps>(
    (
        {
            active,
            payload,
            className,
            indicator = "dot",
            hideLabel = false,
            hideIndicator = false,
            label,
            labelFormatter,
            labelClassName,
            formatter,
            color,
            nameKey,
            labelKey,
        },
        ref,
    ) => {
        const { config } = useChart();

        const tooltipLabel = React.useMemo(() => {
            if (hideLabel || !payload?.length) {
                return null;
            }

            const [item] = payload;
            const key = `${labelKey || item?.dataKey || item?.name || "value"}`;
            const itemConfig = getPayloadConfigFromPayload(config, item, key);

            const parsedLabel = chartText.safeParse(label);

            const value =
                !labelKey && parsedLabel.success
                    ? config[parsedLabel.data]?.label || parsedLabel.data
                    : itemConfig?.label;

            if (labelFormatter && payload) {
                return <div className={cn("font-medium", labelClassName)}>{labelFormatter(value, payload)}</div>;
            }

            if (!value) {
                return null;
            }

            return <div className={cn("font-medium", labelClassName)}>{value}</div>;
        }, [label, labelFormatter, payload, hideLabel, labelClassName, config, labelKey]);

        if (!active || !payload?.length) {
            return null;
        }

        const nestLabel = payload.length === 1 && indicator !== "dot";

        return (
            <div
                ref={ref}
                className={cn(
                    "grid min-w-[8rem] items-start gap-1.5 rounded-lg border border-border/50 bg-background px-2.5 py-1.5 text-xs shadow-xl",
                    className,
                )}
            >
                {!nestLabel ? tooltipLabel : null}
                <div className="grid gap-1.5">
                    {payload.map((item, index) => {
                        const key = `${nameKey || item.name || item.dataKey || "value"}`;
                        const itemConfig = getPayloadConfigFromPayload(config, item, key);

                        const fill = chartText.safeParse(item.payload?.fill);
                        const indicatorColor = color || (fill.success ? fill.data : undefined) || item.color;

                        const indicatorStyle: ChartStyle = {
                            "--color-bg": indicatorColor,
                            "--color-border": indicatorColor,
                        };

                        return (
                            <div
                                key={String(item.dataKey) || index}
                                className={cn(
                                    "flex w-full flex-wrap items-stretch gap-2 [&>svg]:h-2.5 [&>svg]:w-2.5 [&>svg]:text-muted-foreground",
                                    indicator === "dot" && "items-center",
                                )}
                            >
                                {formatter && item?.value !== undefined && item.name ? (
                                    formatter(item.value, item.name, item, index, item.payload)
                                ) : (
                                    <>
                                        {itemConfig?.icon ? (
                                            <itemConfig.icon />
                                        ) : (
                                            !hideIndicator && (
                                                <div
                                                    className={cn(
                                                        "shrink-0 rounded-[2px] border-[--color-border] bg-[--color-bg]",
                                                        {
                                                            "h-2.5 w-2.5": indicator === "dot",
                                                            "w-1": indicator === "line",
                                                            "w-0 border-[1.5px] border-dashed bg-transparent":
                                                                indicator === "dashed",
                                                            "my-0.5": nestLabel && indicator === "dashed",
                                                        },
                                                    )}
                                                    style={indicatorStyle}
                                                />
                                            )
                                        )}
                                        <div
                                            className={cn(
                                                "flex flex-1 justify-between leading-none",
                                                nestLabel ? "items-end" : "items-center",
                                            )}
                                        >
                                            <div className="grid gap-1.5">
                                                {nestLabel ? tooltipLabel : null}
                                                <span className="text-muted-foreground">
                                                    {itemConfig?.label || item.name}
                                                </span>
                                            </div>
                                            {item.value !== undefined && (
                                                <span className="font-mono font-medium tabular-nums text-foreground">
                                                    {item.value.toLocaleString()}
                                                </span>
                                            )}
                                        </div>
                                    </>
                                )}
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    },
);

ChartTooltipContent.displayName = "ChartTooltipContent";

const ChartLegend = RechartsPrimitive.Legend;

interface ChartLegendContentProps extends React.ComponentProps<"div"> {
    payload?: Array<{
        value?: string;
        payload?: ChartDatum;
        dataKey?: string | number;
        color?: string;
    }>;
    verticalAlign?: "top" | "bottom";
    hideIcon?: boolean;
    nameKey?: string;
}

const ChartLegendContent = React.forwardRef<HTMLDivElement, ChartLegendContentProps>(
    ({ className, hideIcon = false, payload, verticalAlign = "bottom", nameKey }, ref) => {
        const { config } = useChart();

        if (!payload?.length) {
            return null;
        }

        return (
            <div
                ref={ref}
                className={cn(
                    "flex items-center justify-center gap-4",
                    verticalAlign === "top" ? "pb-3" : "pt-3",
                    className,
                )}
            >
                {payload.map((item) => {
                    const key = `${nameKey || item.dataKey || "value"}`;
                    const itemConfig = getPayloadConfigFromPayload(config, item, key);

                    return (
                        <div
                            key={item.value}
                            className={cn(
                                "flex items-center gap-1.5 [&>svg]:h-3 [&>svg]:w-3 [&>svg]:text-muted-foreground",
                            )}
                        >
                            {itemConfig?.icon && !hideIcon ? (
                                <itemConfig.icon />
                            ) : (
                                <div
                                    className="h-2 w-2 shrink-0 rounded-[2px]"
                                    style={{
                                        backgroundColor: item.color,
                                    }}
                                />
                            )}
                            {itemConfig?.label}
                        </div>
                    );
                })}
            </div>
        );
    },
);

ChartLegendContent.displayName = "ChartLegendContent";

function getPayloadConfigFromPayload(config: ChartConfig, item: ChartPayloadSource, key: string): ChartConfig[string] | undefined {
    if (Object.prototype.hasOwnProperty.call(config, key)) {
        return config[key];
    }

    const label = chartText.safeParse(item.payload?.[key]);

    return label.success && Object.prototype.hasOwnProperty.call(config, label.data)
        ? config[label.data]
        : undefined;
}

export { ChartContainer, ChartTooltip, ChartTooltipContent, ChartLegend, ChartLegendContent };
