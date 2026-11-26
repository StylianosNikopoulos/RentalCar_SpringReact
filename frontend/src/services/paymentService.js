import api from '../api/axios';

const paymentService = {

    // User endpoints
    handleStripeEvent: async () => {
        const response = await api.post('/payments/webhook');
        return response.data;
    }, 

    initiatePayment: async (reservationId) => {
        const response = await api.post(`/payments/initiate/${reservationId}`);
        return response.data; 
    },

    handleManualRefund: async (paymentId) => {
        const response = await api.post(`/payments/${paymentId}/refund`);
        return response.data;
    },

    // Admin endpoints
    getAllPaymentsForAdmin: async (page = 0, size = 15, sort = 'created_at,desc', filters = {}) => {
        const params = new URLSearchParams();
        params.append('page', page);
        params.append('size', size);
        if (sort) params.append('sort', sort);

        if (filters.status) params.append('status', filters.status);
        if (filters.email) params.append('email', filters.email);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const response = await api.get(`/admin/payments?${params.toString()}`);
        return response.data;
    },

    getPaymentStatistics: async (filters = {}) => {
        const params = new URLSearchParams();
        if (filters.email) params.append('email', filters.email);
        if (filters.startDate) params.append('startDate', filters.startDate);
        if (filters.endDate) params.append('endDate', filters.endDate);

        const response = await api.get(`/admin/payments/stats?${params.toString()}`);
        return response.data;
    },

    refundPayment: async (stripePaymentId) => {
        const response = await api.post(`/admin/payments/${stripePaymentId}/refund`);
        return response.data;
    }
};

export default paymentService;