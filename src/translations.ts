import { settlementsEn, settlementsIt } from "./translations/settlements";
import { ordersEn, ordersIt } from "./translations/orders";
import { invoiceRequestsEn, invoiceRequestsIt } from "./translations/inviti";
import { attachmentsEn, attachmentsIt } from "./translations/allegati";
import { confirmationEn, confirmationIt } from "./translations/confirmation";
import { exportsEn, exportsIt } from "./translations/exports";
import { previewEn, previewIt } from "./translations/preview";
import { dashboardEn, dashboardIt } from "./translations/dashboard";

export type Language = "en" | "it";

const en = {
    ...settlementsEn,
    ...ordersEn,
    ...invoiceRequestsEn,
    ...attachmentsEn,
    ...previewEn,
    ...confirmationEn,
    ...exportsEn,
    ...dashboardEn,
    // Header
    appTitle: "Commission Calculator",
    settings: "Settings",

    // Tabs (Italian names as requested)
    dashboard: "Dashboard",
    agenti: "Agenti",
    ordini: "Ordini",
    provvigioni: "Provvigioni",

    // Dashboard
    ordersImported: "Orders Imported",
    recordsProcessed: "Records processed",
    importOrders: "Import Orders",
    importLiquidations: "Import Liquidations",
    // Dashboard Charts
    contracts: "Contracts",

    // Agents Tab
    agentsList: "Agents List",
    agentsListDesc: "View all sales agents and their commission rates",
    noAgentsYet: "No agents found. Click on Add Agent to add a new agent.",
    refreshAgents: "Refresh",
    agentName: "Agent Name",
    parentAgent: "Parent Agent",
    noParentAgent: "No parent agent",
    allParentAgents: "All parent agents",
    searchParentAgent: "Search parent agent...",
    noParentAgentsFound: "No parent agents found",
    agentNameTooltip: "Full name of the sales agent",
    parentAgentTooltip: "The supervising agent who receives overrides",
    email: "Email",
    mail: "Email",
    statistics: "Statistics",
    statisticsTooltip: "Include this agent in dashboard statistics and filters",
    childCommissionPercent: "Commission",

    // Regole
    regole: "Regole",
    noRegoleYet: "No rules found. Rules are created automatically when liquidations are imported.",
    ruleDescription: "Description",
    ruleActive: "Active",
    ruleDefault: "Default",
    ruleActivated: "Rule activated",
    ruleDeactivated: "Rule deactivated",
    defaultUpdated: "Default value updated",
    tipoUtenza: "User Type",
    tipoServizio: "Service Type",
    residenziale: "Residential",
    business: "Business",
    gas: "Gas",
    luce: "Electricity",
    importRules: "Import Rules",
    importRulesSuccess: "Rules imported successfully",
    confirmRuleChangeTitle: "Confirm Change",
    confirmRuleChangeDescription: "This change will affect all agents. Are you sure you want to proceed?",
    scaglioni: "Scaglioni",
    importScaglioni: "Import Scaglioni",
    importScaglioniSuccess: "Scaglioni imported successfully",
    noScaglioniYet: "No scaglioni found. Scaglioni are created automatically when liquidations are imported.",
    newRulesCreated: "New rules created",
    newRulesCreatedDesc: "New commission rules were detected during import. Check the Regole tab to configure them.",
    row: "Row",
    addAgent: "Add Agent",
    editAgent: "Edit Agent",
    deleteAgent: "Delete Agent",
    deleteAgentConfirm: "Are you sure you want to delete this agent?",
    deleteAgentDescription:
        "This action cannot be undone. This will permanently delete the agent and all associated data.",
    agentCreated: "Agent created successfully",
    agentUpdated: "Agent updated successfully",
    agentDeleted: "Agent deleted successfully",
    actions: "Actions",
    save: "Save",
    saving: "Saving...",

    // Orders Import Tab
    importOrdersTitle: "Import Orders from Excel",
    products: "Products",
    orders: "Orders",

    // Pending Orders
    pendingOrders: "Pending Orders",
    noPendingOrders: "No pending orders found",
    orderStatus: "Status",
    signatureDate: "Signature Date",
    startDate: "From",
    endDate: "To",
    agent: "Agent",
    product: "Product",
    paymentMethod: "Payment Method",
    customerName: "Customer",
    taxId: "Tax ID",
    podPdr: "POD/PDR",
    fetchError: "Failed to fetch data",
    orderId: "Order ID",

    // Liquidations Tab
    selectPeriod: "Select period",

    // Calculation Tab
    calculateCommissionsTitle: "Commissions",
    calculateCommissionsDesc: "Preview agent commissions from the liquidations imported for a month",
    totalCommission: "Total Commission",
    seller: "Seller",
    beneficiary: "Beneficiary",
    rule: "Rule",
    amount: "Amount",
    commission: "Commission",
    summaryByBeneficiary: "Summary by Beneficiary",

    // File Upload
    clickToUpload: "Click to upload",
    or: "or",
    dragAndDrop: "drag and drop",
    max: "max",
    fileTooLarge: "File too large",
    exceeds: "exceeds",
    invalidFileType: "Invalid file type",
    notAccepted: "is not accepted",
    processing: "Processing...",
    uploadSuccessful: "Upload successful",
    uploadFailed: "Upload failed",

    // Tables
    showing: "Showing",
    of: "of",
    rowsShown: "Showing {shown} of {count} rows",
    clearFilter: "Clear filter",
    filterPlaceholder: "Filter...",
    noDataFound: "No data found",

    // Settings
    configurePreferences: "Configure your preferences and defaults",
    currency: "Currency",
    language: "Language",
    theme: "Theme",
    light: "Light",
    dark: "Dark",
    system: "System",

    // Footer
    version: "Version",

    // Inline actions
    clickToEdit: "Click to edit",

    // Placeholder names
    exampleName: "John Smith",

    // Common
    loading: "Loading...",
    error: "Error",
    success: "Success",
    cancel: "Cancel",
    confirm: "Confirm",
    close: "Close",
    download: "Download",
    view: "View",
    records: "Records",
    client: "Client",
    total: "Total",
    period: "Period",

    // Ordini Tab - Collapsible & Dialog
    change: "Change",
    import: "Import",

    // Inviti Tab
    inviti: "Inviti",
    invoiceInvitations: "Invoice Invitations",
    competenceMonth: "Competence Month",
    invitationTotal: "Total",
    invoiceReference: "Invoice Ref.",
    invoiceDate: "Invoice Date",
    paid: "Paid",
    paymentDate: "Payment Date",
    status: "Status",
    draft: "Draft",
    sent: "Sent",
    approved: "Approved",
    allStatuses: "All Statuses",
    allAgents: "All Agents",
    allPaymentStatuses: "All payments",
    paidOnly: "Paid",
    unpaidOnly: "Unpaid",
    noInvitiFound: "No invoice invitations found",
    noInvitiDesc: "Adjust filters or check back later",
    invitationUpdated: "Invitation updated",
    invitationUpdateFailed: "Failed to update invitation",
    fromMonth: "From",
    toMonth: "To",
    unpaidCalcButton: "Unpaid commissions report",
    unpaidCalcCancel: "Cancel",
    unpaidCalcRun: "Calculate & download CSV",
    unpaidCalcDoneSingle: "Downloaded {rows} rows for {agent}.",
    unpaidCalcNoData: "No unpaid commission data found for the selected months.",
    unpaidCalcEmptyTitle: "No CSV downloaded",
    unpaidCalcGroupSummary: "{count} invitations · {total}",

    // Login
    loginTitle: "Login",
    loginDescription: "Enter your credentials to access the application",
    username: "Username",
    password: "Password",
    usernamePlaceholder: "Enter your username",
    passwordPlaceholder: "Enter your password",
    login: "Login",
    loggingIn: "Logging in...",
    logout: "Logout",
} as const;

export type TranslationKey = keyof typeof en;

type TranslationTable = Record<TranslationKey, string>;

const it: TranslationTable = {
    ...settlementsIt,
    ...ordersIt,
    ...invoiceRequestsIt,
    ...attachmentsIt,
    ...previewIt,
    ...confirmationIt,
    ...exportsIt,
    ...dashboardIt,
    // Header
    appTitle: "Calcolo Provvigioni",
    settings: "Impostazioni",

    // Tabs
    dashboard: "Dashboard",
    agenti: "Agenti",
    ordini: "Ordini",
    provvigioni: "Provvigioni",

    // Dashboard
    ordersImported: "Ordini Importati",
    recordsProcessed: "Record elaborati",
    importOrders: "Importa Ordini",
    importLiquidations: "Importa Liquidazioni",
    // Dashboard Charts
    contracts: "Contratti",

    // Agents Tab
    agentsList: "Lista Agenti",
    agentsListDesc: "Visualizza tutti gli agenti di vendita e le loro tariffe provvigionali",
    noAgentsYet: "Nessun agente trovato. Clicca su Aggiungi Agente per aggiungere un nuovo agente.",
    refreshAgents: "Aggiorna",
    agentName: "Nome Agente",
    parentAgent: "Agente Padre",
    noParentAgent: "Nessun agente padre",
    allParentAgents: "Tutti gli agenti padre",
    searchParentAgent: "Cerca agente padre...",
    noParentAgentsFound: "Nessun agente padre trovato",
    agentNameTooltip: "Nome completo dell'agente di vendita",
    parentAgentTooltip: "L'agente supervisore che riceve le provvigioni di override",
    email: "Email",
    mail: "Email",
    statistics: "Statistiche",
    statisticsTooltip: "Includi questo agente nelle statistiche e nei filtri della dashboard",
    childCommissionPercent: "Provvigione",

    // Regole
    regole: "Regole",
    noRegoleYet:
        "Nessuna regola trovata. Le regole vengono create automaticamente all'importazione delle liquidazioni.",
    ruleDescription: "Descrizione",
    ruleActive: "Attiva",
    ruleDefault: "Default",
    ruleActivated: "Regola attivata",
    ruleDeactivated: "Regola disattivata",
    defaultUpdated: "Valore predefinito aggiornato",
    tipoUtenza: "Tipo Utenza",
    tipoServizio: "Tipo Servizio",
    residenziale: "Residenziale",
    business: "Business",
    gas: "Gas",
    luce: "Luce",
    importRules: "Importa Regole",
    importRulesSuccess: "Regole importate con successo",
    confirmRuleChangeTitle: "Conferma Modifica",
    confirmRuleChangeDescription: "Questa modifica avrà effetto su tutti gli agenti. Sei sicuro di voler procedere?",
    scaglioni: "Scaglioni",
    importScaglioni: "Importa Scaglioni",
    importScaglioniSuccess: "Scaglioni importati con successo",
    noScaglioniYet:
        "Nessuno scaglione trovato. Gli scaglioni vengono creati automaticamente all'importazione delle liquidazioni.",
    newRulesCreated: "Nuove regole create",
    newRulesCreatedDesc:
        "Nuove regole provvigionali sono state rilevate durante l'importazione. Controlla la scheda Regole per configurarle.",
    row: "Riga",
    addAgent: "Aggiungi Agente",
    editAgent: "Modifica Agente",
    deleteAgent: "Elimina Agente",
    deleteAgentConfirm: "Sei sicuro di voler eliminare questo agente?",
    deleteAgentDescription:
        "Questa azione non può essere annullata. L'agente e tutti i dati associati verranno eliminati permanentemente.",
    agentCreated: "Agente creato con successo",
    agentUpdated: "Agente aggiornato con successo",
    agentDeleted: "Agente eliminato con successo",
    actions: "Azioni",
    save: "Salva",
    saving: "Salvataggio...",

    // Orders Import Tab
    importOrdersTitle: "Importa Ordini da Excel",
    products: "Prodotti",
    orders: "Ordini",

    // Pending Orders
    pendingOrders: "Ordini Inevasi",
    noPendingOrders: "Nessun ordine in attesa trovato",
    orderStatus: "Stato",
    signatureDate: "Data Firma",
    startDate: "Da",
    endDate: "A",
    agent: "Agente",
    product: "Prodotto",
    paymentMethod: "Metodo Pagamento",
    customerName: "Cliente",
    taxId: "Cod. Fiscale",
    podPdr: "POD/PDR",
    fetchError: "Impossibile recuperare i dati",
    orderId: "ID Ordine",

    // Liquidations Tab
    selectPeriod: "Seleziona periodo",

    // Calculation Tab
    calculateCommissionsTitle: "Provvigioni",
    calculateCommissionsDesc: "Anteprima delle provvigioni degli agenti dalle liquidazioni importate per una competenza",
    totalCommission: "Provvigione Totale",
    seller: "Venditore",
    beneficiary: "Beneficiario",
    rule: "Regola",
    amount: "Importo",
    commission: "Provvigione",
    summaryByBeneficiary: "Riepilogo per Beneficiario",

    // File Upload
    clickToUpload: "Clicca per caricare",
    or: "o",
    dragAndDrop: "trascina e rilascia",
    max: "max",
    fileTooLarge: "File troppo grande",
    exceeds: "supera",
    invalidFileType: "Tipo di file non valido",
    notAccepted: "non è accettato",
    processing: "Elaborazione...",
    uploadSuccessful: "Caricamento riuscito",
    uploadFailed: "Caricamento fallito",

    // Tables
    showing: "Visualizzazione",
    of: "di",
    rowsShown: "{shown} righe mostrate su {count}",
    clearFilter: "Cancella filtro",
    filterPlaceholder: "Filtra...",
    noDataFound: "Nessun dato trovato",

    // Settings
    configurePreferences: "Configura le tue preferenze e impostazioni predefinite",
    currency: "Valuta",
    language: "Lingua",
    theme: "Tema",
    light: "Chiaro",
    dark: "Scuro",
    system: "Sistema",

    // Footer
    version: "Versione",

    // Inline actions
    clickToEdit: "Clicca per modificare",

    // Placeholder names
    exampleName: "Mario Rossi",

    // Common
    loading: "Caricamento...",
    error: "Errore",
    success: "Successo",
    cancel: "Annulla",
    confirm: "Conferma",
    close: "Chiudi",
    download: "Scarica",
    view: "Visualizza",
    records: "Record",
    client: "Cliente",
    total: "Totale",
    period: "Periodo",

    // Ordini Tab - Collapsible & Dialog
    change: "Cambia",
    import: "Importa",

    // Inviti Tab
    inviti: "Inviti",
    invoiceInvitations: "Inviti a Fatturare",
    competenceMonth: "Mese Competenza",
    invitationTotal: "Totale",
    invoiceReference: "Rif. Fattura",
    invoiceDate: "Data Fattura",
    paid: "Pagato",
    paymentDate: "Data Pagamento",
    status: "Stato",
    draft: "Bozza",
    sent: "Inviato",
    approved: "Approvato",
    allStatuses: "Tutti gli Stati",
    allAgents: "Tutti gli Agenti",
    allPaymentStatuses: "Tutti i pagamenti",
    paidOnly: "Pagato",
    unpaidOnly: "Non pagato",
    noInvitiFound: "Nessun invito a fatturare trovato",
    noInvitiDesc: "Modifica i filtri o ricontrolla più tardi",
    invitationUpdated: "Invito aggiornato",
    invitationUpdateFailed: "Aggiornamento invito fallito",
    fromMonth: "Da",
    toMonth: "A",
    unpaidCalcButton: "Calcolo non liquidati",
    unpaidCalcCancel: "Annulla",
    unpaidCalcRun: "Calcola e scarica CSV",
    unpaidCalcDoneSingle: "Scaricate {rows} righe per {agent}.",
    unpaidCalcNoData: "Nessun dato di provvigione non pagata trovato per i mesi selezionati.",
    unpaidCalcEmptyTitle: "Nessun CSV scaricato",
    unpaidCalcGroupSummary: "{count} inviti · {total}",

    // Login
    loginTitle: "Accedi",
    loginDescription: "Inserisci le tue credenziali per accedere all'applicazione",
    username: "Nome utente",
    password: "Password",
    usernamePlaceholder: "Inserisci il tuo nome utente",
    passwordPlaceholder: "Inserisci la tua password",
    login: "Accedi",
    loggingIn: "Accesso in corso...",
    logout: "Esci",
};

export const translations: Record<Language, TranslationTable> = { en, it };

export function getTranslation(lang: Language, key: TranslationKey): string {
    return translations[lang][key] ?? translations.en[key];
}
