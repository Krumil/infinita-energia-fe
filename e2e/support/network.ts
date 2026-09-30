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

// Holds every request to the path at the browser until released, then lets it reach the real backend.
export async function holdRequests(page: Page, path: string): Promise<() => void> {
    let release: () => void = () => undefined;

    const released = new Promise<void>((resolve) => {
        release = resolve;
    });

    await page.route(`**${path}`, async (route) => {
        await released;
        await route.continue();
    });

    return () => release();
}

// Records every API request, reads included, as "METHOD /path".
export function recordApiRequests(page: Page): string[] {
    const calls: string[] = [];

    page.on("request", (request) => {
        const { pathname } = new URL(request.url());

        if (pathname.startsWith("/api/")) calls.push(`${request.method()} ${pathname}`);
    });

    return calls;
}
