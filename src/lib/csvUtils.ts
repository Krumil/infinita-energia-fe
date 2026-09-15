import { z } from "zod";
import { downloadBlob } from "./exportUtils";

const textCell = z.string();

type CsvCell = string | number | null | undefined;

export interface CsvOptions {
    delimiter?: string;
    decimal?: string;
}

function formatNumber(value: number, decimal: string): string {
    const str = String(value);

    return decimal === "." ? str : str.replace(".", decimal);
}

function escapeCsvCell(value: CsvCell, delimiter: string, decimal: string): string {
    if (value === null || value === undefined) {
        return "";
    }

    const text = textCell.safeParse(value);
    const str = text.success ? text.data : formatNumber(Number(value), decimal);
    const needsQuoting = str.includes(delimiter) || /["\r\n]/.test(str);

    if (!needsQuoting) {
        return str;
    }

    return `"${str.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: CsvCell[][], options: CsvOptions = {}): string {
    const delimiter = options.delimiter ?? ",";
    const decimal = options.decimal ?? ".";
    const lines: string[] = [];
    lines.push(headers.map((h) => escapeCsvCell(h, delimiter, decimal)).join(delimiter));

    for (const row of rows) {
        lines.push(row.map((c) => escapeCsvCell(c, delimiter, decimal)).join(delimiter));
    }

    return lines.join("\r\n");
}

export function downloadCsv(filename: string, csv: string): void {
    const bom = "﻿";
    const blob = new Blob([bom + csv], { type: "text/csv;charset=utf-8;" });
    downloadBlob(blob, filename);
}
