import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import userService from '../services/userService';
import authService from '../services/authService';
import toast from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { useLang } from '../context/LangContext';
import { translations } from '../i18n/translations';
import Swal from 'sweetalert2';
import '../assets/styles/profile.css';
import '../assets/styles/swal-custom.css';

const ProfilePage = () => {

    useEffect(() => {
        document.title = 'RentalCar | Profile Page';
    }, []);

    const { lang } = useLang();
    const t = translations[lang].profile;

    const { user: authData, logout } = useAuth();
    const navigate = useNavigate();
    const [fullUser, setFullUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    const [editData, setEditData] = useState({ 
        firstName: '', 
        lastName: '',
        phoneNumber: '', 
        address: '', 
        driverLicenseNumber: '' 
    });

    const LICENSE_CATEGORIES = [
        { value: '', label: t.selectCategory },
        { value: 'AM', label: 'AM (Moped)' },
        { value: 'A1', label: 'A1 (Light Motorcycle)' },
        { value: 'A2', label: 'A2 (Medium Motorcycle)' },
        { value: 'A', label: 'A (Full Motorcycle)' },
        { value: 'B', label: 'B (Car)' },
        { value: 'B1', label: 'B1 (Quadricycles)' },
        { value: 'BE', label: 'BE (Car + Trailer)' },
        { value: 'C1', label: 'C1 (Medium Truck)' },
        { value: 'C', label: 'C (Large Truck)' },
        { value: 'D', label: 'D (Bus)' }
    ];

    useEffect(() => {
        const fetchUserData = async () => {
            try {
                const data = await userService.getMyProfile();
                setFullUser(data);
                setEditData({ 
                    firstName: data.firstName || '', 
                    lastName: data.lastName || '',
                    phoneNumber: data.phoneNumber || '',
                    address: data.address || '',
                    driverLicenseNumber: data.driverLicenseNumber || ''
                });
            } catch (error) {
                toast.error(t.toastLoadError);
            } finally {
                setLoading(false);
            }
        };
        if (authData) fetchUserData();
    }, [authData, t]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (isSubmitting) return;

        setIsSubmitting(true);
        try {
            const updated = await userService.updateMyProfile(editData);
            setFullUser(updated);
            setIsEditing(false);
            toast.success(t.toastUpdateSuccess);
        } catch (error) {
            const errorMessage = error.response?.data?.message || t.toastUpdateError;
            const validationErrors = error.response?.data?.errors; 
            
            if (validationErrors) {
                Object.values(validationErrors).forEach(err => toast.error(err));
            } else {
                toast.error(errorMessage);
            }
            console.error(error.response?.data);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleRequestReset = async () => {
        if (isSubmitting || !fullUser?.email) return;

        setIsSubmitting(true);
        const loadingToast = toast.loading(t.toastLoading || "Sending reset link...");
        try {
            await authService.forgotPassword(fullUser.email);
            toast.success(t.toastResetSuccess, { id: loadingToast });
        } catch (error) {
            toast.error(t.toastResetError, { id: loadingToast });
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDeleteAccount = () => {
        if (isSubmitting) return;

        Swal.fire({
            title: t.swalDeleteTitle,
            text: t.swalDeleteText,
            icon: 'warning',
            iconColor: '#ff4d00',
            background: '#121212',
            showCancelButton: true,
            confirmButtonText: t.swalConfirmBtn,
            cancelButtonText: t.swalCancelBtn,
            target: '.profile-container', 
            heightAuto: false, 
            buttonsStyling: false,
            customClass: {
                container: 'swal-fix-overlay', 
                popup: 'swal-custom-popup',
                title: 'swal-custom-title',
                htmlContainer: 'swal-custom-html',
                actions: 'swal-custom-actions',
                confirmButton: 'swal-btn swal-btn-confirm',
                cancelButton: 'swal-btn swal-btn-cancel'
            }
        }).then(async (result) => {
            if (result.isConfirmed) {
                setIsSubmitting(true);
                const loadingToast = toast.loading("Deleting account...");
                try {
                    await userService.deleteMyProfile();
                    toast.success(t.toastDeleteSuccess, { id: loadingToast });
                    logout();
                    navigate('/');
                } catch (error) {
                    setIsSubmitting(false);
                    toast.error(t.toastDeleteError, { id: loadingToast });
                }
            }
        });
    };

    return (
        <div className="profile-container">
            <header className="profile-header">
                <span className="profile-badge">{t.dashboardBadge}</span>
                <h1>{t.title}</h1>
                <p>{t.subtitle}</p>
            </header>

            {loading ? (
                <div className="loader-container">
                    <div className="loader"></div>
                    <span className="loader-text">{t.fetching}</span>
                </div>
            ) : (
                <div className="profile-grid">
                    <aside className="profile-card">
                        <div className="profile-card-accent"></div>
                        
                        <div className="avatar-wrapper">
                            <div className="avatar-circle">
                                {fullUser?.firstName?.charAt(0).toUpperCase()}
                            </div>
                            <span className="status-indicator-dot" title={t.activeAccount}></span>
                        </div>

                        <h3>{fullUser?.firstName} {fullUser?.lastName}</h3>
                        
                        <div className="role-badge-wrapper">
                            <span className="role-badge">
                                <i className="fas fa-user-shield"></i>
                                {fullUser?.role || 'CUSTOMER'}
                            </span>
                        </div>
                        
                        <div className="profile-card-actions">
                            <button 
                                className={isEditing ? "discard-btn" : "confirm-glow-btn"} 
                                onClick={() => setIsEditing(!isEditing)}
                                disabled={isSubmitting}
                            >
                                {isEditing ? (
                                    <><span>{t.btnDiscard}</span><i className="fas fa-times"></i></>
                                ) : (
                                    <><span>{t.btnModify}</span><i className="far fa-edit"></i></>
                                )}
                            </button>
                        </div>
                    </aside>

                    <main className="info-section">
                        {!isEditing ? (
                            <div className="info-display">
                                <div className="info-section-title">
                                    <i className="fas fa-id-badge"></i>
                                    <h3>{t.personalInformation}</h3>
                                </div>

                                <div className="info-card-grid">
                                    <div className="info-group full-width">
                                        <label className="info-label"><i className="far fa-envelope"></i> {t.emailLabel}</label>
                                        <div className="info-value-box">
                                            <span>{fullUser?.email}</span>
                                            <i className="fas fa-check-circle verified-icon"></i>
                                        </div>
                                    </div>

                                    <div className="info-group">
                                        <label className="info-label"><i className="far fa-user"></i> {t.firstNameLabel}</label>
                                        <div className="info-value-box">
                                            <span>{fullUser?.firstName}</span>
                                        </div>
                                    </div>

                                    <div className="info-group">
                                        <label className="info-label"><i className="far fa-user"></i> {t.lastNameLabel}</label>
                                        <div className="info-value-box">
                                            <span>{fullUser?.lastName}</span>
                                        </div>
                                    </div>

                                    <div className="info-group">
                                        <label className="info-label"><i className="fas fa-mobile-alt"></i> {t.phoneLabel}</label>
                                        <div className="info-value-box">
                                            <span>{fullUser?.phoneNumber || t.notProvided}</span>
                                        </div>
                                    </div>

                                    <div className="info-group">
                                        <label className="info-label"><i className="fas fa-id-card"></i> {t.licenseLabel}</label>
                                        <div className="info-value-box highlight-box">
                                            <span>
                                                {fullUser?.driverLicenseNumber ? `${t.licenseCategory} ${fullUser.driverLicenseNumber}` : t.notProvided}
                                            </span>
                                            {fullUser?.driverLicenseNumber && <i className="fas fa-car-side"></i>}
                                        </div>
                                    </div>

                                    <div className="info-group full-width">
                                        <label className="info-label"><i className="far fa-map"></i> {t.addressLabel}</label>
                                        <div className="info-value-box">
                                            <span>{fullUser?.address || t.notProvided}</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <form onSubmit={handleUpdate} className="edit-form">
                                <div className="info-section-title">
                                    <i className="fas fa-user-edit"></i>
                                    <h3>{t.editProfileData}</h3>
                                </div>

                                <div className="form-row-grid">
                                    <div className="form-group">
                                        <label>{t.firstNameLabel}</label>
                                        <div className="input-with-icon">
                                            <i className="far fa-user"></i>
                                            <input 
                                                type="text" 
                                                value={editData.firstName}
                                                onChange={(e) => setEditData({...editData, firstName: e.target.value})}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                    <div className="form-group">
                                        <label>{t.lastNameLabel}</label>
                                        <div className="input-with-icon">
                                            <i className="far fa-user"></i>
                                            <input 
                                                type="text" 
                                                value={editData.lastName}
                                                onChange={(e) => setEditData({...editData, lastName: e.target.value})}
                                                required
                                                disabled={isSubmitting}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.phoneLabel}</label>
                                    <div className="input-with-icon">
                                        <i className="fas fa-mobile-alt"></i>
                                        <input 
                                            type="tel" 
                                            placeholder="6912345678"
                                            value={editData.phoneNumber}
                                            onChange={(e) => {
                                            const onlyNums = e.target.value.replace(/\D/g, '');
                                                if (onlyNums.length <= 10) {
                                                    setEditData({ ...editData, phoneNumber: onlyNums });
                                                }
                                            }}
                                            maxLength={10}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.addressLabel}</label>
                                    <div className="input-with-icon">
                                        <i className="far fa-map"></i>
                                        <input 
                                            type="text" 
                                            placeholder="Leof. Vas. Georgiou 42, Thessaloniki, 54640"
                                            value={editData.address}
                                            onChange={(e) => setEditData({...editData, address: e.target.value})}
                                            disabled={isSubmitting}
                                        />
                                    </div>
                                </div>

                                <div className="form-group">
                                    <label>{t.licenseFormLabel}</label>
                                    <div className="select-wrapper">
                                        <i className="fas fa-id-card select-icon"></i>
                                        <select 
                                            className="profile-select"
                                            value={editData.driverLicenseNumber}
                                            onChange={(e) => setEditData({...editData, driverLicenseNumber: e.target.value})}
                                            disabled={isSubmitting}
                                        >
                                            {LICENSE_CATEGORIES.map(cat => (
                                                <option key={cat.value} value={cat.value}>
                                                    {cat.label}
                                                </option>
                                            ))}
                                        </select>
                                    </div>
                                </div>

                                <button 
                                    type="submit" 
                                    className="confirm-glow-btn submit-profile-btn"
                                    disabled={isSubmitting}
                                >
                                    {isSubmitting ? (
                                        <span>{t.processing}</span>
                                    ) : (
                                        <>
                                            <span>{t.btnSave}</span>
                                            <i className="fas fa-check"></i>
                                        </>
                                    )}
                                </button>
                            </form>
                        )}

                        <section className="danger-zone">
                            <div className="danger-zone-header">
                                <div className="danger-icon-wrapper">
                                    <i className="fas fa-shield-alt danger-icon"></i>
                                </div>
                                <div>
                                    <h4>{t.securityTitle}</h4>
                                    <span className="danger-subtext">{t.securityDescription}</span>
                                </div>
                            </div>
                            
                            <div className="danger-actions-block">
                                <div className="security-item">
                                    <div className="security-info">
                                        <strong>{t.passwordResetTitle}</strong>
                                        <p>{t.passwordResetDescription}</p>
                                    </div>
                                    <button 
                                        className="security-action-btn" 
                                        onClick={handleRequestReset}
                                        disabled={isSubmitting}
                                    >
                                        <i className="fas fa-key"></i> 
                                        <span>{isSubmitting ? "..." : t.btnResetPassword}</span>
                                    </button>
                                </div>
                                
                                <div className="termination-separator"></div>

                                {fullUser?.role !== 'ADMIN' ? (
                                    <div className="account-delete-block">
                                        <div className="delete-info">
                                            <strong>{t.accountDeletionTitle}</strong>
                                            <p>{t.deleteWarning}</p>
                                        </div>
                                        <button 
                                            className="delete-btn" 
                                            onClick={handleDeleteAccount}
                                            disabled={isSubmitting}
                                        >
                                            <span>{isSubmitting ? "..." : t.btnTerminate}</span>
                                            <i className="fas fa-trash-alt"></i>
                                        </button>
                                    </div>
                                ) : (
                                    <div className="admin-notice-box">
                                        <i className="fas fa-user-shield"></i>
                                        <p className="admin-notice">{t.adminNotice}</p>
                                    </div>
                                )}
                            </div>
                        </section>
                    </main>
                </div>
            )}
        </div>
    );
};

export default ProfilePage;