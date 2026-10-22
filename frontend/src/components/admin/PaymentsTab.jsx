import React, { useState, useEffect, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import paymentService from '../../services/paymentService';
import toast from 'react-hot-toast';
import Swal from 'sweetalert2';
import { useLang } from '../../context/LangContext';
import { useTheme } from '../../context/ThemeContext';
import { translations } from '../../i18n/translations';
import PaginationControls from './PaginationControls';
import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts';

const PaymentsTab = () => {
    const queryClient = useQueryClient();
    const { lang } = useLang();
    const { theme } = useTheme();
    const isLight = theme === 'light';
    const t = translations[lang].admin;

    const [page, setPage] = useState(1);
    const [emailSearch, setEmailSearch] = useState('');
    const [statusFilter, setStatusFilter] = useState('');
    const [sortBy, setSortBy] = useState('created_at,desc');
    const [selectedPaymentDate, setSelectedPaymentDate] = useState(null);

    const itemsPerPage = 10;

    useEffect(() => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }, [page]);

    const handleSearchChange = (e) => {
        setEmailSearch(e.target.value);
        setPage(1);
    };

    const handleStatusChange = (e) => {
        setStatusFilter(e.target.value);
        setPage(1);
    };

    const handleSortChange = (e) => {
        setSortBy(e.target.value);
        setPage(1);
    };

    const { data: paymentResponse = {}, isLoading } = useQuery({
        queryKey: ['admin-payments', page, emailSearch, statusFilter, sortBy],
        queryFn: () => paymentService.getAllPaymentsForAdmin(
            page - 1,
            itemsPerPage,
            sortBy,
            { status: statusFilter, email: emailSearch }
        ),
        refetchInterval: 10000,
        staleTime: 0,
        placeholderData: keepPreviousData
    });

    const currentPayments = paymentResponse.content || [];
    const totalPages = paymentResponse.page?.totalPages || paymentResponse.totalPages || 1;

    const statsData = useMemo(() => {
        const counts = { COMPLETED: 0, PENDING: 0, FAILED: 0, REFUNDED: 0 };
        let totalRevenue = 0;

        currentPayments.forEach((p) => {
            const status = p.status ? p.status.toUpperCase() : '';
            if (counts[status] !== undefined) counts[status]++;
            if (status === 'COMPLETED') {
                const val = typeof p.amount === 'object' ? p.amount?.amount : p.amount;
                totalRevenue += Number(val) || 0;
            }
        });

        const total = currentPayments.length || 1;
        const successRate = Math.round((counts.COMPLETED / total) * 100);

        const chart = [
            { name: t.completed, value: counts.COMPLETED, color: '#10B981' },
            { name: t.paymentAwaiting, value: counts.PENDING, color: '#F59E0B' },
            { name: t.failed, value: counts.FAILED, color: '#EF4444' },
            { name: t.refunded, value: counts.REFUNDED, color: '#6B7280' },
        ].filter(item => item.value > 0);

        return { counts, totalRevenue, successRate, chart, totalCount: currentPayments.length };
    }, [currentPayments]);

    const refundMutation = useMutation({
        mutationFn: (stripePaymentId) => paymentService.refundPayment(stripePaymentId),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['admin-payments'] });
            toast.success(t.toastRefundSuccess);
        },
        onError: (error) => {
            const errorMessage = error.response?.data?.message || t.toastOpFailed;
            toast.error(errorMessage);
        }
    });

    const confirmRefund = (payment) => {
        const amountVal = payment.amount?.amount !== undefined ? payment.amount.amount : payment.amount;
        Swal.fire({
            title: t.swalRefundTitle,
            text: `${t.swalRefundText} (€${amountVal})`,
            icon: 'warning',
            iconColor: '#ff4d00',
            background: isLight ? '#ffffff' : '#151515',
            color: isLight ? '#1f2937' : '#ffffff',
            showCancelButton: true,
            confirmButtonText: t.swalYes,
            cancelButtonText: t.swalNo,
            buttonsStyling: false,
            customClass: {
                container: 'swal-fix-overlay',
                popup: 'swal-custom-popup',
                actions: 'swal-custom-actions',
                confirmButton: 'swal-btn swal-btn-confirm',
                cancelButton: 'swal-btn swal-btn-cancel'
            }
        }).then((result) => {
            if (result.isConfirmed) {
                refundMutation.mutate(payment.stripePaymentId);
            }
        });
    };

    const getStatusBadge = (status) => {
        let badgeClass = 'status-pending';
        let iconClass = 'fa-clock';

        switch (status) {
            case 'COMPLETED':
                badgeClass = 'status-active';
                iconClass = 'fa-check-circle';
                break;
            case 'REFUNDED':
                badgeClass = 'status-oos';
                iconClass = 'fa-undo';
                break;
            case 'FAILED':
                badgeClass = 'status-oos';
                iconClass = 'fa-times-circle';
                break;
            case 'PENDING':
            default:
                badgeClass = 'status-pending';
                iconClass = 'fa-clock';
                break;
        }

        return (
            <span className={`status-badge ${badgeClass}`}>
                <i className={`fas ${iconClass}`}></i>
                {status}
            </span>
        );
    };

    const themeClass = isLight ? 'light-theme' : 'dark-theme';
    const textThemeClass = isLight ? 'light-text' : 'dark-text';
    const bgThemeClass = isLight ? 'light-bg' : 'dark-bg';

    return (
        <div className="admin-section">

            <div className="payments-dashboard-grid">
                
                <div className={`payment-kpi-card ${themeClass}`}>
                    <div className="financial-card-content">
                        <div className="financial-header">
                            <div>
                                <span className={`kpi-title ${textThemeClass}`}>{t.totalRevenue}</span>
                                <h2 className={`kpi-value-main ${textThemeClass}`}>
                                    €{statsData.totalRevenue.toLocaleString(undefined, { minimumFractionDigits: 2 })}
                                </h2>
                            </div>
                            <div className="wallet-icon-badge">
                                <i className="fas fa-wallet"></i>
                            </div>
                        </div>

                        <div className="mini-metrics-grid">
                            <div className={`mini-metric-pill success ${bgThemeClass}`}>
                                <span className={`label ${textThemeClass}`}>{t.successRate}</span>
                                <strong className="val-success">{statsData.successRate}%</strong>
                            </div>

                            <div className={`mini-metric-pill pending ${bgThemeClass}`}>
                                <span className={`label ${textThemeClass}`}>{t.paymentAwaiting}</span>
                                    <strong className="val-pending">{statsData.counts.PENDING} {t.transactions}</strong>
                            </div>
                        </div>
                    </div>
                </div>

                <div className={`payment-kpi-card ${themeClass}`}>
                    <div className="breakdown-card-content flex-row">
                        <div className="breakdown-info">
                            <span className={`kpi-title ${textThemeClass}`} style={{ display: 'block', marginBottom: '12px' }}>
                                {t.statusBreakdown}
                            </span>
                            
                            <div className="status-pills-list">
                                <div className={`status-pill-item ${bgThemeClass}`}>
                                    <span className={`status-pill-label ${textThemeClass}`}>
                                        <span className="status-dot completed"></span> {t.completed}
                                    </span>
                                    <strong style={{ color: '#10B981' }}>{statsData.counts.COMPLETED}</strong>
                                </div>

                                <div className={`status-pill-item ${bgThemeClass}`}>
                                    <span className={`status-pill-label ${textThemeClass}`}>
                                        <span className="status-dot failed"></span> {t.failed}
                                    </span>
                                    <strong style={{ color: '#EF4444' }}>{statsData.counts.FAILED}</strong>
                                </div>

                                <div className={`status-pill-item ${bgThemeClass}`}>
                                    <span className={`status-pill-label ${textThemeClass}`}>
                                        <span className="status-dot refunded"></span> {t.refunded}
                                    </span>
                                    <strong style={{ color: '#6B7280' }}>{statsData.counts.REFUNDED}</strong>
                                </div>
                            </div>
                        </div>

                        <div className="chart-wrapper-container">
                            {statsData.chart.length > 0 ? (
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={statsData.chart}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={38}
                                            outerRadius={58}
                                            paddingAngle={5}
                                            cornerRadius={4}
                                            dataKey="value"
                                        >
                                            {statsData.chart.map((entry, index) => (
                                                <Cell key={`cell-${index}`} fill={entry.color} stroke="none" />
                                            ))}
                                        </Pie>
                                        <Tooltip 
                                            contentStyle={{ 
                                                background: isLight ? '#ffffff' : '#0f172a', 
                                                borderColor: isLight ? '#cbd5e1' : '#334155', 
                                                borderRadius: '10px', 
                                                fontSize: '0.8rem',
                                                color: isLight ? '#0f172a' : '#ffffff',
                                                boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
                                            }}
                                            itemStyle={{ color: isLight ? '#0f172a' : '#ffffff', fontWeight: 'bold' }}
                                            formatter={(val, name) => [`${val} payments`, name]}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                            ) : (
                                <div className="empty-chart-success">
                                    <i className="fas fa-check-circle"></i>
                                </div>
                            )}
                            <div className="chart-center-overlay">
                                <span className={`count-text ${textThemeClass}`}>{statsData.totalCount}</span>
                                <span className={`sub-text ${textThemeClass}`}>{t.total}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>

            <div className="admin-actions-bar">
                <div className="admin-filters-group" style={{ marginLeft: 0 }}>
                    {/* Search Email */}
                    <div className="search-input-wrapper">
                        <input
                            type="text"
                            placeholder={t.searchEmail}
                            value={emailSearch}
                            onChange={handleSearchChange}
                            className="admin-filter-input"
                        />
                        <i className="fas fa-search"></i>
                    </div>

                    {/* Filter Status */}
                    <div className="filter-select-wrapper">
                        <i className="fas fa-filter select-lead-icon"></i>
                        <select value={statusFilter} onChange={handleStatusChange} className="admin-filter-select">
                            <option value="">{t.allStatuses}</option>
                            <option value="COMPLETED">COMPLETED</option>
                            <option value="PENDING">PENDING</option>
                            <option value="REFUNDED">REFUNDED</option>
                            <option value="FAILED">FAILED</option>
                        </select>
                    </div>

                    {/* Sort By Amount / Date */}
                    <div className="filter-select-wrapper">
                        <i className="fas fa-sort select-lead-icon"></i>
                        <select value={sortBy} onChange={handleSortChange} className="admin-filter-select">
                            <option value="created_at,desc">{t.sortNewest}</option>
                            <option value="created_at,asc">{t.sortOldest}</option>
                            <option value="amount,desc">{t.sortAmountHigh}</option>
                            <option value="amount,asc">{t.sortAmountLow}</option>
                        </select>
                    </div>
                </div>
            </div>

            {isLoading ? (
                <div className="loader-container" style={{ minHeight: '300px', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center' }}>
                    <div className="loader"></div>
                    <span style={{ color: isLight ? '#64748b' : '#94a3b8', fontSize: '0.8rem', fontWeight: '800', letterSpacing: '2px', marginTop: '15px' }}>
                        {t.fetchingPayments}
                    </span>
                </div>
            ) : (
                <>
                    <table className="admin-table">
                        <thead>
                            <tr>
                                <th>{t.tableEmail}</th>
                                <th>{t.tableAmount}</th>
                                <th>{t.tableStatus}</th>
                                <th>{t.tableActions}</th>
                            </tr>
                        </thead>
                        <tbody>
                            {currentPayments.length > 0 ? (
                                currentPayments.map(payment => {
                                    const amountVal = payment.amount?.amount !== undefined ? payment.amount.amount : payment.amount;
                                    const currencyVal = payment.amount?.currency || payment.currency || 'EUR';
                                    const formattedDate = payment.createdAt 
                                        ? new Date(payment.createdAt).toLocaleString() 
                                        : '-';
                                    const userEmail = payment.userEmail || payment.email || payment.user?.email || '-';

                                    return (
                                        <tr key={payment.id}>
                                            <td style={{ fontSize: '0.9rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                                                <i className="fas fa-envelope" style={{ marginRight: '8px', color: isLight ? '#64748b' : '#94a3b8' }}></i>
                                                {userEmail}
                                            </td>
                                            <td>
                                                <strong style={{ fontSize: '1.05rem', color: isLight ? '#0f172a' : '#ffffff' }}>
                                                    €{amountVal}
                                                </strong>
                                                <span style={{ fontSize: '0.75rem', color: isLight ? '#64748b' : '#94a3b8', marginLeft: '5px' }}>
                                                    {currencyVal.toUpperCase()}
                                                </span>
                                            </td>
                                            <td>{getStatusBadge(payment.status)}</td>
                                            <td className="actions-cell">
                                                 <button className="status-btn details-btn" onClick={() => setSelectedPaymentDate(formattedDate)}>
                                                    <i className="fas fa-eye"></i> {t.btnDetails || 'Details'}
                                                </button>

                                                {payment.receiptUrl && (
                                                    <a 
                                                        href={payment.receiptUrl} 
                                                        target="_blank" 
                                                        rel="noopener noreferrer" 
                                                         className="status-btn details-btn"
                                                    >
                                                        <i className="fas fa-receipt"></i> {t.btnReceipt}
                                                    </a>
                                                )}

                                                {payment.status === 'COMPLETED' && (
                                                    <button 
                                                        className="btn-status-toggle btn-oos" 
                                                        onClick={() => confirmRefund(payment)}
                                                    >
                                                         <i className="fas fa-undo"></i> {t.btnRefund}
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    );
                                })
                            ) : (
                                <tr>
                                    <td colSpan="4" style={{ textAlign: 'center', padding: '20px', color: isLight ? '#64748b' : '#94a3b8' }}>
                                         {t.noPaymentsFound}
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>

                    <PaginationControls 
                        currentPage={page} 
                        totalPages={totalPages} 
                        onPageChange={setPage} 
                    />
                </>
            )}

            {selectedPaymentDate && (
                <div className="modal-overlay details-modal-overlay" onClick={() => setSelectedPaymentDate(null)}>
                    <div className="admin-modal reservation-details-modal" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-heading-row">
                            <h3>{t.paymentDetails}</h3>
                            <button className="modal-close-btn" onClick={() => setSelectedPaymentDate(null)}>
                                ×
                            </button>
                        </div>
                        <div className="reservation-details-grid" style={{ gridTemplateColumns: '1fr', textAlign: 'center', padding: '20px 0' }}>
                            <div>
                                <span style={{ fontSize: '0.9rem', color: isLight ? '#64748b' : '#94a3b8', display: 'block', marginBottom: '8px' }}>
                                    <i className="fas fa-calendar-alt" style={{ marginRight: '6px' }}></i>
                                    {t.tableDate}
                                </span>
                                <strong style={{ fontSize: '1.2rem', color: isLight ? '#0f172a' : '#ffffff' }}>{selectedPaymentDate}</strong>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default PaymentsTab;
