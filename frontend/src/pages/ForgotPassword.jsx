import React, { useState, useEffect } from 'react';
import authService from '../services/authService';
import toast from 'react-hot-toast';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/auth.css';

const ForgotPassword = () => {

    useEffect(() => {
        document.title = 'RentalCar | Forgot Password';
    }, []);

    const { lang } = useLang();
    const t = translations[lang].forgotPassword;

    const [email, setEmail] = useState('');
    const [isSubmitted, setIsSubmitted] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading(t.toastLoading || "Sending...");
        try {
            await authService.forgotPassword(email);
            setIsSubmitted(true);
            toast.success(t.toastSuccess, { id: loadingToast });
        } catch (error) {
            setIsSubmitting(false);
            toast.error(error.response?.data?.message || t.toastError, { id: loadingToast });
        }
    };

    if (isSubmitted) {
        return (
            <div className="auth-container">
                <div className="auth-card">
                    <h2>{t.checkEmailTitle}</h2>
                    <p className="auth-subtitle">{t.checkEmailDesc.replace('{{email}}', email)}</p>
                    <Link to="/login" className="back-to-login">
                        <span className="arrow">←</span> {t.backToLogin}
                    </Link>
                </div>
            </div>
        );
    }

    return (
        <div className="auth-container">
            <form className="auth-card" onSubmit={handleSubmit}>
                <h2>{t.title}</h2>
                <p className="auth-subtitle">{t.subtitle}</p>
                
                <div className="form-group">
                    <label>{t.placeholderEmail || (lang === 'en' ? 'Email Address' : 'Διεύθυνση Email')}</label>
                    <input 
                        type="email" 
                        placeholder="name@example.com" 
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required 
                        disabled={isSubmitting}
                    />
                </div>
                
                <div className="auth-action-spacing">
                <button 
                    type="submit" 
                    className="confirm-glow-btn"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? '...' : t.btnSubmit} <i className="fas fa-paper-plane"></i>
                </button>
                </div>

                {isSubmitting ? (
                    <span className="back-to-login disabled-link">
                        <span className="arrow">←</span> {t.backToLogin}
                    </span>
                ) : (
                    <Link to="/login" className="back-to-login">
                        <span className="arrow">←</span> {t.backToLogin}
                    </Link>
                )}
            </form>
        </div>
    );
};

export default ForgotPassword;