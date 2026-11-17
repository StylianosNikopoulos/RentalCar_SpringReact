import { useEffect, useRef } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import toast from 'react-hot-toast';

const OAuth2RedirectHandler = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { loginWithOAuth } = useAuth();
    const processedRef = useRef(false);

    useEffect(() => {
        if (processedRef.current) return;
        processedRef.current = true;

        const accessToken = searchParams.get('accessToken');
        const refreshToken = searchParams.get('refreshToken');
        const error = searchParams.get('error');

        if (error || !accessToken || !refreshToken) {
            toast.error('Google authentication failed. Please try again.');
            navigate('/login', { replace: true });
            return;
        }

        loginWithOAuth(accessToken, refreshToken)
            .then(() => {
                toast.success('Successfully signed in with Google!');
                navigate('/', { replace: true });
            })
            .catch(() => {
                localStorage.removeItem('user');
                toast.error('Failed to load user profile.');
                navigate('/login', { replace: true });
            });
    }, [searchParams, loginWithOAuth, navigate]);

    return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
            <p>Signing you in...</p>
        </div>
    );
};

export default OAuth2RedirectHandler;