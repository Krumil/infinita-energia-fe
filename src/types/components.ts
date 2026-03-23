import type { ReactNode } from "react";
import type { Agente, Regola, ConfigurazioneRegola } from "./domain";
import type { CreateAgentRequest, CalcoloResult } from "./api";

// === FILE DROPZONE ===

export interface FileDropzoneProps {
    accept: string;
    maxSizeMB: number;
    multiple?: boolean;
    onFiles: (files: File[]) => void;
    disabled?: boolean;
}

// === KPI CARD ===

export interface KPICardProps {
    title: string;
    value: string | number;
    icon: ReactNode;
    description?: string;
    delay?: number;
}

// === EMPTY STATE ===

export interface EmptyStateProps {
    message: string;
    icon?: ReactNode;
}

// === SETTINGS PANEL ===

export interface SettingsPanelProps {
    onSave: () => void;
}

// === AGENT DIALOG ===

export interface AgentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent: Agente | null;
    agents: Agente[];
    onSave: (data: CreateAgentRequest, customValori?: Array<{ regola_id: number; tasso_id: number; valore: number }>) => Promise<void>;
    saving: boolean;
    onDelete?: () => void;
    deleting?: boolean;
    configurazione: ConfigurazioneRegola[];
    configLoading: boolean;
}

// === AGENTS TABLE ===

export interface AgentsTableProps {
    data: Agente[];
    onEdit: (agent: Agente) => void;
}

// === REGOLE TABLE ===

export interface RegoleTableProps {
    regole: Regola[];
    onToggleUtilizzato: (regola: Regola, value: boolean) => Promise<void>;
    onUpdateDefault: (regola: Regola, value: number) => Promise<void>;
    onUpdateTipoUtenza: (regola: Regola, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateTipoServizio: (regola: Regola, value: "gas" | "luce" | null) => Promise<void>;
}

// === CALCOLO RESULTS ===

export interface CalcoloResultsProps {
    data: CalcoloResult;
    compDal?: string;
}
