import React, { useEffect, useState } from 'react';
import '../../assets/styles/cookieConsent.css';
import { useLang } from '../../context/LangContext';
import { translations } from '../../i18n/translations';
import { OPEN_SETTINGS_EVENT, getConsent, hasAnalyticsConsent, initAnalytics, saveConsent } from '../../services/analytics';

const CookieConsent = () => {
    const [visible, setVisible] = useState(false);
    const { lang } = useLang();
    const t = translations[lang]?.cookieConsent || {};

    useEffect(() => {
        localStorage.removeItem('cookieConsent');
        if (!getConsent() || !getConsent()?.savedAt) {
            setVisible(true);
        } else if (hasAnalyticsConsent()) {
            initAnalytics();
        }
    }, []);

    const handleAccept = () => {
        saveConsent('all');
        setVisible(false);
    };

    const handleReject = () => {
        saveConsent('necessary');
        setVisible(false);
    };

    useEffect(() => {
        const reopen = () => setVisible(true);
        window.addEventListener(OPEN_SETTINGS_EVENT, reopen);
        return () => window.removeEventListener(OPEN_SETTINGS_EVENT, reopen);
    }, []);

    if (!visible) return null;

    return (
        <aside className="cookie-banner" aria-label="Cookie Consent">
            <div className="cookie-text-section">
                <h4>
                    <span className="cookie-icon" aria-hidden="true"><i className="fas fa-cookie-bite"></i></span>
                    {t.title}
                </h4>
                <p>{t.text}</p>
            </div>

            <div className="cookie-actions">
                <button 
                    type="button" 
                    className="btn-base btn-secondary" 
                    onClick={handleReject}
                >
                    {t.btnReject}
                </button>
                <button 
                    type="button" 
                    className="btn-base btn-primary" 
                    onClick={handleAccept}
                >
                    {t.btnAccept}
                </button>
            </div>
        </aside>
    );
};

export default CookieConsent;