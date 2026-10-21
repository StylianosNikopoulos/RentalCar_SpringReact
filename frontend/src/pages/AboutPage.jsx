import React, { useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useLang } from "../context/LangContext";
import { translations } from "../i18n/translations";
import "../assets/styles/about.css";

const AboutPage = () => {
  const navigate = useNavigate();
  const { lang } = useLang();
  const t = translations[lang].about;

  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
      document.title = 'RentalCar | About Us';
  }, []);

  return (
    <div className="about-container">

      <div className="portfolio-alert">
        <div className="alert-content">
          <i className="fas fa-info-circle"></i>
          <div className="alert-text">
            <h4>{t.badgeTitle}</h4>
            <p>{t.badgeText}</p>
          </div>
        </div>
      </div>

      <div className="about-content-wrapper">

        <div className="section-header">
          <p>{t.overview}</p>
          <h2>{t.subtitle}</h2>
        </div>

        <div className="about-grid">

          <div className="about-card">
            <div className="about-icon"><i className="fab fa-docker"></i></div>
            <h3>{t.card1Title}</h3>
            <p>{t.card1Text}</p>
          </div>

          <div className="about-card">
            <div className="about-icon"><i className="fas fa-server"></i></div>
            <h3>{t.card2Title}</h3>
            <p>{t.card2Text}</p>
          </div>

          <div className="about-card">
            <div className="about-icon"><i className="fas fa-shield-alt"></i></div>
            <h3>{t.card3Title}</h3>
            <p>{t.card3Text}</p>
          </div>

        </div>

        <div className="about-cta-section">
          <p>{t.cta}</p>
          <button className="explore-btn" onClick={() => navigate("/vehicles")}>
            {t.button}
          </button>
          <div className="about-legal-links">
            <Link to="/terms">{t.terms}</Link>
            <Link to="/privacy">{t.privacy}</Link>
          </div>
        </div>

      </div>
    </div>
  );
};

export default AboutPage;