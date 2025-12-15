import { Upload, CheckCircle, AlertCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { FileDropzone } from "@/components";
import { useTranslation } from "@/hooks/useTranslation";
import type { ImportExcelResponse, Liquidazione } from "@/types";

interface OrdiniTabProps {
    // Orders state
    ordersImporting: boolean;
    ordersProgress: number;
    ordersResult: ImportExcelResponse | null;
    onOrdersUpload: (files: File[]) => void;
    // Liquidazioni state
    liquidazioniParsed: Liquidazione[];
    liquidazioniValid: Liquidazione[];
    liquidazioniInvalid: number;
    liquidazioniImporting: boolean;
    onLiquidazioniUpload: (files: File[]) => void;
    onLiquidazioniImport: () => void;
}

export function OrdiniTab({
    ordersImporting,
    ordersProgress,
    ordersResult,
    onOrdersUpload,
    liquidazioniParsed,
    liquidazioniValid,
    liquidazioniInvalid,
    liquidazioniImporting,
    onLiquidazioniUpload,
    onLiquidazioniImport,
}: OrdiniTabProps) {
    const { t } = useTranslation();

    return (
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
                        maxSizeMB={50}
                        onFiles={onOrdersUpload}
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
                                <div>
                                    {t("clients")}:{" "}
                                    <span className="text-foreground">{ordersResult.details.clienti.nuovi}</span>{" "}
                                    {t("newRecords")}
                                </div>
                                <div>
                                    {t("products")}:{" "}
                                    <span className="text-foreground">{ordersResult.details.prodotti.nuovi}</span>{" "}
                                    {t("newRecords")}
                                </div>
                                <div>
                                    {t("technicalData")}:{" "}
                                    <span className="text-foreground">{ordersResult.details.dati_tecnici.nuovi}</span>{" "}
                                    {t("newRecords")}
                                </div>
                                <div>
                                    {t("orders")}:{" "}
                                    <span className="text-foreground">{ordersResult.details.ordini.nuovi}</span>{" "}
                                    {t("newRecords")}
                                </div>
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
                        maxSizeMB={50}
                        onFiles={onLiquidazioniUpload}
                        disabled={liquidazioniImporting}
                    />
                    {liquidazioniParsed.length > 0 && (
                        <>
                            <Alert className="bg-secondary/50 border-border/50">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle className="font-display">{t("liquidationsPreview")}</AlertTitle>
                                <AlertDescription className="font-mono text-sm mt-2">
                                    <p>
                                        {t("validRecords")}:{" "}
                                        <span className="text-foreground">{liquidazioniValid.length}</span>
                                    </p>
                                    {liquidazioniInvalid > 0 && (
                                        <p className="text-energia-accent">
                                            {t("invalidRecords")}: {liquidazioniInvalid}
                                        </p>
                                    )}
                                </AlertDescription>
                            </Alert>
                            <Alert
                                variant="destructive"
                                className="bg-energia-accent/10 border-energia-accent/30 text-foreground"
                            >
                                <AlertTriangle className="h-4 w-4 text-energia-accent" />
                                <AlertDescription className="font-body text-sm">{t("warningDuplicates")}</AlertDescription>
                            </Alert>
                            <Button
                                onClick={onLiquidazioniImport}
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
    );
}
