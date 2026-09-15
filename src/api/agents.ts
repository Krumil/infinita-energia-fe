import type {
    Agent,
    RuleConfigurationResponse,
    CreateAgentRequest,
    AgentCreateResponse,
    AgentMessageResponse,
    SaveRuleConfigurationRequest,
} from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function getAgents(): Promise<Agent[]> {
    const res = await authFetch(getApiUrl("/agenti"));

    return handleResponse<Agent[]>(res);
}

export async function createAgent(data: CreateAgentRequest): Promise<AgentCreateResponse> {
    const res = await authFetch(getApiUrl("/agenti"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<AgentCreateResponse>(res);
}

export async function updateAgent(id: number, data: Partial<CreateAgentRequest>): Promise<AgentMessageResponse> {
    const res = await authFetch(getApiUrl(`/agenti/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<AgentMessageResponse>(res);
}

export async function deleteAgent(id: number): Promise<AgentMessageResponse> {
    const res = await authFetch(getApiUrl(`/agenti/${id}`), { method: "DELETE" });

    return handleResponse<AgentMessageResponse>(res);
}

export async function getRuleConfiguration(agentId: number): Promise<RuleConfigurationResponse> {
    const res = await authFetch(getApiUrl(`/${agentId}/configurazione-regole`));

    return handleResponse<RuleConfigurationResponse>(res);
}

export async function saveRuleConfiguration(
    agentId: number,
    data: SaveRuleConfigurationRequest,
): Promise<AgentMessageResponse> {
    const res = await authFetch(getApiUrl(`/${agentId}/configurazione-regole`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });

    return handleResponse<AgentMessageResponse>(res);
}
