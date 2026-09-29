import { useId, useState, type ReactElement } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { downloadBlob } from "@/lib/exportUtils";
import type { ZipDownload } from "@/lib/calculationExport";

interface ZipDownloadButtonProps {
    label: string;
    note: string;
    disabled: boolean;
    build: () => Promise<ZipDownload>;
    describeError: (cause: unknown) => string;
}

export function ZipDownloadButton({ label, note, disabled, build, describeError }: ZipDownloadButtonProps): ReactElement {
    const noteId = useId();
    const [downloading, setDownloading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const handleClick = async (): Promise<void> => {
        setDownloading(true);
        setError(null);

        try {
            const { blob, filename } = await build();

            downloadBlob(blob, filename);
        } catch (failure) {
            console.error(`Building ${label} failed`, failure);
            setError(describeError(failure));
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-1">
            <Button variant="outline" size="sm" disabled={disabled || downloading} aria-describedby={noteId} onClick={() => void handleClick()}>
                {downloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                {label}
            </Button>
            <p id={noteId} className="text-xs text-muted-foreground">
                {note}
            </p>
            {error && (
                <p role="alert" className="text-sm text-destructive">
                    {error}
                </p>
            )}
        </div>
    );
}
