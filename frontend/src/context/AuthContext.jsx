import { createContext, useState } from 'react';
import authService from '../services/authService';

export const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(() => {
        try {
            const savedUser = localStorage.getItem('user');
            
            if (!savedUser || savedUser === "undefined") {
                return null;
            }

            const parsed = JSON.parse(savedUser);

            if (parsed && parsed.accessToken) {
                return parsed;
            }
            
            return null;
        } catch (error) {
            console.error("Auth initialization error:", error);
            localStorage.removeItem('user');
            return null;
        }
    });

    const [loading, setLoading] = useState(false);

    const login = async (loginRequest) => {
        const userData = await authService.login(loginRequest);
        setUser(userData); 
        return userData;
    };

    const register = async (registerRequest) => {
        const userData = await authService.register(registerRequest);
        setUser(userData); 
        return userData;
    };

    const loginWithOAuth = async (accessToken, refreshToken) => {
        const userData = await authService.loginWithOAuth(accessToken, refreshToken);
        setUser(userData);
        return userData;
    };

    const logout = () => {
        authService.logout();
        setUser(null);
        localStorage.removeItem('user');
    };

    return (
        <AuthContext.Provider value={{ user, login, register, loginWithOAuth, logout, loading }}>
            {children}
        </AuthContext.Provider>
    );
};