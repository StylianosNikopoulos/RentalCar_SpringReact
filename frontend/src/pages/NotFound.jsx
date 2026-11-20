import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/notfound.css'; 

const NotFound = () => {
    const { lang } = useLang();
    const t = translations[lang].notFound;

    useEffect(() => {
        document.title = `RentalCar | ${t.title}`;
    }, [t.title]);

    return (
        <div className="notfound-container">
            <h1 className="notfound-code">404</h1>
            <h2 className="notfound-title">{t.title}</h2>
            <Link to="/" className="notfound-btn">
                {t.backHome}
            </Link>
        </div>
    );
};

export default NotFound;