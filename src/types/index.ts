// Domain types
export type { Agente, Regola, Scaglione, Liquidazione, AppSettings, ConfigurazioneRegola, ConfigurazioneResponse } from "./domain";

// API types
export type {
    CreateAgentRequest,
    AgentCreateResponse,
    AgentMessageResponse,
    UpdateRegolaRequest,
    UpdateRegolaResponse,
    ImportRegoleResponse,
    UpdateScaglioneRequest,
    ImportScaglioniResponse,
    SaveConfigurazioneRequest,
    ImportExcelResponse,
    ImportLiquidazioniResponse,
    ProvvigioneData,
    CalcoloVenditoreResult,
    CalcoloResult,
    CalcoloInput,
    PendingOrder,
    PendingOrdersResponse,
    DashboardContrattiTotali,
    DashboardProvvigioniTotali,
    DashboardMeseContratti,
    DashboardContrattiMensili,
    DashboardMeseProvvigioni,
    DashboardProvvigioniMensili,
    DashboardProdottoContratti,
    DashboardContrattiPerProdotto,
} from "./api";

// Component types
export type {
    FileDropzoneProps,
    KPICardProps,
    EmptyStateProps,
    SettingsPanelProps,
    AgentDialogProps,
    AgentsTableProps,
    RegoleTableProps,
    CalcoloResultsProps,
} from "./components";
