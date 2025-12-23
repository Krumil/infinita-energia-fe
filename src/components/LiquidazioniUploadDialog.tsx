import { useState, useMemo } from "react";
import { Loader2 } from "lucide-react";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { FileDropzone } from "@/components/FileDropzone";
import { useTranslation } from "@/hooks/useTranslation";

interface LiquidazioniUploadDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    importing: boolean;
    onUpload: (files: File[], meseRiferimento: string) => void;
}

const MONTHS_IT = [
    "Gennaio",
    "Febbraio",
    "Marzo",
    "Aprile",
    "Maggio",
    "Giugno",
    "Luglio",
    "Agosto",
    "Settembre",
    "Ottobre",
    "Novembre",
    "Dicembre",
];

function getDefaultPeriod() {
    const now = new Date();
    return {
        month: now.getMonth() + 1,
        year: now.getFullYear(),
    };
}

export function LiquidazioniUploadDialog({ open, onOpenChange, importing, onUpload }: LiquidazioniUploadDialogProps) {
    const { t } = useTranslation();

    const defaultPeriod = useMemo(() => getDefaultPeriod(), []);

    const [selectedMonth, setSelectedMonth] = useState<number>(defaultPeriod.month);
    const [selectedYear, setSelectedYear] = useState<number>(defaultPeriod.year);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    // Generate year options: current year - 2 to current year + 1
    const yearOptions = useMemo(() => {
        const currentYear = defaultPeriod.year;
        return [currentYear - 2, currentYear - 1, currentYear, currentYear + 1];
    }, [defaultPeriod.year]);

    const handleFileSelect = (files: File[]) => {
        if (files.length > 0) {
            setSelectedFile(files[0]);
        }
    };

    const handleImport = () => {
        if (!selectedFile) return;

        const meseRiferimento = `${selectedYear}-${String(selectedMonth).padStart(2, "0")}`;
        onUpload([selectedFile], meseRiferimento);
    };

    const handleOpenChange = (newOpen: boolean) => {
        if (!newOpen && !importing) {
            // Reset state when closing
            setSelectedFile(null);
            setSelectedMonth(defaultPeriod.month);
            setSelectedYear(defaultPeriod.year);
        }
        onOpenChange(newOpen);
    };

    return (
        <Dialog open={open} onOpenChange={handleOpenChange}>
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle className="font-display">{t("importLiquidationsTitle")}</DialogTitle>
                    <DialogDescription>{t("selectPeriodDesc")}</DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Period Selection */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">{t("referenceMonth")}</label>
                        <div className="flex gap-3">
                            <Select
                                value={String(selectedMonth)}
                                onValueChange={(v) => setSelectedMonth(Number(v))}
                                disabled={importing}
                            >
                                <SelectTrigger className="flex-1">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {MONTHS_IT.map((month, index) => (
                                        <SelectItem key={index + 1} value={String(index + 1)}>
                                            {month}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>

                            <Select
                                value={String(selectedYear)}
                                onValueChange={(v) => setSelectedYear(Number(v))}
                                disabled={importing}
                            >
                                <SelectTrigger className="w-[100px]">
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {yearOptions.map((year) => (
                                        <SelectItem key={year} value={String(year)}>
                                            {year}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {/* File Dropzone */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium">{t("selectFile")}</label>
                        {selectedFile ? (
                            <div className="border border-border rounded-md p-4 bg-muted/30">
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded bg-energia-accent/10 flex items-center justify-center">
                                            <span className="text-energia-accent font-mono text-xs">XLS</span>
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{selectedFile.name}</p>
                                            <p className="text-xs text-muted-foreground">
                                                {(selectedFile.size / 1024).toFixed(1)} KB
                                            </p>
                                        </div>
                                    </div>
                                    {!importing && (
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setSelectedFile(null)}
                                            className="text-muted-foreground hover:text-foreground"
                                        >
                                            {t("change")}
                                        </Button>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <FileDropzone
                                accept=".xlsx,.xls"
                                maxSizeMB={50}
                                onFiles={handleFileSelect}
                                disabled={importing}
                            />
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => handleOpenChange(false)} disabled={importing}>
                        {t("cancel")}
                    </Button>
                    <Button onClick={handleImport} disabled={!selectedFile || importing}>
                        {importing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {t("processing")}...
                            </>
                        ) : (
                            t("import")
                        )}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
