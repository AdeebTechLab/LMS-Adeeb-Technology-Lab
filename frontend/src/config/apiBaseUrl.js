/** Live backend on Render — used when site is on Vercel or any non-local host */
export const PRODUCTION_API = 'https://lms-adeeb-technology-lab.onrender.com/api';

const normalizeApiUrl = (url) => {
    const trimmed = url.replace(/\/$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
};

const isLocalHost = (host) => host === 'localhost' || host === '127.0.0.1';

const isLiveDeployment = (host) =>
    host.includes('vercel.app') ||
    host.includes('onrender.com') ||
    host.includes('adeeb-technology-lab');

/**
 * Resolves API base URL at runtime so production never calls localhost
 * even if Vercel/CI baked a wrong VITE_API_URL into the build.
 */
export const getApiBaseUrl = () => {
    if (typeof window !== 'undefined') {
        const host = window.location.hostname;

        if (isLiveDeployment(host)) {
            return PRODUCTION_API;
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
        if (typeof window !== 'undefined' && isLiveDeployment(window.location.hostname)) {
            return 'https://lms-adeeb-technology-lab.onrender.com';
        }
        return 'http://localhost:5000';
    }
    return base.replace(/\/api\/?$/, '');
};

export const getEnvApiBaseUrl = () => {
    const envUrl = import.meta.env.VITE_API_URL?.trim();
    if (!envUrl || envUrl === '/api' || envUrl.includes('localhost')) {
        return null;
    }
    return normalizeApiUrl(envUrl);
};
