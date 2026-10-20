import React, { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import vehicleService from '../services/vehicleService';
import toast from 'react-hot-toast';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/home.css';

const Home = () => {
    const { lang } = useLang();
    const t = translations[lang].home;
    const navigate = useNavigate();
    const [vehicles, setVehicles] = useState([]);
    const [loading, setLoading] = useState(true);
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const homeRef = useRef(null);

    useEffect(() => {
        document.title = 'RentalCar | Home';
    }, []);

    useEffect(() => {
        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        const elements = homeRef.current?.querySelectorAll('[data-reveal]');

        if (!elements?.length || reducedMotion) {
            elements?.forEach((element) => element.classList.add('is-visible'));
            return undefined;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.14 }
        );

        elements.forEach((element) => observer.observe(element));
        return () => observer.disconnect();
    }, [loading]);

    useEffect(() => {
        const fetchVehicles = async () => {
            try {
                const data = await vehicleService.getAllVehicles();
                setVehicles((data.content || []).slice(0, 3));
            } catch (error) {
                console.error('Error fetching vehicles', error);
            } finally {
                setLoading(false);
            }
        };

        fetchVehicles();
    }, []);

    const formatDateForSearch = (date) => {
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const handleSearch = () => {
        if (!startDate || !endDate) {
            toast.error(t.toastDatesError);
            return;
        }

        navigate(`/vehicles?start=${formatDateForSearch(startDate)}&end=${formatDateForSearch(endDate)}`);
    };

    return (
        <main className="home-page" ref={homeRef}>
            <section className="home-hero">
                <div className="home-shell">
                    <div className="home-hero-copy">
                        <span className="home-eyebrow hero-enter hero-enter-1"><i className="fas fa-circle"></i> {t.heroEyebrow}</span>
                        <h1 className="hero-enter hero-enter-2">{t.heroTitle}</h1>
                        <p className="hero-enter hero-enter-3">{t.heroDesc}</p>
                        <div className="home-hero-proof hero-enter hero-enter-4">
                            <span><i className="fas fa-shield-alt"></i> {t.secureBooking}</span>
                        </div>
                    </div>

                        <aside className="home-booking-card hero-enter hero-enter-card" aria-label={t.availabilitySearchLabel}>
                        <div className="booking-card-heading">
                            <div>
                                <span>{t.bookingCardTitle}</span>
                                <small>{t.bookingCardDesc}</small>
                            </div>
                            <i className="fas fa-car-side"></i>
                        </div>

                        <div className="booking-search-field location-field">
                            <i className="fas fa-map-marker-alt"></i>
                            <label>
                                <span>{t.locationLabel}</span>
                                <input
                                    type="text"
                                    value={t.locationValue}
                                    readOnly
                                    tabIndex={-1}
                                    aria-label={t.locationLabel}
                                    aria-readonly="true"
                                />
                            </label>
                        </div>

                        <div className="booking-search-field">
                            <i className="far fa-calendar-alt"></i>
                            <label>
                                <span>{t.timelineLabel}</span>
                                <DatePicker
                                    selectsRange
                                    startDate={startDate}
                                    endDate={endDate}
                                    onChange={(update) => {
                                        const [start, end] = update;
                                        setStartDate(start);
                                        setEndDate(end);
                                    }}
                                    minDate={new Date()}
                                    isClearable
                                    placeholderText={t.placeholderDate}
                                    className="home-datepicker"
                                    dateFormat="dd MMM yyyy"
                                    popperPlacement="bottom-start"
                                    aria-label={t.timelineLabel}
                                />
                            </label>
                        </div>

                        <button type="button" className="booking-search-button" onClick={handleSearch}>
                            {t.searchBtn}<i className="fas fa-arrow-right"></i>
                        </button>
                        <p className="booking-card-note"><i className="fas fa-check"></i> {t.noHiddenFees}</p>
                    </aside>
                </div>
            </section>

            <section className="home-reassurance" aria-label={t.trustLabel}>
                <div className="home-shell reassurance-grid" data-reveal>
                    <div><i className="fas fa-calendar-check"></i><span><strong>{t.reassuranceLiveTitle}</strong>{t.reassuranceLiveDesc}</span></div>
                    <div><i className="fas fa-credit-card"></i><span><strong>{t.reassurancePricingTitle}</strong>{t.reassurancePricingDesc}</span></div>
                    <div><i className="fas fa-headset"></i><span><strong>{t.reassuranceSupportTitle}</strong>{t.reassuranceSupportDesc}</span></div>
                </div>
            </section>

            <section className="home-fleet-section">
                <div className="home-shell">
                    <div className="home-section-heading" data-reveal>
                        <div>
                            <span className="home-eyebrow">{t.availableNow}</span>
                            <h2>{t.featuredTitle}</h2>
                            <p>{t.featuredDesc}</p>
                        </div>
                        <button type="button" className="home-text-link" onClick={() => navigate('/vehicles')}>{t.viewAllVehicles} <i className="fas fa-arrow-right"></i></button>
                    </div>

                    {loading ? (
                        <div className="home-loader"><span></span><p>{t.fetching}</p></div>
                    ) : (
                        <div className="home-vehicle-grid">
                            {vehicles.map((car, index) => (
                                <article key={car.id} className="home-vehicle-card" data-reveal style={{ transitionDelay: `${index * 100}ms` }} onClick={() => navigate(`/vehicle/${car.id}`)}>
                                    <div className="home-car-image">
                                        <img src={car.images?.find((image) => image.isMain)?.url || car.images?.[0]?.url || 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070'} alt={`${car.brand} ${car.model}`} />
                                         <span>{car.category || t.premiumCollection}</span>
                                    </div>
                                    <div className="home-car-body">
                                        <div className="home-car-title"><h3>{car.brand} {car.model}</h3><small>{car.year}</small></div>
                                         <div className="home-car-specs"><span><i className="fas fa-gas-pump"></i>{car.fuelType}</span><span><i className="fas fa-shield-alt"></i>{t.protected}</span></div>
                                        <div className="home-car-footer">
                                             <div><small>{t.from}</small><strong>€{car.dailyPrice}</strong><span>/ {t.day}</span></div>
                                            <button type="button" aria-label={`${t.viewDetails} ${car.brand} ${car.model}`}><i className="fas fa-arrow-right"></i></button>
                                        </div>
                                    </div>
                                </article>
                            ))}
                        </div>
                    )}
                </div>
            </section>

            <section className="home-steps-section">
                <div className="home-shell home-steps-layout">
                    <div className="home-steps-intro" data-reveal>
                        <span className="home-eyebrow">{t.straightforwardRental}</span>
                        <h2>{t.bookingStepsTitle}</h2>
                        <p>{t.bookingStepsDesc}</p>
                    </div>
                    <div className="home-steps-grid">
                        <article data-reveal><span>01</span><i className="far fa-calendar-alt"></i><h3>{t.bookingStep1Title}</h3><p>{t.bookingStep1Desc}</p></article>
                        <article data-reveal style={{ transitionDelay: '100ms' }}><span>02</span><i className="fas fa-car-side"></i><h3>{t.bookingStep2Title}</h3><p>{t.bookingStep2Desc}</p></article>
                        <article data-reveal style={{ transitionDelay: '200ms' }}><span>03</span><i className="fas fa-credit-card"></i><h3>{t.bookingStep3Title}</h3><p>{t.bookingStep3Desc}</p></article>
                    </div>
                </div>
            </section>
        </main>
    );
};

export default Home;
