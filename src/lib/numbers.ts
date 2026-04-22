export function parseEuroNumber(value: number | string | null | undefined): number | undefined {
    if (value === null || value === undefined || value === "") {
        return undefined;
    }

    if (typeof value === "number") {
        return Number.isFinite(value) ? value : undefined;
    }

    let normalized = value.trim();
    if (!normalized) {
        return undefined;
    }

    normalized = normalized.replace(/[€\s\u00A0]/g, "");
    if (!normalized) {
        return undefined;
    }

    const sign = normalized.startsWith("-") ? "-" : normalized.startsWith("+") ? "+" : "";
    const body = sign ? normalized.slice(1) : normalized;

    if (!body || !/^[\d.,]+$/.test(body)) {
        return undefined;
    }

    let canonical = body;
    const hasComma = body.includes(",");
    const hasDot = body.includes(".");

    if (hasComma && hasDot) {
        if (body.lastIndexOf(",") > body.lastIndexOf(".")) {
            if (!/^\d{1,3}(\.\d{3})*(,\d+)?$|^\d+(,\d+)?$/.test(body)) {
                return undefined;
            }
            canonical = body.replace(/\./g, "").replace(",", ".");
        } else {
            if (!/^\d{1,3}(,\d{3})*(\.\d+)?$|^\d+(\.\d+)?$/.test(body)) {
                return undefined;
            }
            canonical = body.replace(/,/g, "");
        }
    } else if (hasComma) {
        if (!/^\d+(,\d+)?$/.test(body)) {
            return undefined;
        }
        canonical = body.replace(",", ".");
    } else if (hasDot) {
        if (/^\d{1,3}(\.\d{3})+$/.test(body)) {
            canonical = body.replace(/\./g, "");
        } else if (!/^\d+(\.\d+)?$/.test(body)) {
            return undefined;
        }
    } else if (!/^\d+$/.test(body)) {
        return undefined;
    }

    const parsed = Number(`${sign}${canonical}`);
    return Number.isFinite(parsed) ? parsed : undefined;
}
