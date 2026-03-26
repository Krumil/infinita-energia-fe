import { useState } from "react";
import { FileSpreadsheet } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "@/hooks/useTranslation";
import type { FileDropzoneProps } from "@/types/components";

export function FileDropzone({ accept, maxSizeMB, multiple = false, onFiles, disabled = false }: FileDropzoneProps) {
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
            className={`dropzone ${dragActive ? "border-energia-accent/60 bg-energia-accent/5" : ""} ${
                disabled ? "opacity-50 cursor-not-allowed" : ""
            }`}
            data-drag-active={dragActive}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
        >

            <FileSpreadsheet className="dropzone-icon pointer-events-none" />
            <p className="font-display text-sm text-muted-foreground pointer-events-none">
                <span className="text-energia-accent font-medium">{t("clickToUpload")}</span>{" "}
                <span className="text-muted-foreground/70">
                    {t("or")} {t("dragAndDrop")}
                </span>
            </p>
            <p className="font-mono text-xs text-muted-foreground/50 mt-2 uppercase tracking-wider pointer-events-none">
                {accept} · {t("max")} {maxSizeMB}MB
            </p>
            <input
                type="file"
                accept={accept}
                multiple={multiple}
                onChange={handleChange}
                disabled={disabled}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                aria-label="File upload"
            />
        </div>
    );
}
