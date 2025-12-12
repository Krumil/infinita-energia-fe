import { useState, useEffect, useCallback, useMemo } from "react";
import {
  getAgenti,
  createAgente,
  updateAgente,
  deleteAgente,
  uploadExcel,
  parseLiquidazioniExcel,
  importLiquidazioni,
  validateLiquidazioni,
  calcolaProvvigioni,
  convertToCalcoloInput,
  ApiError,
} from "./api";
import type {
  Agente,
  CreateAgentRequest,
  AppSettings,
  ImportExcelResponse,
  Liquidazione,
  CalcoloResult,
} from "./types";
import { useTranslation } from "./hooks/useTranslation";
import { ThemeToggle } from "./components/ThemeToggle";
import { LanguageToggle } from "./components/LanguageToggle";

// shadcn/ui imports
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Separator } from "@/components/ui/separator";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/hooks/use-toast";
import { Toaster } from "@/components/ui/toaster";

// Icons
import {
  Upload,
  Settings as SettingsIcon,
  FileSpreadsheet,
  AlertCircle,
  CheckCircle,
  Users,
  Calculator,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  Search,
  X,
  RefreshCw,
  Database,
  AlertTriangle,
  Loader2,
  MoreHorizontal,
  Pencil,
  Trash2,
  Plus,
  TrendingUp,
  Receipt,
} from "lucide-react";

// Utility functions
const SETTINGS_KEY = "app-settings";
const defaultSettings: AppSettings = {
  currency: "EUR",
  dateFormat: "DD/MM/YYYY",
  maxUploadSizeMB: 50,
};

function loadSettings(): AppSettings {
  try {
    const stored = localStorage.getItem(SETTINGS_KEY);
    return stored ? { ...defaultSettings, ...JSON.parse(stored) } : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

function saveSettingsToStorage(settings: AppSettings) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}

function formatCurrency(amount: number, currency: string = "EUR"): string {
  return new Intl.NumberFormat("it-IT", { style: "currency", currency }).format(amount);
}

// ========== Inner Components ==========

// FileDropzone Component - Ledger Style
type FileDropzoneProps = {
  accept: string;
  maxSizeMB: number;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  disabled?: boolean;
};

function FileDropzone({
  accept,
  maxSizeMB,
  multiple = false,
  onFiles,
  disabled = false,
}: FileDropzoneProps) {
  const [dragActive, setDragActive] = useState(false);
  const { toast } = useToast();
  const { t } = useTranslation();

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const validateFiles = (files: FileList | null): File[] => {
    if (!files) return [];
    const validFiles: File[] = [];
    const maxBytes = maxSizeMB * 1024 * 1024;

    Array.from(files).forEach((file) => {
      if (file.size > maxBytes) {
        toast({
          title: t("fileTooLarge"),
          description: `${file.name} ${t("exceeds")} ${maxSizeMB}MB`,
          variant: "destructive",
        });
        return;
      }
      const ext = file.name.split(".").pop()?.toLowerCase();
      const acceptedExts = accept.split(",").map((a) => a.trim().replace(".", ""));
      if (ext && !acceptedExts.includes(ext)) {
        toast({
          title: t("invalidFileType"),
          description: `${file.name} ${t("notAccepted")}`,
          variant: "destructive",
        });
        return;
      }
      validFiles.push(file);
    });

    return validFiles;
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (disabled) return;
    const files = validateFiles(e.dataTransfer.files);
    if (files.length > 0) onFiles(files);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    if (disabled) return;
    const files = validateFiles(e.target.files);
    if (files.length > 0) onFiles(files);
  };

  return (
    <div
      className={`dropzone ${dragActive ? "border-terracotta/60 bg-terracotta/5" : ""} ${
        disabled ? "opacity-50 cursor-not-allowed" : ""
      }`}
      data-drag-active={dragActive}
      onDragEnter={handleDrag}
      onDragLeave={handleDrag}
      onDragOver={handleDrag}
      onDrop={handleDrop}
    >
      <input
        type="file"
        accept={accept}
        multiple={multiple}
        onChange={handleChange}
        disabled={disabled}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        aria-label="File upload"
      />
      <FileSpreadsheet className="dropzone-icon" />
      <p className="font-display text-sm text-muted-foreground">
        <span className="text-terracotta font-medium">{t("clickToUpload")}</span>{" "}
        <span className="text-muted-foreground/70">{t("or")} {t("dragAndDrop")}</span>
      </p>
      <p className="font-mono text-xs text-muted-foreground/50 mt-2 uppercase tracking-wider">
        {accept} · {t("max")} {maxSizeMB}MB
      </p>
    </div>
  );
}

// KPI Card Component - Ledger Noir Style
type KPICardProps = {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  description?: string;
  delay?: number;
};

function KPICard({ title, value, icon, description, delay = 0 }: KPICardProps) {
  return (
    <div
      className="kpi-card p-6 opacity-0 animate-fade-up"
      style={{ animationDelay: `${delay}ms`, animationFillMode: "forwards" }}
    >
      <div className="flex items-start justify-between mb-4">
        <span className="kpi-label">{title}</span>
        <div className="text-terracotta/60">{icon}</div>
      </div>
      <div className="kpi-value">{value}</div>
      {description && (
        <p className="font-body text-sm text-muted-foreground mt-3 italic">{description}</p>
      )}
    </div>
  );
}

// Empty State Component
function EmptyState({ message, icon }: { message: string; icon?: React.ReactNode }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <div className="text-muted-foreground/30 mb-6">
        {icon || <AlertCircle className="h-16 w-16" />}
      </div>
      <p className="font-display text-lg text-muted-foreground italic">{message}</p>
    </div>
  );
}

// Settings Panel Component
type SettingsPanelProps = {
  settings: AppSettings;
  onChange: (settings: AppSettings) => void;
  onSave: () => void;
};

function SettingsPanel({ settings, onChange, onSave }: SettingsPanelProps) {
  const { t } = useTranslation();

  return (
    <div className="space-y-8">
      <div className="space-y-3">
        <Label htmlFor="currency" className="editorial-caps text-muted-foreground">
          {t("currency")}
        </Label>
        <Select
          value={settings.currency}
          onValueChange={(value) => onChange({ ...settings, currency: value })}
        >
          <SelectTrigger id="currency" className="font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="EUR">EUR (€)</SelectItem>
            <SelectItem value="USD">USD ($)</SelectItem>
            <SelectItem value="GBP">GBP (£)</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label htmlFor="dateFormat" className="editorial-caps text-muted-foreground">
          {t("dateFormat")}
        </Label>
        <Select
          value={settings.dateFormat}
          onValueChange={(value) => onChange({ ...settings, dateFormat: value })}
        >
          <SelectTrigger id="dateFormat" className="font-mono">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
            <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
            <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-3">
        <Label htmlFor="maxSize" className="editorial-caps text-muted-foreground">
          {t("maxUploadSize")}
        </Label>
        <Input
          id="maxSize"
          type="number"
          min={1}
          max={100}
          value={settings.maxUploadSizeMB}
          onChange={(e) =>
            onChange({
              ...settings,
              maxUploadSizeMB: parseInt(e.target.value) || 50,
            })
          }
          className="font-mono"
        />
      </div>

      <Button onClick={onSave} className="w-full btn-primary">
        <CheckCircle className="mr-2 h-4 w-4" /> {t("saveSettings")}
      </Button>
    </div>
  );
}

// Agent Dialog Component for Create/Edit
type AgentDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  agent: Agente | null;
  agents: Agente[];
  onSave: (data: CreateAgentRequest) => Promise<void>;
  saving: boolean;
};

function AgentDialog({ open, onOpenChange, agent, agents, onSave, saving }: AgentDialogProps) {
  const { t } = useTranslation();
  const isEdit = agent !== null;

  const [formData, setFormData] = useState<CreateAgentRequest>({
    nome_cognome: "",
    agente_padre: undefined,
    gettone_residenziale_standard: undefined,
    gettone_residenziale_bonus: undefined,
    gettone_residenziale_malus: undefined,
    rinnovo_residenziale: undefined,
    gettone_business_standard: undefined,
    gettone_business_bonus: undefined,
    gettone_business_malus: undefined,
    rinnovo_business: undefined,
    bonus_sdd: undefined,
  });

  useEffect(() => {
    if (open) {
      if (agent) {
        setFormData({
          nome_cognome: agent.nome_cognome,
          agente_padre: agent.agente_padre || undefined,
          gettone_residenziale_standard: agent.gettone_residenziale_standard ?? undefined,
          gettone_residenziale_bonus: agent.gettone_residenziale_bonus ?? undefined,
          gettone_residenziale_malus: agent.gettone_residenziale_malus ?? undefined,
          rinnovo_residenziale: agent.rinnovo_residenziale ?? undefined,
          gettone_business_standard: agent.gettone_business_standard ?? undefined,
          gettone_business_bonus: agent.gettone_business_bonus ?? undefined,
          gettone_business_malus: agent.gettone_business_malus ?? undefined,
          rinnovo_business: agent.rinnovo_business ?? undefined,
          bonus_sdd: agent.bonus_sdd ?? undefined,
        });
      } else {
        setFormData({
          nome_cognome: "",
          agente_padre: undefined,
          gettone_residenziale_standard: undefined,
          gettone_residenziale_bonus: undefined,
          gettone_residenziale_malus: undefined,
          rinnovo_residenziale: undefined,
          gettone_business_standard: undefined,
          gettone_business_bonus: undefined,
          gettone_business_malus: undefined,
          rinnovo_business: undefined,
          bonus_sdd: undefined,
        });
      }
    }
  }, [open, agent]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await onSave(formData);
  };

  const handleNumberChange = (field: keyof CreateAgentRequest, value: string) => {
    const num = value === "" ? undefined : parseFloat(value);
    setFormData((prev) => ({ ...prev, [field]: num }));
  };

  const availableParents = agents.filter((a) => !agent || a.id !== agent.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto dialog-ledger">
        <DialogHeader>
          <DialogTitle className="font-display text-2xl">
            {isEdit ? t("editAgent") : t("addAgent")}
          </DialogTitle>
          <DialogDescription className="font-body">
            {t("agentsListDesc")}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-8 pt-4">
          {/* Basic Info */}
          <div className="grid gap-6 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="nome_cognome" className="editorial-caps text-muted-foreground">
                {t("agentName")} *
              </Label>
              <Input
                id="nome_cognome"
                value={formData.nome_cognome}
                onChange={(e) => setFormData((prev) => ({ ...prev, nome_cognome: e.target.value }))}
                placeholder="Mario Rossi"
                required
                className="font-body"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="agente_padre" className="editorial-caps text-muted-foreground">
                {t("parentAgent")}
              </Label>
              <Select
                value={formData.agente_padre || "__none__"}
                onValueChange={(value) => setFormData((prev) => ({ ...prev, agente_padre: value === "__none__" ? undefined : value }))}
              >
                <SelectTrigger id="agente_padre" className="font-body">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">—</SelectItem>
                  {availableParents.map((a) => (
                    <SelectItem key={a.id} value={a.nome_cognome}>
                      {a.nome_cognome}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Residential Rates */}
          <div className="space-y-4">
            <h4 className="editorial-caps text-terracotta border-b border-terracotta/20 pb-2">
              Residenziale
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="gettone_residenziale_standard" className="text-xs text-muted-foreground">
                  {t("residentialStandard")}
                </Label>
                <Input
                  id="gettone_residenziale_standard"
                  type="number"
                  step="0.01"
                  value={formData.gettone_residenziale_standard ?? ""}
                  onChange={(e) => handleNumberChange("gettone_residenziale_standard", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gettone_residenziale_bonus" className="text-xs text-muted-foreground">
                  {t("residentialBonus")}
                </Label>
                <Input
                  id="gettone_residenziale_bonus"
                  type="number"
                  step="0.01"
                  value={formData.gettone_residenziale_bonus ?? ""}
                  onChange={(e) => handleNumberChange("gettone_residenziale_bonus", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gettone_residenziale_malus" className="text-xs text-muted-foreground">
                  {t("residentialMalus")}
                </Label>
                <Input
                  id="gettone_residenziale_malus"
                  type="number"
                  step="0.01"
                  value={formData.gettone_residenziale_malus ?? ""}
                  onChange={(e) => handleNumberChange("gettone_residenziale_malus", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rinnovo_residenziale" className="text-xs text-muted-foreground">
                  {t("residentialRenewal")}
                </Label>
                <Input
                  id="rinnovo_residenziale"
                  type="number"
                  step="0.01"
                  value={formData.rinnovo_residenziale ?? ""}
                  onChange={(e) => handleNumberChange("rinnovo_residenziale", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* Business Rates */}
          <div className="space-y-4">
            <h4 className="editorial-caps text-terracotta border-b border-terracotta/20 pb-2">
              Business
            </h4>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="gettone_business_standard" className="text-xs text-muted-foreground">
                  {t("businessStandard")}
                </Label>
                <Input
                  id="gettone_business_standard"
                  type="number"
                  step="0.01"
                  value={formData.gettone_business_standard ?? ""}
                  onChange={(e) => handleNumberChange("gettone_business_standard", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gettone_business_bonus" className="text-xs text-muted-foreground">
                  {t("businessBonus")}
                </Label>
                <Input
                  id="gettone_business_bonus"
                  type="number"
                  step="0.01"
                  value={formData.gettone_business_bonus ?? ""}
                  onChange={(e) => handleNumberChange("gettone_business_bonus", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gettone_business_malus" className="text-xs text-muted-foreground">
                  {t("businessMalus")}
                </Label>
                <Input
                  id="gettone_business_malus"
                  type="number"
                  step="0.01"
                  value={formData.gettone_business_malus ?? ""}
                  onChange={(e) => handleNumberChange("gettone_business_malus", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="rinnovo_business" className="text-xs text-muted-foreground">
                  {t("businessRenewal")}
                </Label>
                <Input
                  id="rinnovo_business"
                  type="number"
                  step="0.01"
                  value={formData.rinnovo_business ?? ""}
                  onChange={(e) => handleNumberChange("rinnovo_business", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          {/* SDD Bonus */}
          <div className="space-y-4">
            <h4 className="editorial-caps text-terracotta border-b border-terracotta/20 pb-2">
              Bonus
            </h4>
            <div className="grid gap-4 sm:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="bonus_sdd" className="text-xs text-muted-foreground">
                  {t("sddBonus")}
                </Label>
                <Input
                  id="bonus_sdd"
                  type="number"
                  step="0.01"
                  value={formData.bonus_sdd ?? ""}
                  onChange={(e) => handleNumberChange("bonus_sdd", e.target.value)}
                  placeholder="0.00"
                  className="font-mono"
                />
              </div>
            </div>
          </div>

          <DialogFooter className="pt-4 border-t border-border/50">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving} className="btn-ghost">
              {t("cancel")}
            </Button>
            <Button type="submit" disabled={saving || !formData.nome_cognome.trim()} className="btn-primary">
              {saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {t("saving")}
                </>
              ) : (
                <>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  {t("save")}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

// Agents Table Component - Ledger Style
type AgentsTableProps = {
  data: Agente[];
  currency: string;
  onEdit: (agent: Agente) => void;
  onDelete: (agent: Agente) => void;
};

function AgentsTable({ data, currency, onEdit, onDelete }: AgentsTableProps) {
  const { t } = useTranslation();
  const [sortKey, setSortKey] = useState<keyof Agente>("nome_cognome");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filter, setFilter] = useState("");
  const [page, setPage] = useState(0);
  const pageSize = 20;

  const filtered = useMemo(() => {
    if (!filter) return data;
    const lowerFilter = filter.toLowerCase();
    return data.filter(
      (item) =>
        item.nome_cognome.toLowerCase().includes(lowerFilter) ||
        item.agente_padre?.toLowerCase().includes(lowerFilter)
    );
  }, [data, filter]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const aVal = a[sortKey];
      const bVal = b[sortKey];
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;
      if (typeof aVal === "number" && typeof bVal === "number") {
        return sortDir === "asc" ? aVal - bVal : bVal - aVal;
      }
      const aStr = String(aVal);
      const bStr = String(bVal);
      return sortDir === "asc" ? aStr.localeCompare(bStr) : bStr.localeCompare(aStr);
    });
  }, [filtered, sortKey, sortDir]);

  const paginated = sorted.slice(page * pageSize, (page + 1) * pageSize);
  const totalPages = Math.ceil(sorted.length / pageSize);

  const handleSort = (key: keyof Agente) => {
    if (sortKey === key) {
      setSortDir(sortDir === "asc" ? "desc" : "asc");
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const formatRate = (val: number | null) => {
    if (val === null || val === undefined) return "—";
    return formatCurrency(val, currency);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground/50" />
          <Input
            placeholder={t("filterPlaceholder")}
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value);
              setPage(0);
            }}
            className="pl-10 font-mono text-sm"
          />
        </div>
        {filter && (
          <Button variant="ghost" size="sm" onClick={() => setFilter("")} className="btn-ghost">
            <X className="h-4 w-4" />
          </Button>
        )}
      </div>
      <div className="border border-border/50 overflow-x-auto">
        <table className="ledger-table">
          <thead>
            <tr>
              <th className="cursor-pointer hover:text-foreground" onClick={() => handleSort("nome_cognome")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      {t("agentName")} <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("agentNameTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="cursor-pointer hover:text-foreground" onClick={() => handleSort("agente_padre")}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      {t("parentAgent")} <ArrowUpDown className="h-3 w-3" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent>{t("parentAgentTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("residentialStandard")}</TooltipTrigger>
                  <TooltipContent>{t("residentialStandardTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("residentialBonus")}</TooltipTrigger>
                  <TooltipContent>{t("residentialBonusTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("residentialMalus")}</TooltipTrigger>
                  <TooltipContent>{t("residentialMalusTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("residentialRenewal")}</TooltipTrigger>
                  <TooltipContent>{t("residentialRenewalTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("businessStandard")}</TooltipTrigger>
                  <TooltipContent>{t("businessStandardTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("businessBonus")}</TooltipTrigger>
                  <TooltipContent>{t("businessBonusTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("businessMalus")}</TooltipTrigger>
                  <TooltipContent>{t("businessMalusTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("businessRenewal")}</TooltipTrigger>
                  <TooltipContent>{t("businessRenewalTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="text-right">
                <Tooltip>
                  <TooltipTrigger className="w-full text-right">{t("sddBonus")}</TooltipTrigger>
                  <TooltipContent>{t("sddBonusTooltip")}</TooltipContent>
                </Tooltip>
              </th>
              <th className="w-[70px]">{t("actions")}</th>
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={12} className="text-center py-12 font-display italic text-muted-foreground">
                  {t("noDataFound")}
                </td>
              </tr>
            ) : (
              paginated.map((row) => (
                <tr key={row.id}>
                  <td className="font-body font-medium">{row.nome_cognome}</td>
                  <td className="text-muted-foreground">{row.agente_padre || "—"}</td>
                  <td data-numeric className="text-right">{formatRate(row.gettone_residenziale_standard)}</td>
                  <td data-numeric className="text-right">{formatRate(row.gettone_residenziale_bonus)}</td>
                  <td data-numeric className="text-right">{formatRate(row.gettone_residenziale_malus)}</td>
                  <td data-numeric className="text-right">{formatRate(row.rinnovo_residenziale)}</td>
                  <td data-numeric className="text-right">{formatRate(row.gettone_business_standard)}</td>
                  <td data-numeric className="text-right">{formatRate(row.gettone_business_bonus)}</td>
                  <td data-numeric className="text-right">{formatRate(row.gettone_business_malus)}</td>
                  <td data-numeric className="text-right">{formatRate(row.rinnovo_business)}</td>
                  <td data-numeric className="text-right">{formatRate(row.bonus_sdd)}</td>
                  <td>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" className="h-8 w-8 p-0 hover:bg-secondary/50">
                          <span className="sr-only">Open menu</span>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(row)} className="font-display text-sm">
                          <Pencil className="mr-2 h-4 w-4" />
                          {t("editAgent")}
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => onDelete(row)}
                          className="text-destructive focus:text-destructive font-display text-sm"
                        >
                          <Trash2 className="mr-2 h-4 w-4" />
                          {t("deleteAgent")}
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="font-mono text-sm text-muted-foreground">
            {t("showing")} {page * pageSize + 1}–{Math.min((page + 1) * pageSize, sorted.length)} {t("of")} {sorted.length}
          </p>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn-ghost"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
              disabled={page === totalPages - 1}
              className="btn-ghost"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// Calculation Results Component - Ledger Style
type CalcoloResultsProps = {
  data: CalcoloResult;
  currency: string;
};

function CalcoloResults({ data, currency }: CalcoloResultsProps) {
  const { t } = useTranslation();
  const [expandedSeller, setExpandedSeller] = useState<string | null>(null);

  const sellers = Object.entries(data);
  const grandTotal = sellers.reduce((sum, [, val]) => sum + val.totale_provvigione, 0);

  return (
    <div className="space-y-8">
      {/* Grand Total Card */}
      <div className="kpi-card p-8 text-center">
        <span className="kpi-label">{t("totalCommission")}</span>
        <div className="kpi-value text-6xl mt-4">{formatCurrency(grandTotal, currency)}</div>
        <p className="font-body text-muted-foreground mt-4 italic">
          {sellers.length} {t("seller").toLowerCase()}(i)
        </p>
      </div>

      <div className="section-divider" />

      {/* Per-Seller Breakdown */}
      <div className="space-y-4">
        <h3 className="font-display text-xl">{t("summaryBySeller")}</h3>
        <div className="space-y-3">
          {sellers.map(([sellerName, sellerData]) => (
            <div key={sellerName} className="ledger-card overflow-hidden">
              <div
                className="flex items-center justify-between p-5 cursor-pointer hover:bg-secondary/20 transition-colors"
                onClick={() => setExpandedSeller(expandedSeller === sellerName ? null : sellerName)}
              >
                <span className="font-display text-lg">{sellerName}</span>
                <div className="flex items-center gap-4">
                  <span className="badge-ledger badge-accent font-mono text-lg">
                    {formatCurrency(sellerData.totale_provvigione, currency)}
                  </span>
                  <ChevronRight
                    className={`h-5 w-5 text-muted-foreground transition-transform duration-200 ${
                      expandedSeller === sellerName ? "rotate-90" : ""
                    }`}
                  />
                </div>
              </div>
              {expandedSeller === sellerName && (
                <div className="border-t border-border/30 p-5 bg-secondary/10">
                  <table className="ledger-table">
                    <thead>
                      <tr>
                        <th>{t("rule")}</th>
                        <th className="text-right">{t("quantity")}</th>
                        <th className="text-right">{t("amount")}</th>
                        <th className="text-right">{t("commission")}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {sellerData.dati_provvigione.map((item, idx) => (
                        <tr key={idx}>
                          <td className="font-body">{item.Regola}</td>
                          <td data-numeric className="text-right">{item.Quantita}</td>
                          <td data-numeric className="text-right">{formatCurrency(item.Importo, currency)}</td>
                          <td data-numeric className="text-right text-terracotta font-semibold">
                            {formatCurrency(item.provvigione, currency)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ========== Main App Component ==========

export default function App() {
  const { t } = useTranslation();
  const { toast } = useToast();

  // State: Tab navigation
  const [activeTab, setActiveTab] = useState<string>("dashboard");

  // State: Settings
  const [settings, setSettings] = useState<AppSettings>(loadSettings);
  const [settingsSheetOpen, setSettingsSheetOpen] = useState(false);

  // State: Agents
  const [agents, setAgents] = useState<Agente[]>([]);
  const [agentsLoading, setAgentsLoading] = useState(false);
  const [agentDialogOpen, setAgentDialogOpen] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agente | null>(null);
  const [agentSaving, setAgentSaving] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingAgent, setDeletingAgent] = useState<Agente | null>(null);

  // State: Orders Import
  const [ordersImporting, setOrdersImporting] = useState(false);
  const [ordersProgress, setOrdersProgress] = useState(0);
  const [ordersResult, setOrdersResult] = useState<ImportExcelResponse | null>(null);

  // State: Liquidations
  const [liquidazioniParsed, setLiquidazioniParsed] = useState<Liquidazione[]>([]);
  const [liquidazioniValid, setLiquidazioniValid] = useState<Liquidazione[]>([]);
  const [liquidazioniInvalid, setLiquidazioniInvalid] = useState(0);
  const [liquidazioniImporting, setLiquidazioniImporting] = useState(false);
  const [liquidazioniImported, setLiquidazioniImported] = useState(0);

  // State: Calculation
  const [calcoloData, setCalcoloData] = useState<Liquidazione[]>([]);
  const [calcoloResult, setCalcoloResult] = useState<CalcoloResult | null>(null);
  const [calcoloLoading, setCalcoloLoading] = useState(false);
  const [unmatchedAgents, setUnmatchedAgents] = useState<Array<{ name: string; count: number }>>([]);

  // State: Last action for footer
  const [lastAction, setLastAction] = useState<string | null>(null);

  // Sync activeTab with hash
  useEffect(() => {
    const hash = window.location.hash.replace("#", "") || "dashboard";
    setActiveTab(hash);

    const handleHashChange = () => {
      const newHash = window.location.hash.replace("#", "") || "dashboard";
      setActiveTab(newHash);
    };

    window.addEventListener("hashchange", handleHashChange);
    return () => window.removeEventListener("hashchange", handleHashChange);
  }, []);

  // Load agents on mount
  useEffect(() => {
    loadAgents();
  }, []);

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    window.location.hash = value;
  };

  // Settings handlers
  const handleSaveSettings = useCallback(() => {
    saveSettingsToStorage(settings);
    setSettingsSheetOpen(false);
    toast({
      title: t("settingsSaved"),
      description: t("preferencesUpdated"),
    });
  }, [settings, toast, t]);

  // Agents handlers
  const loadAgents = useCallback(async () => {
    setAgentsLoading(true);
    try {
      const data = await getAgenti();
      // Debug: Check if agents have id field
      const agentsWithoutId = data.filter(a => a.id == null);
      if (agentsWithoutId.length > 0) {
        console.warn("Agents missing id field:", agentsWithoutId);
      }
      setAgents(data);
    } catch (error) {
      const errorMsg = error instanceof ApiError ? error.message : t("error");
      toast({
        title: t("error"),
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setAgentsLoading(false);
    }
  }, [toast, t]);

  const handleOpenCreateDialog = useCallback(() => {
    setEditingAgent(null);
    setAgentDialogOpen(true);
  }, []);

  const handleOpenEditDialog = useCallback((agent: Agente) => {
    setEditingAgent(agent);
    setAgentDialogOpen(true);
  }, []);

  const handleOpenDeleteDialog = useCallback((agent: Agente) => {
    setDeletingAgent(agent);
    setDeleteDialogOpen(true);
  }, []);

  const handleSaveAgent = useCallback(
    async (data: CreateAgentRequest) => {
      setAgentSaving(true);
      try {
        if (editingAgent && editingAgent.id != null) {
          await updateAgente(editingAgent.id, data);
          toast({
            title: t("success"),
            description: t("agentUpdated"),
          });
          setLastAction(t("agentUpdated"));
        } else if (editingAgent && editingAgent.id == null) {
          // Agent object exists but ID is missing - this shouldn't happen
          console.error("Agent ID is missing:", editingAgent);
          toast({
            title: t("error"),
            description: "Agent ID is missing. Cannot update.",
            variant: "destructive",
          });
          return;
        } else {
          await createAgente(data);
          toast({
            title: t("success"),
            description: t("agentCreated"),
          });
          setLastAction(t("agentCreated"));
        }
        setAgentDialogOpen(false);
        await loadAgents();
      } catch (error) {
        const errorMsg = error instanceof ApiError ? error.message : t("error");
        toast({
          title: t("error"),
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setAgentSaving(false);
      }
    },
    [editingAgent, loadAgents, toast, t]
  );

  const handleDeleteAgent = useCallback(async () => {
    if (!deletingAgent) return;

    try {
      await deleteAgente(deletingAgent.id);
      toast({
        title: t("success"),
        description: t("agentDeleted"),
      });
      setLastAction(t("agentDeleted"));
      setDeleteDialogOpen(false);
      setDeletingAgent(null);
      await loadAgents();
    } catch (error) {
      const errorMsg = error instanceof ApiError ? error.message : t("error");
      toast({
        title: t("error"),
        description: errorMsg,
        variant: "destructive",
      });
    }
  }, [deletingAgent, loadAgents, toast, t]);

  // Orders import handlers
  const handleOrdersUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      setOrdersImporting(true);
      setOrdersProgress(0);
      setOrdersResult(null);

      const progressInterval = setInterval(() => {
        setOrdersProgress((p) => Math.min(p + 5, 90));
      }, 500);

      try {
        const result = await uploadExcel(file);
        clearInterval(progressInterval);
        setOrdersProgress(100);
        setOrdersResult(result);
        setLastAction(t("ordersImported"));
        toast({
          title: t("uploadSuccessful"),
          description: result.message,
        });
      } catch (error) {
        clearInterval(progressInterval);
        const errorMsg = error instanceof ApiError ? error.message : t("uploadFailed");
        toast({
          title: t("uploadFailed"),
          description: errorMsg,
          variant: "destructive",
        });
      } finally {
        setOrdersImporting(false);
        setTimeout(() => setOrdersProgress(0), 1000);
      }
    },
    [toast, t]
  );

  // Liquidations handlers
  const handleLiquidazioniUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      try {
        const parsed = await parseLiquidazioniExcel(file);
        const { valid, invalid } = validateLiquidazioni(parsed);
        setLiquidazioniParsed(parsed);
        setLiquidazioniValid(valid);
        setLiquidazioniInvalid(invalid);
        toast({
          title: t("uploadSuccessful"),
          description: `${t("parsedRecords")}: ${parsed.length}`,
        });
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : t("error");
        toast({
          title: t("uploadFailed"),
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [toast, t]
  );

  const handleLiquidazioniImport = useCallback(async () => {
    if (liquidazioniValid.length === 0) return;

    setLiquidazioniImporting(true);
    try {
      const result = await importLiquidazioni(liquidazioniValid);
      if (result.success) {
        setLiquidazioniImported(liquidazioniValid.length);
        setLastAction(`${t("liquidationsImported")}: ${liquidazioniValid.length}`);
        toast({
          title: t("success"),
          description: result.message,
        });
        setLiquidazioniParsed([]);
        setLiquidazioniValid([]);
        setLiquidazioniInvalid(0);
      } else {
        toast({
          title: t("error"),
          description: result.error || result.message,
          variant: "destructive",
        });
      }
    } catch (error) {
      const errorMsg = error instanceof ApiError ? error.message : t("error");
      toast({
        title: t("error"),
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setLiquidazioniImporting(false);
    }
  }, [liquidazioniValid, toast, t]);

  // Calculation handlers
  const handleCalcoloUpload = useCallback(
    async (files: File[]) => {
      const file = files[0];
      if (!file) return;

      try {
        const parsed = await parseLiquidazioniExcel(file);
        setCalcoloData(parsed);
        setCalcoloResult(null);

        // Validate agents against loaded agents list
        const agentNames = new Set(agents.map((a) => a.nome_cognome.toLowerCase().trim()));
        const venditoreCounts = new Map<string, number>();

        // Count records per venditore
        for (const record of parsed) {
          const venditore = record.venditore?.trim() || "";
          if (venditore) {
            venditoreCounts.set(venditore, (venditoreCounts.get(venditore) || 0) + 1);
          }
        }

        // Find unmatched agents
        const unmatched: Array<{ name: string; count: number }> = [];
        for (const [venditore, count] of venditoreCounts) {
          if (!agentNames.has(venditore.toLowerCase())) {
            unmatched.push({ name: venditore, count });
          }
        }

        // Sort by count descending
        unmatched.sort((a, b) => b.count - a.count);
        setUnmatchedAgents(unmatched);

        if (unmatched.length > 0) {
          toast({
            title: t("unmatchedAgentsWarning"),
            description: `${unmatched.length} ${t("unmatchedAgentsCount")}`,
            variant: "destructive",
          });
        } else if (agents.length > 0) {
          toast({
            title: t("uploadSuccessful"),
            description: `${t("parsedRecords")}: ${parsed.length}. ${t("allAgentsMatched")}`,
          });
        } else {
          toast({
            title: t("uploadSuccessful"),
            description: `${t("parsedRecords")}: ${parsed.length}. ${t("loadAgentsFirst")}`,
          });
        }
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : t("error");
        toast({
          title: t("uploadFailed"),
          description: errorMsg,
          variant: "destructive",
        });
      }
    },
    [toast, t, agents]
  );

  const handleCalculate = useCallback(async () => {
    if (calcoloData.length === 0) return;

    setCalcoloLoading(true);
    setCalcoloResult(null);

    try {
      const inputData = convertToCalcoloInput(calcoloData);
      const result = await calcolaProvvigioni(inputData);
      setCalcoloResult(result);
      setLastAction(t("calculateCommissions"));
      toast({
        title: t("success"),
        description: t("calculationResults"),
      });
    } catch (error) {
      const errorMsg = error instanceof ApiError ? error.message : t("error");
      toast({
        title: t("error"),
        description: errorMsg,
        variant: "destructive",
      });
    } finally {
      setCalcoloLoading(false);
    }
  }, [calcoloData, toast, t]);

  // Dashboard KPIs
  const dashboardKPIs = useMemo(() => {
    const totalAgents = agents.length;
    const totalCommissions = calcoloResult
      ? Object.values(calcoloResult).reduce((sum, v) => sum + v.totale_provvigione, 0)
      : 0;
    const ordersCount = ordersResult
      ? ordersResult.details.ordini.nuovi + ordersResult.details.ordini.aggiornati
      : 0;
    const liquidationsCount = liquidazioniImported;

    return { totalAgents, totalCommissions, ordersCount, liquidationsCount };
  }, [agents, calcoloResult, ordersResult, liquidazioniImported]);

  return (
    <TooltipProvider>
      <div className="min-h-screen flex flex-col">
        {/* Header - Ledger Noir Style */}
        <header className="ledger-header sticky top-0 z-50">
          <div className="max-w-[1400px] mx-auto px-8 py-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <img
                  src="/logo.png"
                  alt="Logo"
                  className="h-10 w-10 object-contain"
                />
                <div className="w-px h-8 bg-terracotta" />
                <div>
                  <h1 className="font-display text-2xl tracking-tight">
                    {t("appTitle")}
                  </h1>
                  <p className="font-mono text-xs text-muted-foreground uppercase tracking-[0.2em]">
                    Sistema Provvigionale
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <LanguageToggle />
                <ThemeToggle />
                <Sheet open={settingsSheetOpen} onOpenChange={setSettingsSheetOpen}>
                  <SheetTrigger asChild>
                    <Button variant="ghost" size="icon" className="btn-ghost h-10 w-10">
                      <SettingsIcon className="h-5 w-5" />
                    </Button>
                  </SheetTrigger>
                  <SheetContent className="border-l-terracotta/20">
                    <SheetHeader>
                      <SheetTitle className="font-display text-xl">{t("settings")}</SheetTitle>
                      <SheetDescription className="font-body">{t("configurePreferences")}</SheetDescription>
                    </SheetHeader>
                    <Separator className="my-6" />
                    <SettingsPanel
                      settings={settings}
                      onChange={setSettings}
                      onSave={handleSaveSettings}
                    />
                  </SheetContent>
                </Sheet>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 max-w-[1400px] mx-auto px-8 py-10 w-full">
          <Tabs
            value={activeTab}
            onValueChange={handleTabChange}
            className="space-y-10 ledger-tabs"
          >
            <TabsList className="flex justify-center gap-8 bg-transparent border-b border-border/30 pb-0 h-auto">
              <TabsTrigger value="dashboard" className="data-[state=active]:shadow-none">
                {t("dashboard")}
              </TabsTrigger>
              <TabsTrigger value="agenti" className="data-[state=active]:shadow-none">
                {t("agenti")}
              </TabsTrigger>
              <TabsTrigger value="liquidazioni" className="data-[state=active]:shadow-none">
                {t("liquidazioni")}
              </TabsTrigger>
              <TabsTrigger value="calcolo" className="data-[state=active]:shadow-none">
                {t("calcolo")}
              </TabsTrigger>
            </TabsList>

            {/* Dashboard Tab */}
            <TabsContent value="dashboard" className="space-y-10">
              {/* KPI Grid */}
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <KPICard
                  title={t("totalAgents")}
                  value={dashboardKPIs.totalAgents}
                  icon={<Users className="h-6 w-6" />}
                  description={t("activeCommissionAgents")}
                  delay={100}
                />
                <KPICard
                  title={t("totalCommissions")}
                  value={formatCurrency(dashboardKPIs.totalCommissions, settings.currency)}
                  icon={<TrendingUp className="h-6 w-6" />}
                  description={t("currentPeriodTotal")}
                  delay={200}
                />
                <KPICard
                  title={t("ordersImported")}
                  value={dashboardKPIs.ordersCount}
                  icon={<Database className="h-6 w-6" />}
                  description={t("recordsProcessed")}
                  delay={300}
                />
                <KPICard
                  title={t("liquidationsImported")}
                  value={dashboardKPIs.liquidationsCount}
                  icon={<Receipt className="h-6 w-6" />}
                  description={t("recordsProcessed")}
                  delay={400}
                />
              </div>

              <div className="section-divider" />

              {/* Quick Actions & Activity */}
              <div className="grid gap-8 lg:grid-cols-5">
                <div className="lg:col-span-3 space-y-4">
                  <h2 className="font-display text-lg">{t("quickActions")}</h2>
                  <div className="space-y-3">
                    <div className="action-card" onClick={() => handleTabChange("agenti")}>
                      <div className="action-card-icon">
                        <Users className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-display">{t("viewAgents")}</span>
                        <p className="text-sm text-muted-foreground font-body">{t("agentsListDesc")}</p>
                      </div>
                    </div>
                    <div className="action-card" onClick={() => handleTabChange("liquidazioni")}>
                      <div className="action-card-icon">
                        <Upload className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-display">{t("importLiquidations")}</span>
                        <p className="text-sm text-muted-foreground font-body">{t("importLiquidationsDesc")}</p>
                      </div>
                    </div>
                    <div className="action-card" onClick={() => handleTabChange("calcolo")}>
                      <div className="action-card-icon">
                        <Calculator className="h-5 w-5" />
                      </div>
                      <div>
                        <span className="font-display">{t("calculateCommissions")}</span>
                        <p className="text-sm text-muted-foreground font-body">{t("calculateCommissionsDesc")}</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-2 space-y-4">
                  <h2 className="font-display text-lg">{t("recentActivity")}</h2>
                  <div className="ledger-card p-6 min-h-[200px] flex items-center justify-center">
                    {lastAction ? (
                      <div className="flex items-center gap-4">
                        <div className="w-2 h-2 rounded-full bg-sage animate-pulse-soft" />
                        <span className="font-body">{lastAction}</span>
                      </div>
                    ) : (
                      <p className="font-display text-muted-foreground/50 italic">{t("noActivity")}</p>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Agenti Tab */}
            <TabsContent value="agenti" className="space-y-8">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-display text-2xl">{t("agentsList")}</h2>
                  <p className="font-body text-muted-foreground mt-1">{t("agentsListDesc")}</p>
                </div>
                <div className="flex items-center gap-3">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={loadAgents}
                    disabled={agentsLoading}
                    className="btn-ghost"
                  >
                    {agentsLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4" />
                    )}
                    <span className="ml-2">{t("refreshAgents")}</span>
                  </Button>
                  <Button onClick={handleOpenCreateDialog} className="btn-primary">
                    <Plus className="h-4 w-4 mr-2" />
                    {t("addAgent")}
                  </Button>
                </div>
              </div>

              <div className="ledger-card p-6">
                {agentsLoading && agents.length === 0 ? (
                  <div className="flex items-center justify-center py-16">
                    <Loader2 className="h-8 w-8 animate-spin text-terracotta" />
                  </div>
                ) : agents.length === 0 ? (
                  <EmptyState
                    message={t("noAgentsYet")}
                    icon={<Users className="h-16 w-16" />}
                  />
                ) : (
                  <AgentsTable
                    data={agents}
                    currency={settings.currency}
                    onEdit={handleOpenEditDialog}
                    onDelete={handleOpenDeleteDialog}
                  />
                )}
              </div>

              <AgentDialog
                open={agentDialogOpen}
                onOpenChange={setAgentDialogOpen}
                agent={editingAgent}
                agents={agents}
                onSave={handleSaveAgent}
                saving={agentSaving}
              />

              <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
                <AlertDialogContent className="dialog-ledger">
                  <AlertDialogHeader>
                    <AlertDialogTitle className="font-display text-xl">{t("deleteAgentConfirm")}</AlertDialogTitle>
                    <AlertDialogDescription className="font-body">
                      {t("deleteAgentDescription")}
                      {deletingAgent && (
                        <span className="block mt-3 font-display text-foreground text-lg">
                          {deletingAgent.nome_cognome}
                        </span>
                      )}
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel className="btn-ghost">{t("cancel")}</AlertDialogCancel>
                    <AlertDialogAction
                      onClick={handleDeleteAgent}
                      className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                    >
                      {t("deleteAgent")}
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </TabsContent>

            {/* Liquidazioni Tab */}
            <TabsContent value="liquidazioni" className="space-y-8">
              <div className="grid gap-8 lg:grid-cols-2">
                {/* Orders Import */}
                <div className="space-y-4">
                  <div>
                    <h2 className="font-display text-xl">{t("importOrdersTitle")}</h2>
                    <p className="font-body text-muted-foreground mt-1">{t("importOrdersDesc")}</p>
                  </div>
                  <div className="ledger-card p-6 space-y-6">
                    <FileDropzone
                      accept=".xlsx,.xls"
                      maxSizeMB={settings.maxUploadSizeMB}
                      onFiles={handleOrdersUpload}
                      disabled={ordersImporting}
                    />
                    {ordersImporting && (
                      <div className="space-y-3">
                        <div className="progress-ledger">
                          <div role="progressbar" style={{ width: `${ordersProgress}%` }} />
                        </div>
                        <p className="font-mono text-sm text-center text-muted-foreground">
                          {t("processing")} {ordersProgress}%
                        </p>
                      </div>
                    )}
                    {ordersResult && (
                      <Alert className="bg-sage/10 border-sage/30">
                        <CheckCircle className="h-4 w-4 text-sage" />
                        <AlertTitle className="font-display">{t("ordersImportResult")}</AlertTitle>
                        <AlertDescription className="font-mono text-sm mt-3 grid grid-cols-2 gap-2">
                          <div>{t("clients")}: <span className="text-foreground">{ordersResult.details.clienti.nuovi}</span> {t("newRecords")}</div>
                          <div>{t("products")}: <span className="text-foreground">{ordersResult.details.prodotti.nuovi}</span> {t("newRecords")}</div>
                          <div>{t("technicalData")}: <span className="text-foreground">{ordersResult.details.dati_tecnici.nuovi}</span> {t("newRecords")}</div>
                          <div>{t("orders")}: <span className="text-foreground">{ordersResult.details.ordini.nuovi}</span> {t("newRecords")}</div>
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </div>

                {/* Liquidations Import */}
                <div className="space-y-4">
                  <div>
                    <h2 className="font-display text-xl">{t("importLiquidationsTitle")}</h2>
                    <p className="font-body text-muted-foreground mt-1">{t("importLiquidationsDesc")}</p>
                  </div>
                  <div className="ledger-card p-6 space-y-6">
                    <FileDropzone
                      accept=".xlsx,.xls"
                      maxSizeMB={settings.maxUploadSizeMB}
                      onFiles={handleLiquidazioniUpload}
                      disabled={liquidazioniImporting}
                    />
                    {liquidazioniParsed.length > 0 && (
                      <>
                        <Alert className="bg-secondary/50 border-border/50">
                          <AlertCircle className="h-4 w-4" />
                          <AlertTitle className="font-display">{t("liquidationsPreview")}</AlertTitle>
                          <AlertDescription className="font-mono text-sm mt-2">
                            <p>{t("validRecords")}: <span className="text-foreground">{liquidazioniValid.length}</span></p>
                            {liquidazioniInvalid > 0 && (
                              <p className="text-terracotta">{t("invalidRecords")}: {liquidazioniInvalid}</p>
                            )}
                          </AlertDescription>
                        </Alert>
                        <Alert variant="destructive" className="bg-terracotta/10 border-terracotta/30 text-foreground">
                          <AlertTriangle className="h-4 w-4 text-terracotta" />
                          <AlertDescription className="font-body text-sm">{t("warningDuplicates")}</AlertDescription>
                        </Alert>
                        <Button
                          onClick={handleLiquidazioniImport}
                          disabled={liquidazioniImporting || liquidazioniValid.length === 0}
                          className="w-full btn-primary"
                        >
                          {liquidazioniImporting ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Upload className="mr-2 h-4 w-4" />
                          )}
                          {t("proceedWithImport")} ({liquidazioniValid.length})
                        </Button>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </TabsContent>

            {/* Calcolo Tab */}
            <TabsContent value="calcolo" className="space-y-8">
              <div>
                <h2 className="font-display text-2xl">{t("calculateCommissionsTitle")}</h2>
                <p className="font-body text-muted-foreground mt-1">{t("calculateCommissionsDesc")}</p>
              </div>

              <div className="ledger-card p-6 space-y-6">
                <FileDropzone
                  accept=".xlsx,.xls"
                  maxSizeMB={settings.maxUploadSizeMB}
                  onFiles={handleCalcoloUpload}
                  disabled={calcoloLoading}
                />
                {calcoloData.length > 0 && (
                  <div className="flex items-center justify-between p-4 bg-secondary/30 border border-border/30">
                    <span className="font-mono text-sm">
                      {t("parsedRecords")}: <span className="text-foreground font-semibold">{calcoloData.length}</span>
                    </span>
                    <Button onClick={handleCalculate} disabled={calcoloLoading} className="btn-primary">
                      {calcoloLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Calculator className="mr-2 h-4 w-4" />
                      )}
                      {t("calculateCommissions")}
                    </Button>
                  </div>
                )}
                {calcoloLoading && (
                  <div className="flex items-center justify-center py-12 gap-3">
                    <Loader2 className="h-6 w-6 animate-spin text-terracotta" />
                    <span className="font-display">{t("calculating")}</span>
                  </div>
                )}
              </div>

              {/* Unmatched Agents Warning */}
              {unmatchedAgents.length > 0 && calcoloData.length > 0 && (
                <Alert variant="destructive" className="border-amber-500/50 bg-amber-50 dark:bg-amber-950/20">
                  <AlertTriangle className="h-5 w-5 text-amber-600" />
                  <AlertTitle className="text-amber-800 dark:text-amber-400 font-display">
                    {t("unmatchedAgentsWarning")}
                  </AlertTitle>
                  <AlertDescription className="text-amber-700 dark:text-amber-300">
                    <p className="mb-3 font-body">{t("unmatchedAgentsDesc")}</p>
                    <div className="bg-white/50 dark:bg-black/20 rounded border border-amber-200 dark:border-amber-800 p-3 max-h-48 overflow-y-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b border-amber-200 dark:border-amber-800">
                            <th className="text-left py-1 font-display">{t("seller")}</th>
                            <th className="text-right py-1 font-display">{t("recordsAffected")}</th>
                          </tr>
                        </thead>
                        <tbody className="font-mono">
                          {unmatchedAgents.map((agent, idx) => (
                            <tr key={idx} className="border-b border-amber-100 dark:border-amber-900 last:border-0">
                              <td className="py-1.5">{agent.name}</td>
                              <td className="text-right py-1.5">{agent.count}</td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot>
                          <tr className="border-t border-amber-200 dark:border-amber-800 font-semibold">
                            <td className="py-1.5">{unmatchedAgents.length} {t("unmatchedAgentsCount")}</td>
                            <td className="text-right py-1.5">
                              {unmatchedAgents.reduce((sum, a) => sum + a.count, 0)} {t("recordsAffected")}
                            </td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </AlertDescription>
                </Alert>
              )}

              {calcoloResult && Object.keys(calcoloResult).length > 0 ? (
                <CalcoloResults data={calcoloResult} currency={settings.currency} />
              ) : (
                !calcoloLoading &&
                calcoloData.length === 0 && (
                  <EmptyState
                    message={t("noCalculationYet")}
                    icon={<Calculator className="h-16 w-16" />}
                  />
                )
              )}
            </TabsContent>
          </Tabs>
        </main>

        {/* Footer - Ledger Style */}
        <footer className="border-t border-border/30 py-6">
          <div className="max-w-[1400px] mx-auto px-8">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-6">
                {lastAction && (
                  <Tooltip>
                    <TooltipTrigger>
                      <span className="flex items-center gap-2 font-mono text-sm text-muted-foreground">
                        <div className="w-2 h-2 rounded-full bg-sage" />
                        {t("lastAction")}: {lastAction}
                      </span>
                    </TooltipTrigger>
                    <TooltipContent>{lastAction}</TooltipContent>
                  </Tooltip>
                )}
              </div>
              <span className="font-mono text-xs text-muted-foreground/50 uppercase tracking-wider">
                {t("version")} 2.0.0
              </span>
            </div>
          </div>
        </footer>

        <Toaster />
      </div>
    </TooltipProvider>
  );
}
