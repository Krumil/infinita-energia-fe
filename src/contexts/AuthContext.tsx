import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from "react";
import { apiLogin, apiLogout, checkAuthStatus, setUnauthorizedCallback, ApiError } from "../api";

interface AuthContextType {
    isAuthenticated: boolean;
    user: string | null;
    isLoading: boolean;
    error: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => Promise<void>;
    clearError: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const handleUnauthorized = useCallback(() => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    }, []);

    useEffect(() => {
        setUnauthorizedCallback(handleUnauthorized);
        return () => setUnauthorizedCallback(null);
    }, [handleUnauthorized]);

    useEffect(() => {
        async function verifySession() {
            const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
            if (storedUser) {
                const isValid = await checkAuthStatus();
                if (isValid) {
                    setUser(storedUser);
                } else {
                    localStorage.removeItem(AUTH_STORAGE_KEY);
                }
            }
            setIsLoading(false);
        }
        verifySession();
    }, []);

    const login = async (username: string, password: string): Promise<boolean> => {
        setError(null);
        setIsLoading(true);
        try {
            await apiLogin({ username, password });
            setUser(username);
            localStorage.setItem(AUTH_STORAGE_KEY, username);
            return true;
        } catch (err) {
            if (err instanceof ApiError) {
                setError(err.message);
            } else {
                setError("Errore di connessione al server");
            }
            return false;
        } finally {
            setIsLoading(false);
        }
    };

    const logout = async (): Promise<void> => {
        try {
            await apiLogout();
        } catch {
            // Logout locally even if API call fails
        }
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    const clearError = () => setError(null);

    if (isLoading && !user) {
        return null;
    }

    return (
        <AuthContext.Provider
            value={{ isAuthenticated: !!user, user, isLoading, error, login, logout, clearError }}
        >
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
