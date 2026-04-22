import type { Regola, UpdateRegolaRequest, UpdateRegolaResponse, ImportRegoleResponse } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function getRegole(): Promise<Regola[]> {
    const res = await authFetch(getApiUrl("/regole"));
    return handleResponse<Regola[]>(res);
}

export async function importRegole(): Promise<ImportRegoleResponse> {
    const res = await authFetch(getApiUrl("/regole"), { method: "POST" });
    return handleResponse<ImportRegoleResponse>(res);
}

export async function updateRegola(id: number, data: UpdateRegolaRequest): Promise<UpdateRegolaResponse> {
    const res = await authFetch(getApiUrl(`/regole/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<UpdateRegolaResponse>(res);
}
