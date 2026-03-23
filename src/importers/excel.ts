export async function parseExcelFile<T extends Record<string, unknown>>(file: File): Promise<T[]> {
    const XLSX = await import("xlsx");

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            try {
                const data = e.target?.result;
                const workbook = XLSX.read(data, { type: "binary" });

                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];

                const jsonData = XLSX.utils.sheet_to_json<T>(worksheet, {
                    defval: "",
                    raw: false,
                });

                resolve(jsonData);
            } catch (error) {
                reject(new Error(`Errore parsing file: ${error instanceof Error ? error.message : "sconosciuto"}`));
            }
        };

        reader.onerror = () => {
            reject(new Error("Errore lettura file"));
        };

        reader.readAsBinaryString(file);
    });
}
