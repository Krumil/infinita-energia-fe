import type { ReactNode } from "react";
import type { Agente, Regola, Scaglione, ConfigurazioneRegola } from "./domain";
import type { CreateAgentRequest, CalcoloResult } from "./api";

export interface FileDropzoneProps {
    accept: string;
    maxSizeMB: number;
    multiple?: boolean;
    onFiles: (files: File[]) => void;
    disabled?: boolean;
}

export interface KPICardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    description?: string;
    delay?: number;
}

export interface EmptyStateProps {
    message: string;
    icon?: ReactNode;
}

export interface AgentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent: Agente | null;
    agents: Agente[];
    regole: Regola[];
    scaglioni: Scaglione[];
    onSave: (data: CreateAgentRequest, customValori?: Array<{ regola_id: number; scaglione_id: number; valore: number }>) => Promise<unknown>;
    saving: boolean;
    onDelete?: () => void;
    deleting?: boolean;
    configurazione: ConfigurazioneRegola[];
    configLoading: boolean;
}

export interface AgentsTableProps {
    data: Agente[];
    onEdit: (agent: Agente) => void;
    onToggleStatistiche: (agent: Agente, value: boolean) => Promise<void>;
}

export interface RegoleTableProps {
    regole: Regola[];
    scaglioni: Scaglione[];
    onToggleUtilizzato: (regola: Regola, value: boolean) => Promise<void>;
    onUpdateDefault: (regola: Regola, value: number) => Promise<void>;
    onUpdateTipoUtenza: (regola: Regola, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateTipoServizio: (regola: Regola, value: "gas" | "luce" | null) => Promise<void>;
}

export interface CalcoloResultsProps {
    data: CalcoloResult;
    compDal?: string;
}
