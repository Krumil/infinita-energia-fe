import { downloadBlob } from "@/lib/exportUtils";

export interface HtmlExportOptions {
    title: string;
    fileName: string;
}

// Frozen snapshot: no motion, so cards that fade in are never captured at partial opacity.
const SNAPSHOT_CSS = `
*, *::before, *::after {
    animation: none !important;
    transition: none !important;
}
.export-page {
    max-width: 1280px;
    margin: 0 auto;
    padding: 24px 16px;
}
.export-page .recharts-responsive-container,
.export-page .recharts-wrapper {
    width: 100% !important;
    height: auto !important;
}
.export-page .recharts-legend-wrapper {
    position: static !important;
    width: auto !important;
    height: auto !important;
}
.export-page svg.recharts-surface {
    width: 100%;
    height: auto;
    /* Axis widths were measured with the web font; an offline reader's fallback font is wider. */
    overflow: visible;
}
`;

function escapeHtml(value: string): string {
    return value
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function isSecurityError(cause: unknown): boolean {
    return cause instanceof DOMException && cause.name === "SecurityError";
}

interface CollectedStyles {
    css: string;
    links: string[];
}

/**
 * Serializes the app's stylesheets. Cross-origin sheets (Google Fonts) hide
 * their rules from script, so they are referenced by URL instead.
 */
function collectStyles(): CollectedStyles {
    const links: string[] = [];
    const chunks: string[] = [];

    for (const sheet of Array.from(document.styleSheets)) {
        try {
            chunks.push(
                Array.from(sheet.cssRules)
                    .map((rule) => rule.cssText)
                    .join("\n"),
            );
        } catch (error) {
            if (isSecurityError(error) && sheet.href) {
                links.push(sheet.href);
                continue;
            }

            const reason = error instanceof Error ? error.message : String(error);
            throw new Error(
                `Cannot read stylesheet ${sheet.href ?? "(inline)"} for HTML export: ${reason}`,
            );
        }
    }

    return { css: chunks.join("\n"), links };
}

/**
 * Recharts writes fixed pixel sizes on the SVG. A viewBox taken from those
 * sizes lets the browser scale the chart down to its container.
 */
function makeChartsFluid(clone: HTMLElement): void {
    clone.querySelectorAll<SVGSVGElement>("svg.recharts-surface").forEach((svg) => {
        const width = svg.getAttribute("width");
        const height = svg.getAttribute("height");

        if (!svg.hasAttribute("viewBox") && width && height) {
            svg.setAttribute("viewBox", `0 0 ${parseFloat(width)} ${parseFloat(height)}`);
        }

        svg.removeAttribute("width");
        svg.removeAttribute("height");
    });

    // Recharts 3 puts a zero-sized sizer div (or a min-width box in scrollable charts) around the wrapper.
    clone.querySelectorAll<HTMLElement>(".recharts-wrapper").forEach((wrapper) => {
        const sizer = wrapper.parentElement;

        if (sizer) {
            sizer.style.width = "100%";
            sizer.style.height = "auto";
            sizer.style.minWidth = "0";
            // Never stretch past the size the chart had on screen, or its text grows with it.
            sizer.style.maxWidth = wrapper.style.width;
        }
    });

    // The evilcharts ChartContainer fixes the chart box with aspect-video; the SVG now sets its own height.
    clone.querySelectorAll<HTMLElement>(".recharts-responsive-container").forEach((container) => {
        const parent = container.parentElement;

        if (parent) {
            parent.style.aspectRatio = "auto";
            parent.style.height = "auto";
        }
    });
}

interface LegendBand {
    height: number;
    atBottom: boolean;
}

/** Reads each chart's legend height from the live layout, which a detached clone doesn't have. */
function measureLegendBands(element: HTMLElement): (LegendBand | null)[] {
    return Array.from(element.querySelectorAll(".recharts-wrapper"), (wrapper) => {
        const legend = wrapper.querySelector<HTMLElement>(".recharts-legend-wrapper");

        return legend ? { height: legend.offsetHeight, atBottom: legend.style.bottom !== "" } : null;
    });
}

/**
 * The export lays legends out in flow so they rewrap on narrow screens. That
 * leaves the band Recharts kept empty for the absolute legend, so it's cut
 * from the viewBox, and a bottom legend moves below the plot.
 */
function moveLegendsIntoFlow(clone: HTMLElement, bands: (LegendBand | null)[]): void {
    clone.querySelectorAll(".recharts-wrapper").forEach((wrapper, index) => {
        const band = bands[index];
        const legend = wrapper.querySelector(".recharts-legend-wrapper");
        const svg = wrapper.querySelector<SVGSVGElement>(":scope > svg.recharts-surface");

        if (!band || !legend || !svg) return;

        const { x, y, width, height } = svg.viewBox.baseVal;
        const top = band.atBottom ? y : y + band.height;

        svg.setAttribute("viewBox", `${x} ${top} ${width} ${height - band.height}`);

        if (band.atBottom) wrapper.append(legend);
    });
}

function buildDocument(clone: HTMLElement, title: string): string {
    const root = document.documentElement;
    const { css, links } = collectStyles();
    const linkTags = links.map((href) => `<link rel="stylesheet" href="${escapeHtml(href)}">`).join("\n");

    return `<!doctype html>
<html class="${escapeHtml(root.className)}" lang="${escapeHtml(root.lang)}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
${linkTags}
<style>
${css}
${SNAPSHOT_CSS}
</style>
</head>
<body class="${escapeHtml(document.body.className)}">
<div class="export-page">
${clone.outerHTML}
</div>
</body>
</html>
`;
}

/**
 * Downloads a standalone, script-free HTML snapshot of a rendered element.
 * Descendants marked with `data-export-exclude` (filters, buttons) are dropped,
 * and hidden ones marked with `data-export-only` are shown.
 */
export function exportElementAsHtml(element: HTMLElement, options: HtmlExportOptions): void {
    const legendBands = measureLegendBands(element);
    // SAFETY: cloneNode returns a node of its receiver's type, and the receiver is an HTMLElement.
    const clone = element.cloneNode(true) as HTMLElement;

    // Before exclusions are removed, so chart indexes still match the measured original.
    moveLegendsIntoFlow(clone, legendBands);
    clone.querySelectorAll("[data-export-exclude]").forEach((node) => node.remove());
    clone.querySelectorAll("[data-export-only]").forEach((node) => node.removeAttribute("hidden"));
    makeChartsFluid(clone);

    const html = buildDocument(clone, options.title);
    downloadBlob(new Blob([html], { type: "text/html;charset=utf-8" }), options.fileName);
}
