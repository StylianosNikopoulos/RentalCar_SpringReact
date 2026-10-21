import React, { useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import { openCookieSettings } from '../services/analytics';
import '../assets/styles/privacy.css';

const PrivacyPage = () => {
    const { lang } = useLang();
    const t = translations[lang].privacy;

    useEffect(() => {
        document.title = `RentalCar | ${t.title}`;
    }, [t.title]);

    return (
        <div className="privacy-container">
            <header className="privacy-header">
                <p>{t.eyebrow}</p>
                <h1>{t.titleMain} <span>{t.titleSub}</span></h1>
                <div className="privacy-template-note"><i className="fas fa-info-circle"></i>{t.templateNote}</div>
            </header>
            <article className="privacy-content">
                {t.sections.map((section) => (
                    <section className="privacy-section" key={section.title}>
                        <h2>{section.title}</h2>
                        {section.paragraphs?.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
                        {section.items && <ul>{section.items.map((item) => <li key={item}>{item}</li>)}</ul>}
                    </section>
                ))}
                <section className="privacy-section privacy-cookie-action">
                    <h2>{t.cookiesTitle}</h2>
                    <p>{t.cookiesText}</p>
                    <button type="button" onClick={openCookieSettings}>
                        <i className="fas fa-cookie-bite"></i>{t.cookieSettings}
                    </button>
                </section>
                <p className="privacy-updated"><strong>{t.updatedLabel}</strong> {t.updated}</p>
                <p className="privacy-demo-disclaimer">{t.demoDisclaimer}</p>
            </article>
        </div>
    );
};

export default PrivacyPage;
