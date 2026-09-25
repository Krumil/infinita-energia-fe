interface CalendarDate {
    year: number;
    month: number;
    day?: number;
}

const monthPattern = /^(\d{4})-(\d{2})(?:-(\d{2}))?$/;

const importCompetencePattern = /^(\d{2})\/(\d{4})$/;

export class InvalidCompetenceDateError extends RangeError {
    constructor(input: string) {
        super(`Invalid competence date: ${input}`);
        this.name = "InvalidCompetenceDateError";
    }
}

function isLeapYear(year: number): boolean {
    return year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
}

function daysInMonth(year: number, month: number): number {
    if (month === 2) return isLeapYear(year) ? 29 : 28;

    return [4, 6, 9, 11].includes(month) ? 30 : 31;
}

function parseMonthInput(input: string): CalendarDate {
    const match = monthPattern.exec(input);

    if (!match) throw new InvalidCompetenceDateError(input);

    const year = Number(match[1]);
    const month = Number(match[2]);
    const day = match[3] === undefined ? undefined : Number(match[3]);

    if (year === 0 || month < 1 || month > 12 || (day !== undefined && (day < 1 || day > daysInMonth(year, month)))) {
        throw new InvalidCompetenceDateError(input);
    }

    return { year, month, day };
}

function formatMonth(year: number, month: number): string {
    return `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}`;
}

export function currentMonth(): string {
    const now = new Date();

    return formatMonth(now.getFullYear(), now.getMonth() + 1);
}

export function monthToStartDate(input: string): string {
    const { year, month } = parseMonthInput(input);

    return `${formatMonth(year, month)}-01`;
}

export function monthToImportCompetence(input: string): string {
    const { year, month } = parseMonthInput(input);

    return `${month.toString().padStart(2, "0")}/${year.toString().padStart(4, "0")}`;
}

export function importCompetenceToMonth(input: string): string {
    const match = importCompetencePattern.exec(input);

    if (!match) throw new InvalidCompetenceDateError(input);

    const month = Number(match[1]);
    const year = Number(match[2]);

    if (year === 0 || month < 1 || month > 12) throw new InvalidCompetenceDateError(input);

    return formatMonth(year, month);
}
