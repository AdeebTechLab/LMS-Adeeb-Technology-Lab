/** Live frontend (Vercel) — used in password-reset emails and notification links */
const PRODUCTION_CLIENT_URL = 'https://lms-adeeb-technology-lab.vercel.app';

const getClientUrl = () => {
    const url = (process.env.CLIENT_URL || PRODUCTION_CLIENT_URL).replace(/\/$/, '');
    return url;
};

module.exports = { getClientUrl, PRODUCTION_CLIENT_URL };
