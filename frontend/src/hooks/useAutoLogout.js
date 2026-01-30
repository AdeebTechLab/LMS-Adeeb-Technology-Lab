import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { logout } from '../features/auth/authSlice';

const TWO_HOURS = 2 * 60 * 60 * 1000; // 2 hours in milliseconds

const useAutoLogout = () => {
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const { isAuthenticated } = useSelector((state) => state.auth);

    useEffect(() => {
        if (!isAuthenticated) return;

        const checkSession = () => {
            const loginTime = localStorage.getItem('loginTime');
            if (!loginTime) {
                // No login time stored, logout for safety
                dispatch(logout());
                navigate('/login', {
                    state: { message: 'Session expired. Please login again.' }
                });
                return;
            }

            const currentTime = new Date().getTime();
            const elapsed = currentTime - parseInt(loginTime);

            if (elapsed >= TWO_HOURS) {
                // Session expired
                dispatch(logout());
                navigate('/login', {
                    state: { message: 'Your session has expired after 2 hours. Please login again.' }
                });
            }
        };

        // Check immediately
        checkSession();

        // Check every minute
        const interval = setInterval(checkSession, 60 * 1000);

        return () => clearInterval(interval);
    }, [isAuthenticated, dispatch, navigate]);
};

export default useAutoLogout;
