const BASE_API = import.meta.env.VITE_API_BASE || "http://localhost:5000/api";

type UnauthorizedCallback = () => void;

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
        let errorMessage = `HTTP ${res.status}: ${res.statusText}`;
        try {
            const errorData = await res.json();
            if (errorData.error) {
                errorMessage = errorData.error;
            }
        } catch {
            // Ignore JSON parsing errors
        }
        throw new ApiError(res.status, errorMessage);
    }
}

export async function handleResponse<T>(res: Response): Promise<T> {
    await throwIfNotOk(res);
    return res.json();
}

function sanitizeJson(text: string): string {
    return text
        .replace(/:\s*NaN\b/g, ": null")
        .replace(/:\s*Infinity\b/g, ": null")
        .replace(/:\s*-Infinity\b/g, ": null");
}

export async function handleResponseWithSanitization<T>(res: Response): Promise<T> {
    await throwIfNotOk(res);
    const text = await res.text();
    const sanitized = sanitizeJson(text);
    return JSON.parse(sanitized) as T;
}
