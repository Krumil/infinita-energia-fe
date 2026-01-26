import { createContext, useContext, useState, useEffect, type ReactNode } from "react";

interface AuthContextType {
    isAuthenticated: boolean;
    user: string | null;
    login: (username: string, password: string) => Promise<boolean>;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AUTH_STORAGE_KEY = "auth_user";

export function AuthProvider({ children }: { children: ReactNode }) {
    const [user, setUser] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);

    useEffect(() => {
        const storedUser = localStorage.getItem(AUTH_STORAGE_KEY);
        if (storedUser) {
            setUser(storedUser);
        }
        setIsInitialized(true);
    }, []);

    const login = async (username: string, _password: string): Promise<boolean> => {
        // Mock implementation - accepts any non-empty credentials
        if (username.trim()) {
            setUser(username);
            localStorage.setItem(AUTH_STORAGE_KEY, username);
            return true;
        }
        return false;
    };

    const logout = () => {
        setUser(null);
        localStorage.removeItem(AUTH_STORAGE_KEY);
    };

    // Don't render children until we've checked localStorage
    if (!isInitialized) {
        return null;
    }

    return (
        <AuthContext.Provider value={{ isAuthenticated: !!user, user, login, logout }}>{children}</AuthContext.Provider>
    );
}

export function useAuth() {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error("useAuth must be used within an AuthProvider");
    }
    return context;
}
