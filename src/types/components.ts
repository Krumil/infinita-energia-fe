import type { ReactNode } from "react";
import type { Agente, AppSettings } from "./domain";
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
    settings: AppSettings;
    onChange: (settings: AppSettings) => void;
    onSave: () => void;
}

// === AGENT DIALOG ===

export interface AgentDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    agent: Agente | null;
    agents: Agente[];
    onSave: (data: CreateAgentRequest) => Promise<void>;
    saving: boolean;
}

// === AGENTS TABLE ===

export interface AgentsTableProps {
    data: Agente[];
    onEdit: (agent: Agente) => void;
    onDelete: (agent: Agente) => void;
    onToggleStatistiche: (agent: Agente, value: boolean) => Promise<void>;
}

// === CALCOLO RESULTS ===

export interface CalcoloResultsProps {
    data: CalcoloResult;
    compDal?: string;
}
