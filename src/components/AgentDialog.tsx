import { useState, useEffect } from "react";
import { Loader2, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { useTranslation } from "@/hooks/useTranslation";
import type { AgentDialogProps } from "@/types/components";
import type { CreateAgentRequest } from "@/types/api";

export function AgentDialog({ open, onOpenChange, agent, agents, onSave, saving }: AgentDialogProps) {
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

    // Sync form data with agent prop when dialog opens
    // This is intentional - we need to synchronize with the external "open" and "agent" props
    useEffect(() => {
        if (!open) return;

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
                    <DialogDescription className="font-body">{t("agentsListDesc")}</DialogDescription>
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
                                onValueChange={(value) =>
                                    setFormData((prev) => ({
                                        ...prev,
                                        agente_padre: value === "__none__" ? undefined : value,
                                    }))
                                }
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
                        <h4 className="editorial-caps text-energia-accent border-b border-energia-accent/20 pb-2">
                            Residenziale
                        </h4>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                            <div className="space-y-2">
                                <Label
                                    htmlFor="gettone_residenziale_standard"
                                    className="text-xs text-muted-foreground"
                                >
                                    {t("residentialStandard")}
                                </Label>
                                <Input
                                    id="gettone_residenziale_standard"
                                    type="number"
                                    step="0.01"
                                    value={formData.gettone_residenziale_standard ?? ""}
                                    onChange={(e) =>
                                        handleNumberChange("gettone_residenziale_standard", e.target.value)
                                    }
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
                        <h4 className="editorial-caps text-energia-accent border-b border-energia-accent/20 pb-2">
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
                        <h4 className="editorial-caps text-energia-accent border-b border-energia-accent/20 pb-2">
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
                        <Button
                            type="button"
                            variant="outline"
                            onClick={() => onOpenChange(false)}
                            disabled={saving}
                            className="btn-ghost"
                        >
                            {t("cancel")}
                        </Button>
                        <Button
                            type="submit"
                            disabled={saving || !formData.nome_cognome.trim()}
                            className="btn-primary"
                        >
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
