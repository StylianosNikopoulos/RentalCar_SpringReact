import React, { useEffect } from 'react';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/terms.css';

const TermsPage = () => {

  useEffect(() => {
      document.title = 'RentalCar | Terms & Conditions';
  }, []);

  const { lang } = useLang();
  const t = translations[lang].terms;

  return (
    <div className="terms-container">
      <div className="terms-header">
        <h1>
          {t.titleMain} <span className="text-primary">{t.titleSub}</span>
        </h1>
        <p className="subtitle">
          {t.subtitle}
        </p>
      </div>

      <div className="terms-content">

        <section className="terms-section">
          <h2>{t.sec1Title}</h2>
          <p>{t.sec1Desc}</p>

          <ul>
            <li>
              <strong>{t.sec1Bullet1Title}</strong> {t.sec1Bullet1Text}
            </li>
            <li>
              <strong>{t.sec1Bullet2Title}</strong> {t.sec1Bullet2Text}
            </li>
            <li>
              <strong>{t.sec1Bullet3Title}</strong> {t.sec1Bullet3Text}
            </li>
            <li>
              <strong>{t.sec1Bullet4Title}</strong> {t.sec1Bullet4Text}
            </li>
          </ul>
        </section>

        <section className="terms-section">
          <h2>{t.sec2Title}</h2>
          <p>{t.sec2Desc}</p>
        </section>

        <section className="terms-section">
          <h2>{t.sec3Title}</h2>
          <p>{t.sec3Desc}</p>
        </section>

        <section className="terms-section">
          <h2>{t.sec4Title}</h2>
          <p>{t.sec4Desc}</p>
        </section>

      </div>
    </div>
  );
};

export default TermsPage;