import { useState, useEffect, useMemo } from "react";
import { Agentation } from "agentation";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Tabs, TabsContent } from "@/components/ui/tabs";
import { Toaster } from "@/components/ui/toaster";

// Layout components
import { AppHeader } from "@/components";

// Page components
import { DashboardTab, AgentsTab, RegoleTab, OrdiniTab, CalcoloTab, InvitiTab } from "@/pages";

// Custom hooks
import {
    useAgents,
    useRegole,
    useScaglioni,
    useOrders,
    useLiquidazioni,
    useCalcolo,
    usePendingOrders,
    useToast,
    useTranslation,
} from "@/hooks";
import { useAuth } from "@/contexts/AuthContext";

export default function App() {
    const { isAuthenticated } = useAuth();

    if (!isAuthenticated) {
        return null;
    }

    return <AuthenticatedApp />;
}

function AuthenticatedApp() {
    const { toast } = useToast();
    const { t } = useTranslation();

    const [activeTab, setActiveTab] = useState<string>("dashboard");

    const [settingsOpen, setSettingsOpen] = useState(false);
    const agents = useAgents();
    const regole = useRegole();
    const scaglioni = useScaglioni();
    const orders = useOrders();
    const liquidazioni = useLiquidazioni();
    const calcolo = useCalcolo();
    const pendingOrders = usePendingOrders();

    const incompleteRulesCount = useMemo(
        () =>
            regole.regole.filter((r) => r.tipo_utenza === null).length +
            scaglioni.scaglioni.filter((s) => s.tipo_utenza === null).length,
        [regole.regole, scaglioni.scaglioni],
    );

    useEffect(() => {
        const hash = window.location.hash.replace("#", "") || "dashboard";
        setActiveTab(hash);
        if (hash === "ordini") {
            pendingOrders.fetchPendingOrders();
        }

        const handleHashChange = () => {
            const newHash = window.location.hash.replace("#", "") || "dashboard";
            setActiveTab(newHash);
            if (newHash === "ordini") {
                pendingOrders.fetchPendingOrders();
            }
        };

        window.addEventListener("hashchange", handleHashChange);
        return () => window.removeEventListener("hashchange", handleHashChange);
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const handleTabChange = (value: string) => {
        setActiveTab(value);
        window.location.hash = value;
        if (value === "ordini") {
            pendingOrders.fetchPendingOrders();
        }
    };

    const handleOrdersUpload = async (files: File[]) => {
        const action = await orders.handleUpload(files);
        if (action) {
            await pendingOrders.fetchPendingOrders();
        }
    };

    const handleLiquidazioniUpload = async (files: File[], competenzaPeriod: string) => {
        const result = await liquidazioni.handleUpload(files, competenzaPeriod);
        if (result) {
            const refreshes: Promise<void>[] = [pendingOrders.fetchPendingOrders()];
            if (result.hasNewRules) {
                refreshes.push(regole.loadRegole());
            }
            await Promise.all(refreshes);

            if (result.hasNewRules) {
                toast({
                    title: t("newRulesCreated"),
                    description: t("newRulesCreatedDesc"),
                });
            }
        }
    };

    return (
        <TooltipProvider>
            <div className="min-h-screen flex flex-col">
                <AppHeader
                    appVersion={__APP_VERSION__}
                    settingsOpen={settingsOpen}
                    onSettingsOpenChange={setSettingsOpen}
                    activeTab={activeTab}
                    onTabChange={handleTabChange}
                    incompleteRulesCount={incompleteRulesCount}
                />

                <main className="flex-1 max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 w-full">
                    <Tabs value={activeTab} onValueChange={handleTabChange} className="space-y-10">
                        <TabsContent value="dashboard">
                            <DashboardTab />
                        </TabsContent>

                        <TabsContent value="agenti">
                            <AgentsTab
                                agents={agents.agents}
                                loading={agents.loading}
                                dialogOpen={agents.dialogOpen}
                                onDialogOpenChange={agents.setDialogOpen}
                                editingAgent={agents.editingAgent}
                                saving={agents.saving}
                                deleting={agents.deleting}
                                onRefresh={agents.loadAgents}
                                onCreateClick={agents.openCreateDialog}
                                onEdit={agents.openEditDialog}
                                onToggleStatistiche={agents.toggleStatistiche}
                                onSave={agents.saveAgent}
                                onDeleteAgent={agents.deleteAgent}
                                regole={regole.regole}
                                configurazione={agents.configurazione}
                                configLoading={agents.configLoading}
                                scaglioni={scaglioni.scaglioni}
                            />
                        </TabsContent>

                        <TabsContent value="regole">
                            <RegoleTab
                                regole={regole.regole}
                                loading={regole.loading}
                                importing={regole.importing}
                                onRefresh={regole.loadRegole}
                                onImportRegole={regole.importRegole}
                                onToggleUtilizzato={regole.toggleUtilizzato}
                                onUpdateDefault={regole.updateDefault}
                                onUpdateTipoUtenza={regole.updateTipoUtenza}
                                onUpdateTipoServizio={regole.updateTipoServizio}
                                scaglioni={scaglioni.scaglioni}
                                scaglioniLoading={scaglioni.loading}
                                scaglioniImporting={scaglioni.importing}
                                onRefreshScaglioni={scaglioni.loadScaglioni}
                                onImportScaglioni={scaglioni.importScaglioni}
                                onUpdateScaglioneTipoUtenza={scaglioni.updateTipoUtenza}
                                onUpdateScaglioneTipoServizio={scaglioni.updateTipoServizio}
                            />
                        </TabsContent>

                        <TabsContent value="ordini">
                            <OrdiniTab
                                ordersImporting={orders.importing}
                                ordersProgress={orders.progress}
                                ordersResult={orders.result}
                                onOrdersUpload={handleOrdersUpload}
                                liquidazioniImporting={liquidazioni.importing}
                                liquidazioniResult={liquidazioni.result}
                                onLiquidazioniUpload={handleLiquidazioniUpload}
                                pendingOrders={pendingOrders.orders}
                                pendingOrdersLoading={pendingOrders.loading}
                                onRefreshPendingOrders={pendingOrders.fetchPendingOrders}
                                startDate={pendingOrders.startDate}
                                endDate={pendingOrders.endDate}
                                onStartDateChange={pendingOrders.setStartDate}
                                onEndDateChange={pendingOrders.setEndDate}
                            />
                        </TabsContent>

                        <TabsContent value="provvigioni">
                            <CalcoloTab
                                data={calcolo.data}
                                result={calcolo.result}
                                loading={calcolo.loading}
                                unmatchedAgents={calcolo.unmatchedAgents}
                                onUpload={calcolo.handleUpload}
                                onCalculate={calcolo.calculate}
                                onNavigate={handleTabChange}
                            />
                        </TabsContent>

                        <TabsContent value="inviti">
                            <InvitiTab
                                agents={agents.agents}
                                agentsLoading={agents.loading}
                            />
                        </TabsContent>
                    </Tabs>
                </main>

                <Toaster />
                {import.meta.env.DEV && <Agentation />}
            </div>
        </TooltipProvider>
    );
}
