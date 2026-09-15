import { createContext } from "react";

export interface AuthContextType {
    isAuthenticated: boolean;
    user: string | null;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    clearError: () => void;
}

export const AuthContext = createContext<AuthContextType | null>(null);

