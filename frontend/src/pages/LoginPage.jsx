import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';
import { useNavigate, Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/auth.css';

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