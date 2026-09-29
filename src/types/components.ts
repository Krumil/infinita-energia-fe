import type { ReactNode } from "react";
import type { Agent, Rule, Tier, RuleConfiguration } from "./domain";
import type { CreateAgentRequest, UnmatchedSettlement } from "./api";
import type { CalculationDraft, DraftActions, DraftSummary } from "@/lib/calculationDraft";

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
    agent: Agent | null;
    agents: Agent[];
    rules: Rule[];
    tiers: Tier[];
    onSave: (data: CreateAgentRequest, customValues?: Array<{ regola_id: number; scaglione_id: number; valore: number }>) => Promise<string | null>;
    saving: boolean;
    onDelete?: () => void;
    deleting?: boolean;
    configuration: RuleConfiguration[];
    configLoading: boolean;
}

export interface AgentsTableProps {
    data: Agent[];
    onEdit: (agent: Agent) => void;
    onToggleStatistics: (agent: Agent, value: boolean) => Promise<void>;
}

export interface RulesTableProps {
    rules: Rule[];
    tiers: Tier[];
    onToggleEnabled: (rule: Rule, value: boolean) => Promise<void>;
    onUpdateDefault: (rule: Rule, value: number) => Promise<void>;
    onUpdateCustomerType: (rule: Rule, value: "residenziale" | "business" | null) => Promise<void>;
    onUpdateServiceType: (rule: Rule, value: "gas" | "luce" | null) => Promise<void>;
}

export interface CalculationResultsProps {
    month: string;
    draft: CalculationDraft;
    summary: DraftSummary;
    unmatched: UnmatchedSettlement[];
    agents: Agent[];
    // Absent while a recalculation loads, when the previous draft is shown read-only.
    editDraft?: DraftActions;
}
