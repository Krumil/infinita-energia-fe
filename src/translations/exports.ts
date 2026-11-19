export const exportsEn = {
    exportPreviewAction: "Download preview ZIP",
    exportPreviewNote: "Unsaved preview: the file holds the current draft.",
    exportSavedAction: "Download saved invites ZIP",
    exportSavedNote: "The file holds the saved invites, read back from the server.",
    exportSavedNone: "No saved invite to download.",
    exportSavedDetailFailed:
        "Download failed: the details of invite #{invite} for {agent} couldn't be loaded. No file was downloaded. Try again.",
    exportFailed: "The ZIP file couldn't be created. No file was downloaded. Try again.",
} as const;

export const exportsIt = {
    exportPreviewAction: "Scarica anteprima ZIP",
    exportPreviewNote: "Anteprima non salvata: il file contiene la bozza attuale.",
    exportSavedAction: "Scarica inviti salvati ZIP",
    exportSavedNote: "Il file contiene gli inviti salvati, riletti dal server.",
    exportSavedNone: "Nessun invito salvato da scaricare.",
    exportSavedDetailFailed:
        "Download non riuscito: non è stato possibile leggere il dettaglio dell'invito #{invite} di {agent}. Nessun file è stato scaricato. Riprova.",
    exportFailed: "Non è stato possibile creare il file ZIP. Nessun file è stato scaricato. Riprova.",
} as const;
