import path from "node:path";

// 5173 and 5174 are often taken by other dev servers or Tailscale serve on this machine, so the suite uses its own port.
export const E2E_PORT = Number(process.env.E2E_PORT ?? 5190);

export const APP_URL = `http://localhost:${E2E_PORT}`;

export const BACKEND_URL = process.env.E2E_BACKEND_URL ?? "http://localhost:5000";

export const AUTH_FILE = path.join(import.meta.dirname, "..", ".auth", "user.json");

export function requiredEnv(name: string): string {
    const value = process.env[name];

    if (!value) {
        throw new Error(
            `${name} is not set. Create a login user on the local backend with ` +
                "`flask create-admin <user> <password>` and export E2E_USERNAME and E2E_PASSWORD.",
        );
    }

    return value;
}
