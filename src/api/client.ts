import { z } from "zod";
import { getTranslation } from "@/translations";

const BASE_API = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

type UnauthorizedCallback = () => void;

const apiErrorResponseSchema = z.object({
    error: z.string().optional().catch(undefined),
    message: z.string().optional().catch(undefined),
    // The backend's validation errors, one per invalid field; campo is "body" when the error isn't tied to one field.
    dettagli: z
        .array(z.object({ campo: z.string(), errore: z.string() }))
        .optional()
        .catch(undefined),
});

let onUnauthorized: UnauthorizedCallback | null = null;

export function setUnauthorizedCallback(callback: UnauthorizedCallback | null): void {
    onUnauthorized = callback;
}

export function getApiUrl(path: string): string {
    return `${BASE_API}${path}`;
}

export function createApiUrl(path: string): URL {
    // The origin lets a relative VITE_API_BASE such as /api resolve; an absolute base ignores it.
    return new URL(getApiUrl(path), window.location.origin);
}

export class ApiError extends Error {
    constructor(
        public status: number,
        message: string,
        // False when the body had no message and the text is only the HTTP status line.
        public fromBody = false,
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
        const message = await getErrorMessage(res);

        throw new ApiError(res.status, message ?? statusMessage(res), message !== null);
    }
}

// A 5xx without a body message is a gateway's status line, which means nothing to the operator on any screen.
function statusMessage(res: Response): string {
    if (res.status < 500) return `HTTP ${res.status}: ${res.statusText}`;

    // ThemeLanguageProvider keeps the document language in step with the operator's choice.
    return getTranslation(document.documentElement.lang === "en" ? "en" : "it", "serverError");
}

function firstNonblankString(...values: Array<string | undefined>): string | null {
    for (const value of values) {
        if (value?.trim()) return value;
    }

    return null;
}

async function getErrorMessage(res: Response): Promise<string | null> {
    try {
        const body: unknown = await res.json();
        const parsed = apiErrorResponseSchema.safeParse(body);

        if (!parsed.success) return null;

        const message = firstNonblankString(parsed.data.error, parsed.data.message);

        if (message === null) return null;

        const details = (parsed.data.dettagli ?? []).map(({ campo, errore }) => {
            // Pydantic puts "Value error, " before the text of the backend's own validators.
            const text = errore.replace(/^Value error, /, "");

            return campo === "body" ? text : `${campo}: ${text}`;
        });

        return details.length > 0 ? `${message} (${details.join("; ")})` : message;
    } catch {
        return null;
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
