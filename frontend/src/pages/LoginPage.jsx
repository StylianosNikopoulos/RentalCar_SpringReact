import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/auth.css';

const BACKEND_URL = import.meta.env.VITE_API_BASE_URL?.replace('/api/v1', '') || 'http://localhost:8080';

const LoginPage = () => {

    useEffect(() => {
        document.title = 'RentalCar | Sign In';
    }, []);

    const { lang } = useLang();
    const t = translations[lang].login;

    const [credentials, setCredentials] = useState(() => ({
        email: localStorage.getItem('rememberedEmail') || '',
        password: ''
    }));
    const [rememberMe, setRememberMe] = useState(() => Boolean(localStorage.getItem('rememberedEmail')));
    const [showPassword, setShowPassword] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const { login } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setCredentials(prev => ({ ...prev, [name]: value }));
    };

    const handleGoogleLogin = () => {
        window.location.href = `${BACKEND_URL}/oauth2/authorization/google`;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading(t.toastLoading);
        try {
            await login({ ...credentials, rememberMe });

            if (rememberMe) {
                localStorage.setItem('rememberedEmail', credentials.email);
            } else {
                localStorage.removeItem('rememberedEmail');
            }

            toast.success(t.toastSuccess, { id: loadingToast });
            navigate('/', { replace: true }); 
        } catch (error) {
            setIsSubmitting(false);
            const { code, message } = error.response?.data || {};
            if (code === "INVALID_CREDENTIALS") {
                toast.error(message, { id: loadingToast });
            } else {
                toast.error(message || t.toastError, { id: loadingToast });
            }
        }
    };

    return (
        <div className="auth-container">
            <div className="auth-card">
                <span className="auth-eyebrow"><i className="fas fa-key"></i> {t.eyebrow}</span>
                <h2>{t.title}</h2>
                <p className="auth-subtitle">{t.subtitle}</p>
                
                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label htmlFor="email">{t.emailLabel}</label>
                        <input 
                            id="email"
                            name="email"
                            type="email" 
                            autoComplete="email"
                            value={credentials.email} 
                            onChange={handleChange} 
                            placeholder="name@example.com"
                            required 
                            disabled={isSubmitting}
                        />
                    </div>
                    
                    <div className="form-group">
                        <label htmlFor="password">{t.passwordLabel}</label>
                        <div className="password-input-wrapper">
                            <input 
                                id="password"
                                name="password"
                                type={showPassword ? 'text' : 'password'} 
                                autoComplete="current-password"
                                value={credentials.password} 
                                onChange={handleChange} 
                                placeholder="••••••••"
                                required 
                                disabled={isSubmitting}
                            />
                            <button
                                type="button"
                                className="password-toggle-btn"
                                onClick={() => setShowPassword(prev => !prev)}
                                disabled={isSubmitting}
                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                tabIndex={-1}
                            >
                                {showPassword ? (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                        <line x1="1" y1="1" x2="23" y2="23"></line>
                                    </svg>
                                ) : (
                                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                )}
                            </button>
                        </div>
                    </div>

                    <div className="auth-options-row">
                        <label className="remember-me-label">
                            <input
                                type="checkbox"
                                checked={rememberMe}
                                onChange={(e) => setRememberMe(e.target.checked)}
                                disabled={isSubmitting}
                            />
                            <span>{t.rememberMe}</span>
                        </label>

                        <div className="forgot-password-wrapper">
                            {isSubmitting ? (
                                <span className="disabled-link">{t.forgotPassword}</span>
                            ) : (
                                <Link to="/forgot-password">
                                    {t.forgotPassword}
                                </Link>
                            )}
                        </div>
                    </div>

                    <button 
                        type="submit" 
                        className="auth-button" 
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? t.processing : t.btnSubmit} <i className="fas fa-arrow-right"></i>
                    </button>
                </form>

                <div className="oauth-divider">
                    <span>OR</span>
                </div>

                <button
                    type="button"
                    className="google-auth-btn"
                    onClick={handleGoogleLogin}
                    disabled={isSubmitting}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24">
                        <path fill="#4285F4" d="M23.745 12.27c0-.7-.06-1.4-.19-2.07H12v4.51h6.6c-.29 1.52-1.14 2.82-2.4 3.68v3.05h3.88c2.27-2.09 3.665-5.17 3.665-9.17z" />
                        <path fill="#34A853" d="M12 24c3.24 0 5.95-1.08 7.93-2.91l-3.88-3.05c-1.08.72-2.45 1.16-4.05 1.16-3.12 0-5.77-2.11-6.72-4.96H1.29v3.14C3.26 21.3 7.31 24 12 24z" />
                        <path fill="#FBBC05" d="M5.28 14.24c-.24-.72-.38-1.49-.38-2.24s.14-1.52.38-2.24V6.62H1.29C.47 8.24 0 10.06 0 12s.47 3.76 1.29 5.38l3.99-3.14z" />
                        <path fill="#EA4335" d="M12 4.75c1.77 0 3.35.61 4.6 1.8l3.42-3.42C17.95 1.19 15.24 0 12 0 7.31 0 3.26 2.7 1.29 6.62l3.99 3.14c.95-2.85 3.6-4.96 6.72-4.96z" />
                    </svg>
                    <span>Continue with Google</span>
                </button>

                {isSubmitting ? (
                    <span className="auth-link disabled-link">{t.registerLink}</span>
                ) : (
                    <Link to="/register" className="auth-link">{t.registerLink}</Link>
                )}
                <p className="auth-security-note"><i className="fas fa-lock"></i> {t.securityNote}</p>
            </div>
        </div>
    );
};

export default LoginPage;