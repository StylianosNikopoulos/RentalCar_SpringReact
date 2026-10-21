import React from 'react';
import { Link } from 'react-router-dom';
import '../../assets/styles/footer.css'; 
import { useLang } from '../../context/LangContext';
import { translations } from '../../i18n/translations';
import { openCookieSettings } from '../../services/analytics';

const Footer = () => {
    const { lang } = useLang();
    const t = translations[lang].footer;

    return (
        <footer className="footer-root">
            <div className="footer-main-container">
                <div className="footer-top-grid">
                    <div className="footer-brand-column">
                        <Link to="/" className="footer-main-logo">
                            RENTAL<span>CAR</span>
                        </Link>
                        <p className="footer-brand-tagline">
                            {t.tagline}
                        </p>
                        <span className="footer-trust-note"><i className="fas fa-shield-alt"></i> {t.trustNote}</span>
                    </div>

                    <div className="footer-nav-column">
                        <h4>{t.company}</h4>
                        <div className="footer-links-list">
                            <Link to="/about">{t.about}</Link>
                            <Link to="/vehicles">{t.fleet}</Link>
                        </div>
                    </div>

                    <div className="footer-nav-column">
                        <h4>{t.legal}</h4>
                        <div className="footer-links-list">
                            <Link to="/terms">{t.terms}</Link>
                            <Link to="/privacy">{t.privacy}</Link>
                            <button type="button" className="footer-cookie-link" onClick={openCookieSettings}>
                                {t.cookieSettings}
                            </button>
                        </div>
                    </div>

                    <div className="footer-nav-column">
                        <h4>{t.contact}</h4>
                        <div className="footer-links-list">
                            <a href="mailto:info@rentalcar.com">info@rentalcar.com</a>
                            <a href="tel:+30231055555">+30 231 055 555</a>
                        </div>
                    </div>
                </div>

                <div className="footer-main-divider"></div>

                <div className="footer-bottom-bar">
                    <p className="footer-copyright">
                        &copy; {new Date().getFullYear()} RentalCar. {t.rights}
                    </p>

                    <div className="footer-social-links">
                        <a href="https://instagram.com" target="_blank" rel="noreferrer">INSTAGRAM</a>
                        <a href="https://facebook.com" target="_blank" rel="noreferrer">FACEBOOK</a>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
