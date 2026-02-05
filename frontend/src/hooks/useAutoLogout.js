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
            // Check if "Remember Me" was selected - if so, skip auto-logout
            const rememberMeLocal = localStorage.getItem('rememberMe');
            const rememberMeSession = sessionStorage.getItem('rememberMe');
            
            // If rememberMe is 'true' in localStorage, user selected remember me - don't auto-logout
            if (rememberMeLocal === 'true') {
                return;
            }
            
            // If using sessionStorage (rememberMe was false), apply 2-hour timeout
            const loginTime = sessionStorage.getItem('loginTime') || localStorage.getItem('loginTime');
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
