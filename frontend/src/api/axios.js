import axios from 'axios';

const api = axios.create({
    baseURL: import.meta.env.VITE_API_BASE_URL,
    headers: {
        'Content-Type': 'application/json'
    }
});

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

        if (error.response && error.response.status === 401 && !originalRequest._retry && !isAuthEndpoint) {
            originalRequest._retry = true;

            try {
                const userData = JSON.parse(localStorage.getItem('user'));
                const refreshToken = userData?.refreshToken;

                if (!refreshToken) {
                    throw new Error("No refresh token available");
                }

                const response = await axios.post(
                    `${import.meta.env.VITE_API_BASE_URL}/auth/refresh`, 
                    { refreshToken: refreshToken },
                    { headers: { Authorization: '' } }
                );

                if (response.data && response.data.accessToken) {
                    const currentUserData = JSON.parse(localStorage.getItem('user'));

                    const updatedUserData = {
                        ...currentUserData,
                        accessToken: response.data.accessToken,
                        refreshToken: response.data.refreshToken || currentUserData.refreshToken
                    };

                    localStorage.setItem('user', JSON.stringify(updatedUserData));

                    originalRequest.headers.Authorization = `Bearer ${response.data.accessToken}`;
                    return api(originalRequest);
                }
            } catch (refreshError) {
                console.error("Refresh token expired or invalid", refreshError);
                localStorage.removeItem('user');
                window.location.href = '/login';
                return Promise.reject(refreshError);
            }
        }
        return Promise.reject(error);
    }
);

export default api;