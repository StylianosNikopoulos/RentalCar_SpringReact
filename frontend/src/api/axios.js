import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
    failedQueue.forEach(prom => {
        if (error) {
            prom.reject(error);
        } else {
            prom.resolve(token);
        }
    });
    failedQueue = [];
};

api.interceptors.request.use(
    (config) => {
        const userData = JSON.parse(localStorage.getItem('user'));
        if (userData && userData.accessToken) {
            config.headers.Authorization = `Bearer ${userData.accessToken}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

api.interceptors.response.use(
    (response) => response,
    async (error) => {
        const originalRequest = error.config;

        const isAuthEndpoint = originalRequest.url?.includes('/auth/refresh') || 
                               originalRequest.url?.includes('/auth/login') || 
                               originalRequest.url?.includes('/auth/register');

        if (error.response && (error.response.status === 401 || error.response.status === 403) && !originalRequest._retry && !isAuthEndpoint) {
            
            if (isRefreshing) {
                return new Promise((resolve, reject) => {
                    failedQueue.push({ resolve, reject });
                }).then(token => {
                    originalRequest.headers.Authorization = `Bearer ${token}`;
                    return api(originalRequest);
                }).catch(err => {
                    return Promise.reject(err);
                });
            }

            originalRequest._retry = true;
            isRefreshing = true;

            try {
                const userData = JSON.parse(localStorage.getItem('user'));
                const refreshToken = userData?.refreshToken;

                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }

                const response = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL.replace(/\/$/, '')}/auth/refresh`, 
                    { refreshToken: refreshToken },
                    { headers: { 'Content-Type': 'application/json' } }
                );

                if (response.data && response.data.accessToken) {
                    const newAccessToken = response.data.accessToken;
                    const currentUserData = JSON.parse(localStorage.getItem('user'));

                    const updatedUserData = {
                        ...currentUserData,
                        accessToken: newAccessToken,
                        refreshToken: response.data.refreshToken || currentUserData.refreshToken
                    };

                    localStorage.setItem('user', JSON.stringify(updatedUserData));

                    processQueue(null, newAccessToken);
                    originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                processQueue(refreshError, null);
                console.error("Refresh token expired or invalid", refreshError);
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            } finally {
                isRefreshing = false;
            }
        }
        return Promise.reject(error);
    }
);

export default api;