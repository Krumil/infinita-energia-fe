import type {
    Agente,
    ConfigurazioneResponse,
    CreateAgentRequest,
    AgentCreateResponse,
    AgentMessageResponse,
    SaveConfigurazioneRequest,
} from "@/types";
import { authFetch, getApiUrl, handleResponse } from "./client";

export async function getAgenti(): Promise<Agente[]> {
    const res = await authFetch(getApiUrl("/agenti"));
    return handleResponse<Agente[]>(res);
}

export async function createAgente(data: CreateAgentRequest): Promise<AgentCreateResponse> {
    const res = await authFetch(getApiUrl("/agenti"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<AgentCreateResponse>(res);
}

export async function updateAgente(id: number, data: Partial<CreateAgentRequest>): Promise<AgentMessageResponse> {
    const res = await authFetch(getApiUrl(`/agenti/${id}`), {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<AgentMessageResponse>(res);
}

export async function deleteAgente(id: number): Promise<AgentMessageResponse> {
    const res = await authFetch(getApiUrl(`/agenti/${id}`), { method: "DELETE" });
    return handleResponse<AgentMessageResponse>(res);
}

export async function getConfigurazioneRegole(agenteId: number): Promise<ConfigurazioneResponse> {
    const res = await authFetch(getApiUrl(`/${agenteId}/configurazione-regole`));
    return handleResponse<ConfigurazioneResponse>(res);
}

export async function saveConfigurazioneRegole(
    agenteId: number,
    data: SaveConfigurazioneRequest,
): Promise<AgentMessageResponse> {
    const res = await authFetch(getApiUrl(`/${agenteId}/configurazione-regole`), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
    });
    return handleResponse<AgentMessageResponse>(res);
}
