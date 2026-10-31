import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, Link, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";
import vehicleService from '../services/vehicleService';
import reservationService from '../services/reservationService';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/details.css';

const VehicleDetailsPage = () => {

    useEffect(() => {
        document.title = 'RentalCar | Vehicle Details';
    }, []);

    const { lang } = useLang();
    const t = translations[lang]?.details || {};

    const { id } = useParams();
    const navigate = useNavigate();
    const location = useLocation();
    const queryClient = useQueryClient();
    const { user } = useAuth();
    
    const [startDate, setStartDate] = useState(null);
    const [endDate, setEndDate] = useState(null);
    const [acceptedTerms, setAcceptedTerms] = useState(false);
    const [isActionPending, setIsActionPending] = useState(false);
    const [activeImageIndex, setActiveImageIndex] = useState(0);

    useEffect(() => {
        const params = new URLSearchParams(location.search);
        const start = params.get('start');
        const end = params.get('end');

        if (start && end) {
            setStartDate(new Date(`${start}T10:00:00`));
            setEndDate(new Date(`${end}T10:00:00`));
        }
    }, [location.search]);

    const { data: vehicle, isLoading: vehicleLoading } = useQuery({
        queryKey: ['vehicle', id],
        queryFn: () => vehicleService.getVehicleById(id),
        enabled: !isActionPending
    });

    const { data: bookedDates = [], isLoading: datesLoading } = useQuery({
        queryKey: ['vehicle-reservations', id],
        queryFn: async () => {
            const data = await reservationService.getVehicleReservations(id);
            const safeReservations = Array.isArray(data) ? data : [];
            return safeReservations.map(res => {
                if (res.period?.start && res.period?.end) {
                    const dStart = new Date(res.period.start);
                    const dEnd = new Date(res.period.end);
                    dStart.setHours(0, 0, 0, 0);
                    dEnd.setHours(23, 59, 59, 999); 
                    return { start: dStart, end: dEnd };
                }
                return null;
            }).filter(Boolean);
        },
        enabled: !isActionPending
    });

    useEffect(() => {
        setActiveImageIndex(0);
    }, [id]);

    const bookingMutation = useMutation({
        mutationFn: (bookingData) => reservationService.createReservation(bookingData),
        onMutate: () => setIsActionPending(true),
        onSuccess: async (reservation) => {
            queryClient.invalidateQueries({ queryKey: ['vehicle-reservations', id] });

            try {
                const payment = await paymentService.initiatePayment(reservation.id);
                if (payment?.url) {
                    window.location.href = payment.url;
                    return;
                }
                throw new Error('Payment URL not found');
            } catch (error) {
                setIsActionPending(false);
                const message = error.response?.data?.message || '';
                toast.error(message.includes('Stripe Session Creation Failed')
                    ? t.stripeSessionError
                    : (message || t.toastPaymentInitError || 'Payment could not be started'));
                navigate('/reservations');
            }
        },
        onError: (error) => {
            setIsActionPending(false);
            toast.error(error.response?.data?.message || t.toastBookingError || 'Failed to complete reservation');
        }
    });

    const handleBooking = async (e) => {
        e.preventDefault(); 
        if (bookingMutation.isPending || isActionPending) return;
        if (!user) {
            toast.error(t.toastLoginReq || 'Please log in to make a reservation');
            navigate('/login');
            return;
        }
        if (!acceptedTerms) {
            toast.error(t.toastTermsReq || 'You must agree to the rental terms');
            return;
        }
        if (!startDate || !endDate) {
            toast.error(t.toastDatesReq || 'Please select valid rental dates');
            return;
        }

        const formatForBackend = (date) => {
            if (!date) return null;
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            return `${year}-${month}-${day}T10:00:00`;
        };

        const bookingData = {
            vehicleId: id,
            startDate: formatForBackend(startDate),
            endDate: formatForBackend(endDate)
        };

        bookingMutation.mutate(bookingData);
    };

    if ((vehicleLoading || datesLoading) && !isActionPending) {
        return (
            <div className="details-container details-loader-page">
                <div className="loader-container">
                    <div className="luxury-spinner"></div>
                    <span className="loader-text">{t.fetching || t.loadingDetails}</span>
                </div>
            </div>
        );
    }

    if (!vehicle) {
        return (
            <div className="error-message">
                <h2>{t.errorNotFound}</h2>
                <button onClick={() => navigate('/vehicles')} className="back-btn">
                    {t.exploreFleet}
                </button>
            </div>
        );
    }

    const allImages = vehicle.images && vehicle.images.length > 0 
        ? vehicle.images 
        : [{ url: 'https://images.unsplash.com/photo-1503376780353-7e6692767b70?q=80&w=2070' }];

    const rentalDays = startDate && endDate ? Math.max(1, Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24))) : 0;
    const estimatedTotal = rentalDays * Number(vehicle.dailyPrice || 0);

    return (
        <div className="details-container">
            <div className="details-top-bar">
                <button onClick={() => navigate(-1)} className="back-link">
                    <i className="fas fa-arrow-left"></i> {t.fleetOverview}
                </button>
            </div>

            <div className="details-header">
                <div className="header-main">
                    <div className="brand-meta">
                        <span className="brand-subtitle">{vehicle.brand}</span>
                        <h1>{vehicle.brand} <span className="model-accent">{vehicle.model}</span></h1>
                    </div>
                    <div className="price-tag">
                        <div className="price-wrapper">
                            <span className="currency">€</span>
                            <span className="amount">{vehicle.dailyPrice}</span>
                        </div>
                        <span className="per-day">/ {t.perDay}</span>
                    </div>
                </div>
            </div>

            <div className="details-grid-v2">
                <div className="vehicle-info-main">
                    <div className="vehicle-gallery-wrapper">
                        <div className="main-vehicle-swiper">
                            <img
                                src={allImages[activeImageIndex]?.url}
                                alt={`${vehicle.brand} ${activeImageIndex + 1}`}
                                className="swiper-vehicle-img"
                            />
                            {allImages.length > 1 && (
                                <div className="gallery-thumbnails">
                                    {allImages.map((img, index) => (
                                        <button
                                            type="button"
                                            key={img.url || index}
                                            className={index === activeImageIndex ? 'gallery-thumbnail is-active' : 'gallery-thumbnail'}
                                            onClick={() => setActiveImageIndex(index)}
                                            aria-label={`Show image ${index + 1}`}
                                        >
                                            <img src={img.url} alt="" />
                                        </button>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="real-car-features">
                        <h2>{t.specifications}</h2>
                        <div className="features-grid">
                            <div className="feature-item">
                                <i className="fas fa-gas-pump"></i>
                                <div className="feature-meta">
                                    <span>{t.fuelType}</span>
                                    <strong>{vehicle.fuelType}</strong>
                                </div>
                            </div>
                            <div className="feature-item">
                                <i className="fas fa-calendar-alt"></i>
                                <div className="feature-meta">
                                    <span>{t.yearModel}</span>
                                    <strong>{vehicle.year}</strong>
                                </div>
                            </div>
                            <div className="feature-item">
                                <i className="fas fa-car-side"></i>
                                <div className="feature-meta">
                                    <span>{t.modelLabel}</span>
                                    <strong>{vehicle.model}</strong>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="booking-sidebar">
                    <div className={`booking-card ${bookingMutation.isPending || isActionPending ? 'submitting' : ''}`}>
                        {(bookingMutation.isPending || isActionPending) && (
                            <div className="booking-overlay">
                                <div className="mini-loader"></div>
                            </div>
                        )}
                        <div className="card-header">
                            <span className="booking-step">{t.bookingStep}</span>
                            <h3>{t.sidebarTitle}</h3>
                            <p>{t.chooseDates}</p>
                        </div>
                        
                        <form onSubmit={handleBooking}>
                            <div className="form-group date-picker-group">
                                <label><i className="far fa-calendar-alt"></i> {t.rentalInterval}</label>
                                <div className="inline-datepicker-wrapper">
                                    <DatePicker
                                        inline
                                        selectsRange={true}
                                        startDate={startDate}
                                        endDate={endDate}
                                        onChange={(update) => {
                                            const [start, end] = update;
                                            setStartDate(start);
                                            setEndDate(end);
                                        }}
                                        minDate={new Date(new Date().setDate(new Date().getDate() + 1))}
                                        excludeDateIntervals={bookedDates}
                                        monthsShown={1}
                                    />
                                </div>
                            </div>

                            <div className="invoice-breakdown">
                                <h4>{t.priceBreakdown}</h4>
                                <div className="invoice-row">
                                    <span>{t.dailyRate}</span>
                                    <span>€{vehicle.dailyPrice}</span>
                                </div>
                                <div className="invoice-row">
                                    <span>{t.duration}</span>
                                    <span>{rentalDays} {rentalDays === 1 ? t.daySingle : t.dayPlural}</span>
                                </div>
                                <div className="invoice-row">
                                    <span>{t.rentalProtection}</span>
                                    <span className="free-badge">{t.included}</span>
                                </div>
                                <div className="invoice-total">
                                    <span>{t.estimatedTotal}</span>
                                    <strong>{rentalDays ? `€${estimatedTotal.toFixed(2)}` : t.selectDates}</strong>
                                </div>
                            </div>

                            <div className="terms-checkbox-group">
                                <label className="checkbox-container">
                                    <input 
                                        type="checkbox" 
                                        checked={acceptedTerms} 
                                        onChange={(e) => setAcceptedTerms(e.target.checked)}
                                        disabled={bookingMutation.isPending || isActionPending}
                                    />
                                    <span className="checkmark"></span>
                                    <span className="checkbox-text">
                                        {t.agreeTo} <Link to="/terms" target="_blank">{t.termsConditions}</Link>
                                    </span>
                                </label>
                            </div>

                            <button 
                                type="submit" 
                                className="confirm-glow-btn" 
                                disabled={bookingMutation.isPending || isActionPending}
                            >
                                {bookingMutation.isPending || isActionPending 
                                    ? t.btnProcessing
                                    : (user ? t.btnReserve : t.btnLoginToBook)}
                            </button>
                            <p className="booking-note"><i className="fas fa-lock"></i> {t.bookingNote}</p>
                        </form>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VehicleDetailsPage;