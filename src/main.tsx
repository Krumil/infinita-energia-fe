import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App.tsx";
import { ThemeLanguageProvider } from "./contexts/ThemeLanguageContext";
import { AuthProvider } from "./contexts/AuthContext";
import { LoginDialog } from "./components/LoginDialog";

createRoot(document.getElementById("root")!).render(
    <StrictMode>
        <ThemeLanguageProvider>
            <AuthProvider>
                <LoginDialog />
                <App />
            </AuthProvider>
        </ThemeLanguageProvider>
    </StrictMode>,
);
