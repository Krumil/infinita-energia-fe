import { z } from "zod";

const BASE_API = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

type UnauthorizedCallback = () => void;

const apiErrorResponseSchema = z.object({
    error: z.string().optional().catch(undefined),
    message: z.string().optional().catch(undefined),
});

let onUnauthorized: UnauthorizedCallback | null = null;

export function setUnauthorizedCallback(callback: UnauthorizedCallback | null): void {
    onUnauthorized = callback;
}

export function getApiUrl(path: string): string {
    return `${BASE_API}${path}`;
}

export function createApiUrl(path: string): URL {
    return new URL(getApiUrl(path));
}

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
    ) {
        super(message);
        this.name = "ApiError";
    }
}

export async function authFetch(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
    const response = await fetch(input, {
        ...init,
        credentials: "include",
    });

    if (response.status === 401 && onUnauthorized) {
        onUnauthorized();
    }

    return response;
}

async function throwIfNotOk(res: Response): Promise<void> {
    if (!res.ok) {
        throw new ApiError(res.status, await getErrorMessage(res));
    }
}

function firstNonblankString(...values: Array<string | undefined>): string | null {
    for (const value of values) {
        if (value?.trim()) return value;
    }

    return null;
}

async function getErrorMessage(res: Response): Promise<string> {
    const fallback = `HTTP ${res.status}: ${res.statusText}`;

    try {
        const body: unknown = await res.json();
        const parsed = apiErrorResponseSchema.safeParse(body);

        if (!parsed.success) return fallback;

        return firstNonblankString(parsed.data.error, parsed.data.message) ?? fallback;
    } catch {
        return fallback;
    }
}

export async function handleResponse<T>(res: Response): Promise<T> {
    await throwIfNotOk(res);

    return res.json();
}

export async function handleEmptyResponse(res: Response): Promise<void> {
    await throwIfNotOk(res);
}

function sanitizeJson(text: string): string {
    return text
        .replace(/:\s*NaN\b/g, ": null")
        .replace(/:\s*Infinity\b/g, ": null")
        .replace(/:\s*-Infinity\b/g, ": null");
}

export async function handleResponseWithSanitization<T>(res: Response, schema: z.ZodType<T>): Promise<T> {
    await throwIfNotOk(res);
    const text = await res.text();
    const sanitized = sanitizeJson(text);

    const payload: unknown = JSON.parse(sanitized);

    return schema.parse(payload);
}
