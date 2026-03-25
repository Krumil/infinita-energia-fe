import { getApiUrl, handleResponse } from "./client";

interface LoginRequest {
    username: string;
    password: string;
}

interface AuthResponse {
    message: string;
}

export async function apiLogin(data: LoginRequest): Promise<AuthResponse> {
    const res = await fetch(getApiUrl("/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
    });
    return handleResponse<AuthResponse>(res);
}

export async function apiLogout(): Promise<AuthResponse> {
    const res = await fetch(getApiUrl("/logout"), {
        method: "POST",
        credentials: "include",
    });
    return handleResponse<AuthResponse>(res);
}

export async function checkAuthStatus(): Promise<boolean> {
    try {
        const res = await fetch(getApiUrl("/db-status"), {
            credentials: "include",
        });
        return res.ok;
    } catch {
        return false;
    }
}
