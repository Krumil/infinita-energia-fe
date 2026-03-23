// Compatibility barrel for legacy imports.
export { ApiError, setUnauthorizedCallback } from "./api/client";
export { apiLogin, apiLogout, checkAuthStatus } from "./api/auth";
export {
    getAgenti,
    createAgente,
    updateAgente,
    deleteAgente,
    getConfigurazioneRegole,
    saveConfigurazioneRegole,
} from "./api/agents";
export { getRegole, importRegole, updateRegola } from "./api/regole";
export { getScaglioni, importScaglioni, updateScaglione } from "./api/scaglioni";
export { uploadExcel, getPendingOrders } from "./api/orders";
export { importLiquidazioni } from "./api/liquidazioni";
export { calcolaProvvigioni } from "./api/calcolo";
export {
    getDashboardAnniDisponibili,
    getDashboardAgentiFiltro,
    getDashboardContrattiTotali,
    getDashboardProvvigioniTotali,
    getDashboardContrattiMensili,
    getDashboardProvvigioniMensili,
    getDashboardContrattiPerProdotto,
} from "./api/dashboard";
export { parseExcelFile } from "./importers/excel";
export { parseLiquidazioniExcel, convertToCalcoloInput } from "./importers/liquidazioni";
