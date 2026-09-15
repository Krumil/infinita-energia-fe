import type { Rule, UpdateRuleRequest, UpdateRuleResponse, ImportRulesResponse } from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function getRules(): Promise<Rule[]> {
    const res = await authFetch(getApiUrl("/regole"));

    return handleResponse<Rule[]>(res);
}

export async function importRules(): Promise<ImportRulesResponse> {
    const res = await authFetch(getApiUrl("/regole"), { method: "POST" });

    return handleResponse<ImportRulesResponse>(res);
}

export async function updateRule(id: number, data: UpdateRuleRequest): Promise<UpdateRuleResponse> {
    const res = await authFetch(getApiUrl(`/regole/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<UpdateRuleResponse>(res);
}
