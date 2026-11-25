import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import reservationService from '../services/reservationService';
import paymentService from '../services/paymentService';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2'; 
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import '../assets/styles/reservations.css'; 
import '../assets/styles/swal-custom.css';

const calculateGlobalTimeLeft = (createdAt) => {
    if (!createdAt) return 0;
    let dateStr = createdAt;
    if (typeof createdAt === 'string') {
        if (dateStr.includes('.')) {
            const parts = dateStr.split('.');
            dateStr = parts[0] + '.' + parts[1].substring(0, 3);
        }
        if (!dateStr.endsWith('Z')) dateStr += 'Z';
    }
    const createdDate = new Date(dateStr);
    if (isNaN(createdDate.getTime())) return 0;

    const expirationTime = createdDate.getTime() + (60 * 60 * 1000);
    const now = new Date().getTime();
    const difference = expirationTime - now;
    return difference > 0 ? difference : 0;
};

const ReservationTimer = ({ createdAt, onExpire }) => {
    const { lang } = useLang();
    const t = translations[lang].myReservations;
    const [timeLeft, setTimeLeft] = useState(calculateGlobalTimeLeft(createdAt));

    useEffect(() => {
        const timer = setInterval(() => {
            const nextTime = calculateGlobalTimeLeft(createdAt);
            setTimeLeft(nextTime);
            if (nextTime <= 0) {
                clearInterval(timer);
                onExpire();
            }
        }, 1000);
        return () => clearInterval(timer);
    }, [createdAt, onExpire]);

    if (timeLeft <= 0) {
        return (
            <span className="timer-expired">
                <i className="fas fa-exclamation-circle"></i> {t.timerExpired}
            </span>
        );
    }

    const minutes = Math.floor((timeLeft / 1000 / 60) % 60);
    const seconds = Math.floor((timeLeft / 1000) % 60);

    return (
        <span className="res-timer">
            <i className="fas fa-clock"></i> {minutes}{t.timerMin} {seconds < 10 ? `0${seconds}` : seconds}{t.timerSec}
        </span>
    );
};

const MyReservationPage = () => {

    useEffect(() => {
        document.title = 'RentalCar | My Reservations';
    }, []);

    const { lang } = useLang();
    const t = translations[lang].myReservations;

    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const [currentPage, setCurrentPage] = useState(1);
    const [isActionPending, setIsActionPending] = useState(false);
    const bookingsPerPage = 3;

    useEffect(() => {
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        });
    }, [currentPage]);

    const { data: reservationResponse = {}, isLoading } = useQuery({
        queryKey: ['myReservations', currentPage],
        queryFn: () => reservationService.getMyReservations(currentPage - 1, bookingsPerPage),
        refetchInterval: 10000,
        keepPreviousData: true,
        enabled: !isActionPending
    });

    const currentBookings = reservationResponse.content || [];
    const totalPages = reservationResponse.page?.totalPages || 1;
    const isTotalElementsZero = reservationResponse.page?.totalElements === 0;

    const statusLabel = (status) => {
        const labels = {
            PENDING: t.pendingStatus,
            CONFIRMED: t.confirmedStatus,
            CANCELED: t.canceledStatus,
            COMPLETED: t.completedStatus
        };
        return labels[status] || status.replace(/_/g, ' ');
    };

    const cancelMutation = useMutation({
        mutationFn: (id) => reservationService.cancelReservation(id),
        onMutate: () => {
            setIsActionPending(true);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['myReservations'] });
            toast.success(t.toastCancelSuccess);
            if (currentBookings.length === 1 && currentPage > 1) {
                setCurrentPage(prev => prev - 1);
            }
        },
        onError: () => {
            toast.error(t.toastCancelError);
        },
        onSettled: () => {
            setIsActionPending(false);
        }
    });

    useEffect(() => {
        const query = new URLSearchParams(window.location.search);
        if (query.get("success")) {
            toast.success(t.toastPaymentSuccess);
            queryClient.invalidateQueries({ queryKey: ['myReservations'] });
            window.history.replaceState({}, document.title, window.location.pathname);
        }
        if (query.get("canceled")) {
            toast.error(t.toastPaymentCanceled);
            window.history.replaceState({}, document.title, window.location.pathname);
        }
    }, [queryClient, t]);

    const handleCancel = (reservationId) => {
        if (isActionPending) return;

        Swal.fire({
            title: t.swalCancelTitle,
            text: t.swalCancelText,
            icon: 'warning',
            iconColor: '#ff4d00',
            background: '#121212',
            showCancelButton: true,
            confirmButtonText: t.swalYes,
            cancelButtonText: t.swalNo,
            buttonsStyling: false,
            customClass: {
                container: 'swal-fix-overlay', 
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                actions: 'swal-custom-actions',
                confirmButton: 'swal-btn swal-btn-confirm',
                cancelButton: 'swal-btn swal-btn-cancel'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                cancelMutation.mutate(reservationId);
            }
        });
    };

    const handleCheckOut = async (res) => {
        if (isActionPending) return;

        setIsActionPending(true);
        const loadingToast = toast.loading(t.toastRedirecting);
        try {
            const data = await paymentService.initiatePayment(res.id);
            toast.dismiss(loadingToast);
            if (data?.url) {
                window.location.href = data.url; 
            } else {
                setIsActionPending(false);
                toast.error(t.toastPaymentUrlError);
            }
        } catch (error) {
            setIsActionPending(false);
            toast.dismiss(loadingToast);
            const message = error.response?.data?.message || '';
            toast.error(message.includes('Stripe Session Creation Failed')
                ? t.stripeSessionError
                : (message || t.toastPaymentInitError));
        }
    };

    return (
        <div className="reservations-container">
            <div className="reservations-header">
                <span className="reservations-badge">PORTAL</span>
                <h2>{t.title}</h2>
                <p>{t.subtitle}</p>
            </div>

            {isLoading && !isActionPending ? (
                <div className="loader-container">
                    <div className="loader"></div>
                    <span className="loader-text">{t.fetching}</span>
                </div>
            ) : isTotalElementsZero ? (
                <div className="empty-state">
                    <div className="empty-icon">
                        <i className="fas fa-car-side"></i>
                    </div>
                    <h3>{t.noBookingsTitle}</h3>
                    <p>{t.noBookingsDesc}</p>
                    <button 
                        onClick={() => navigate('/vehicles')} 
                        className="checkOut-btn-premium empty-action-btn"
                        disabled={isActionPending}
                    >
                        <span>{t.btnExplore}</span>
                        <i className="fas fa-arrow-right"></i>
                    </button>
                </div>
            ) : (
                <>
                    <div className="res-list-container">
                        {currentBookings.map((res) => {
                            const status = res.status.toUpperCase();
                            const isExpired = calculateGlobalTimeLeft(res.createdAt) <= 0;
                            const currentLocale = lang === 'gr' ? 'el-GR' : 'en-GB';
                            const formatReservationDate = (date) => date
                                ? new Date(date).toLocaleDateString(currentLocale, { day: '2-digit', month: 'short', year: 'numeric' })
                                : 'N/A';

                            return (
                                <div key={res.id} className={`res-card status-border-${res.status.toLowerCase()}`}>
                                    <div className="res-card-accent"></div>
                                    <div className="res-meta-section">
                                        <div className="res-vehicle-block">
                                            <div className="car-icon-wrapper">
                                                <i className="fas fa-car car-placeholder-icon"></i>
                                            </div>
                                            <div className="vehicle-details">
                                                <h4>{res.vehicleBrand} <span>{res.vehicleName}</span></h4>
                                            </div>
                                        </div>
                                        
                                        <div className="res-timeline-block">
                                            <div className="timeline-item">
                                                <small>{t.rentalPeriod}</small>
                                                <div className="timeline-dates">
                                                    <span className="date-pill">
                                                        <i className="far fa-calendar-alt"></i>
                                                        {formatReservationDate(res.period?.start)}
                                                    </span>
                                                    <span className="arrow-sep"><i className="fas fa-long-arrow-alt-right"></i></span>
                                                    <span className="date-pill">
                                                        <i className="far fa-calendar-check"></i>
                                                        {formatReservationDate(res.period?.end)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    <div className="res-status-actions-section">
                                        <div className="res-pricing-status">
                                            <div className="status-badge-wrapper">
                                                <span className={`status-badge ${res.status.toLowerCase().replace(/\s+/g, '_')}`}>
                                                    <span className="status-dot"></span>
                                                     {statusLabel(status)}
                                                 </span>
                                                {status === 'PENDING' && (
                                                    <ReservationTimer 
                                                        createdAt={res.createdAt} 
                                                        onExpire={() => queryClient.invalidateQueries({ queryKey: ['myReservations'] })} 
                                                    />
                                                )}
                                            </div>
                                             <div className="res-total-price">
                                                <span>{t.totalAmount}</span>
                                                <strong>€{res.totalAmount?.toFixed(2)}</strong>
                                             </div>
                                             {status === 'PENDING' && !isExpired && (
                                                 <p className="pending-payment-note">
                                                     <i className="fas fa-info-circle"></i> {t.pendingDescription}
                                                 </p>
                                             )}
                                        </div>

                                        <div className="res-actions">
                                            {status === 'PENDING' && !isExpired && (
                                                <button 
                                                    onClick={() => handleCheckOut(res)} 
                                                    className="checkOut-btn-premium"
                                                    disabled={isActionPending}
                                                >
                                                    <span>{t.btnCheckout}</span>
                                                    <i className="fas fa-credit-card"></i>
                                                </button>
                                            )}
                                            {/* TODO Refund Action */}
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    {totalPages > 1 && (
                        <div className="pagination">
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1 || isActionPending}
                            >
                                <i className="fas fa-chevron-left"></i> {t.btnPrevious}
                            </button>
                            <span className="page-info">
                                <span className="current-page">{currentPage}</span> / {totalPages}
                            </span>
                            <button 
                                className="page-btn"
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages || isActionPending}
                            >
                                {t.btnNext} <i className="fas fa-chevron-right"></i>
                            </button>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default MyReservationPage;