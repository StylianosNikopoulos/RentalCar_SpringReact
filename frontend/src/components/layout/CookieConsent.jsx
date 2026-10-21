import React, { useEffect, useState } from 'react';
import '../../assets/styles/cookieConsent.css';
import { useLang } from '../../context/LangContext';
import { translations } from '../../i18n/translations';

const GA_ID = import.meta.env.VITE_GA_ID;

const initializeConsentDefaults = () => {
    window.dataLayer = window.dataLayer || [];
    window.gtag = window.gtag || function () {
        window.dataLayer.push(arguments);
    };

    if (!window.__ga_consent_default) {
        window.gtag('consent', 'default', {
            analytics_storage: 'denied',
            ad_storage: 'denied',
            ad_user_data: 'denied',
            ad_personalization: 'denied',
        });
        window.__ga_consent_default = true;
    }
};

const loadAnalytics = () => {
    if (!GA_ID) {
        console.warn("Google Analytics ID is missing.");
        return;
    }
    
    if (window.__ga_loaded) return;
    window.__ga_loaded = true;

    initializeConsentDefaults();

    const script = document.createElement("script");
    script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
    script.async = true;
    document.head.appendChild(script);

    window.gtag('js', new Date());

    window.gtag('consent', 'update', {
        analytics_storage: 'granted',
        ad_storage: 'denied'
    });

    window.gtag('config', GA_ID);
};

const CookieConsent = () => {
    const [visible, setVisible] = useState(false);
    const { lang } = useLang();
    const t = translations[lang]?.cookieConsent || {};

    useEffect(() => {
        const consent = localStorage.getItem('cookieConsent');

        if (!consent) {
            setVisible(true);
        } else if (consent === 'accepted') {
            loadAnalytics();
        }
    }, []);

    const handleAccept = () => {
        localStorage.setItem('cookieConsent', 'accepted');
        initializeConsentDefaults();

        window.gtag('consent', 'update', {
            analytics_storage: 'granted',
            ad_storage: 'denied'
        });

        loadAnalytics();
        setVisible(false);
    };

    const handleReject = () => {
        localStorage.setItem('cookieConsent', 'rejected');
        initializeConsentDefaults();

        window.gtag('consent', 'update', {
            analytics_storage: 'denied',
            ad_storage: 'denied'
        });

        setVisible(false);
    };

    useEffect(() => {
        const reopen = () => setVisible(true);
        window.addEventListener('open-cookie-settings', reopen);
        return () => window.removeEventListener('open-cookie-settings', reopen);
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