import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import userService from '../../services/userService';
import authService from '../../services/authService';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useLang } from '../../context/LangContext';
import { translations } from '../../i18n/translations';
import PaginationControls from './PaginationControls';

const UsersTab = () => {
    const queryClient = useQueryClient();
    const { lang } = useLang();
    const t = translations[lang].admin;

    const [userPage, setUserPage] = useState(1);
    const [selectedUser, setSelectedUser] = useState(null);
    const itemsPerPage = 9;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [userPage]);

    const { data: userResponse = {}, isLoading } = useQuery({
        queryKey: ['admin-users', userPage],
        queryFn: () => userService.getAllUsers(userPage - 1, itemsPerPage),
        refetchInterval: 30000,
        staleTime: 0,
        refetchOnMount: true,
        placeholderData: keepPreviousData
    });

    const currentUsers = userResponse.content || [];
    const totalUserPages = userResponse.page?.totalPages || 1;

    const isDeletedUser = (user) => {
        if (!user) return false;
        return user.email?.startsWith('deleted_') || (user.firstName === 'Deleted' && user.lastName === 'User');
    };

    const deleteUserMutation = useMutation({
        mutationFn: (id) => userService.deleteUser(id),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
            toast.success(t.toastUserDeleted);
            if (currentUsers.length === 1 && userPage > 1) setUserPage(prev => prev - 1);
        },
        onError: () => toast.error(t.toastUserDelErr)
    });

    const refreshTokenMutation = useMutation({
        mutationFn: (userId) => authService.refreshUserTokenByUserId(userId),
        onSuccess: () => {
            toast.success(t.toastTokenRefreshed);
            queryClient.invalidateQueries({ queryKey: ['admin-users'] });
        },
        onError: (error) => {
            const msg = error.response?.data?.message || t.toastOpFailed;
            toast.error(msg);
        }
    });

    const confirmSwal = (title, text, onConfirm) => {
        Swal.fire({
            title, text, icon: 'warning', iconColor: '#ff4d00', background: '#151515',
            showCancelButton: true, confirmButtonText: t.swalYes, cancelButtonText: t.swalNo,
            buttonsStyling: false,
            customClass: {
                container: 'swal-fix-overlay', popup: 'swal-custom-popup',
                actions: 'swal-custom-actions', confirmButton: 'swal-btn swal-btn-confirm', cancelButton: 'swal-btn swal-btn-cancel'
            }
        }).then((result) => {
            if (result.isConfirmed) onConfirm();
        });
    };

    const handleDeleteUser = (id) => {
        confirmSwal(t.swalDeleteUserTitle, t.swalDeleteUserText, () => {
            deleteUserMutation.mutate(id);
        });
    };

    const handleRefreshUserToken = (user) => {
        if (!user || !user.id) {
            toast.error('Invalid user selected');
            return;
        }
        refreshTokenMutation.mutate(user.id);
    };

    return (
        <div className="admin-section">
            {isLoading ? (
                <div className="loader-container" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="loader"></div>
                    <span style={{ color: '#888', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '2px', marginTop: '15px' }}>
                        {t.fetchingUsers}
                    </span>
                </div>
            ) : (
                <>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.tableName}</th>
                                <th>{t.tableRole}</th>
                                <th>{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentUsers.map(user => {
                                const isDeleted = isDeletedUser(user);

                                return (
                                    <tr key={user.id} className={isDeleted ? 'row-out-of-service' : ''}>
                                        <td>{user.firstName} {user.lastName}</td>
                                        <td>
                                            <span className={`role-badge ${user.role ? user.role.toLowerCase() : ''}`}>
                                                {user.role}
                                            </span>
                                        </td>
                                        <td>
                                            <div className="actions-cell">
                                                <button className="status-btn details-btn" onClick={() => setSelectedUser(user)}>
                                                    <i className="fas fa-eye"></i> {t.btnDetails}
                                                </button>

                                                {!isDeleted && (
                                                    <button 
                                                        className="status-btn refresh-btn" 
                                                        onClick={() => handleRefreshUserToken(user)}
                                                        disabled={refreshTokenMutation.isPending}
                                                         title={t.btnRefresh}
                                                    >
                                                        <i className={`fas fa-sync-alt ${refreshTokenMutation.isPending ? 'fa-spin' : ''}`}></i>
                                                         {t.btnRefresh}
                                                    </button>
                                                )}

                                                {user.role !== 'ADMIN' && !isDeleted && (
                                                    <button className="btn-delete" onClick={() => handleDeleteUser(user.id)}>
                                                        <i className="fas fa-trash"></i> {t.btnDelete}
                                                    </button>
                                                )}
                                                
                                                {isDeleted && (
                                                    <span className="status-badge status-oos">
                                                         {t.badgeDeleted}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                    
                    <PaginationControls 
                        currentPage={userPage} 
                        totalPages={totalUserPages} 
                        onPageChange={setUserPage} 
                    />

                    {selectedUser && (
                        <div className="modal-overlay details-modal-overlay" onClick={() => setSelectedUser(null)}>
                            <div className="admin-modal reservation-details-modal" onClick={(event) => event.stopPropagation()}>
                                <div className="modal-heading-row">
                                    <h3>{t.userDetails}</h3>
                                    <button className="modal-close-btn" onClick={() => setSelectedUser(null)} aria-label={t.btnClose}>
                                        <span aria-hidden="true">×</span>
                                    </button>
                                </div>
                                <div className="reservation-details-grid">
                                    <div><span>{t.tableName}</span><strong>{selectedUser.firstName} {selectedUser.lastName}</strong></div>
                                    <div><span>{t.tableEmail}</span><strong>{selectedUser.email}</strong></div>
                                    <div><span>{t.tableRole}</span><strong>{selectedUser.role}</strong></div>
                                    <div><span>{t.phoneNumber}</span><strong>{selectedUser.phoneNumber || '-'}</strong></div>
                                    <div><span>{t.address}</span><strong>{selectedUser.address || '-'}</strong></div>
                                    <div><span>{t.driverLicenseNumber}</span><strong>{selectedUser.driverLicenseNumber || '-'}</strong></div>
                                </div>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
};

export default UsersTab;
