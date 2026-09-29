import type { Page } from "@playwright/test";

// Records each write to the API as it starts and when its response has arrived, so tests can check ordering.
export function recordApiWrites(page: Page): string[] {
    const calls: string[] = [];

    const describe = (url: string, method: string): string | null => {
        const { pathname } = new URL(url);

        return pathname.startsWith("/api/") && method !== "GET" ? `${method} ${pathname}` : null;
    };

    page.on("request", (request) => {
        const call = describe(request.url(), request.method());

        if (call) calls.push(`start ${call}`);
    });

    page.on("requestfinished", (request) => {
        const call = describe(request.url(), request.method());

        if (call) calls.push(`end ${call}`);
    });

    return calls;
}
