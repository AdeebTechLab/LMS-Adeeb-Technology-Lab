/** Render backend — direct URL fallback */
export const PRODUCTION_API = 'https://lms-adeeb-technology-lab.onrender.com/api';

const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1';

const isVercelHost = (host) => host.includes('vercel.app');

/**
 * Live Vercel site: same-origin /api (proxied to Render in vercel.json).
 * Avoids CORS and wrong baked-in VITE_API_URL on production builds.
 */
export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;

        if (isVercelHost(host)) {
            return '/api';
        }

        if (isLocalHost(host)) {
            return import.meta.env.DEV ? '/api' : 'http://localhost:5000/api';
        }

        return PRODUCTION_API;
    }

    if (import.meta.env.PROD) {
        return PRODUCTION_API;
    }

    return import.meta.env.DEV ? '/api' : 'http://localhost:5000/api';
};

/** Socket / uploads origin without /api suffix */
export const getBackendOrigin = () => {
    const base = getApiBaseUrl();
    if (base === '/api') {
        if (typeof window !== 'undefined' && isVercelHost(window.location.hostname)) {
            return 'https://lms-adeeb-technology-lab.onrender.com';
        }
        return 'http://localhost:5000';
    }
    return base.replace(/\/api\/?$/, '');
};
