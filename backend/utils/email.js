const nodemailer = require('nodemailer');

let transporter = null;
let transporterConfigKey = null;

<<<<<<< HEAD
const EMAIL_SEND_TIMEOUT_MS = 20000;

const isEmailConfigured = () => {
    if (process.env.BREVO_API_KEY) return true;
    if (process.env.RESEND_API_KEY) return true;
    return Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);
};

const getEmailProvider = () => {
    if (process.env.BREVO_API_KEY) return 'brevo';
    if (process.env.RESEND_API_KEY) return 'resend';
    return 'smtp';
};

const withTimeout = (promise, ms, label = 'operation') =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
    ]);

const getBrevoApiKey = () => {
    const key = process.env.BREVO_API_KEY?.trim();
    if (!key) {
        throw new Error('BREVO_API_KEY is not set on the server');
    }
    if (key.startsWith('xsmtpsib-')) {
        const err = new Error(
            'BREVO_API_KEY is an SMTP key (xsmtpsib). Use API key from Brevo → SMTP & API → API keys (starts with xkeysib).'
        );
        err.code = 'BREVO_WRONG_KEY_TYPE';
        throw err;
    }
    if (!key.startsWith('xkeysib-')) {
        const err = new Error(
            'BREVO_API_KEY must start with xkeysib-. Generate it under Brevo → SMTP & API → API keys & MCP.'
        );
        err.code = 'BREVO_WRONG_KEY_TYPE';
        throw err;
    }
    return key;
};

/** Brevo (Sendinblue) — HTTPS API, works on Render free tier */
const sendViaBrevo = async ({ to, subject, html, text }) => {
    const senderEmail = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    if (!senderEmail) {
        throw new Error('EMAIL_USER or EMAIL_FROM required as Brevo sender');
    }

    const apiKey = getBrevoApiKey();

    const response = await fetch('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: {
            accept: 'application/json',
            'api-key': apiKey,
            'content-type': 'application/json',
        },
        body: JSON.stringify({
            sender: { name: 'Adeeb Technology Lab', email: senderEmail },
            to: [{ email: to }],
            subject,
            htmlContent: html,
            textContent: text || undefined,
        }),
    });

    const body = await response.text();
    if (!response.ok) {
        let detail = body;
        try {
            const parsed = JSON.parse(body);
            detail = parsed.message || parsed.error || body;
        } catch {
            /* keep raw body */
        }
        const err = new Error(`Brevo API error (${response.status}): ${detail}`);
        err.statusCode = response.status;
        throw err;
    }

    console.log(`✅ [Brevo] Email sent to ${to}`);
    return body ? JSON.parse(body) : {};
};

/** Resend — HTTPS API, works on Render free tier */
const sendViaResend = async ({ to, subject, html, text }) => {
    const from =
        process.env.RESEND_FROM ||
        process.env.EMAIL_FROM ||
        `Adeeb Technology Lab <${process.env.EMAIL_USER}>`;

    const response = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
            Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            from,
            to: [to],
            subject,
            html,
            text: text || undefined,
        }),
    });

    const data = await response.json();
    if (!response.ok) {
        throw new Error(data?.message || `Resend API error (${response.status})`);
    }

    console.log(`✅ [Resend] Email sent to ${to} (id: ${data.id})`);
    return data;
};

=======
>>>>>>> parent of 68ff33e (news)
const buildTransportOptions = (useAltPort = false) => {
    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS?.replace(/\s/g, '');

    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS must be set in backend/.env');
    }

    if (useAltPort) {
        return {
            host: process.env.SMTP_HOST || 'smtp.gmail.com',
            port: 587,
            secure: false,
            auth: { user, pass },
            connectionTimeout: 15000,
            greetingTimeout: 15000,
            socketTimeout: 20000,
        };
    }

    return {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        auth: { user, pass },
        connectionTimeout: 15000,
        greetingTimeout: 15000,
        socketTimeout: 20000,
    };
};

const getTransporter = (useAltPort = false) => {
    const configKey = useAltPort ? '587' : '465';
    if (transporter && transporterConfigKey === configKey) {
        return transporter;
    }

    transporter = nodemailer.createTransport(buildTransportOptions(useAltPort));
    transporterConfigKey = configKey;
    return transporter;
};

const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

const isRetryableSmtpError = (error) => {
    const code = error?.code || '';
    const message = error?.message || '';
    return (
        code === 'ETIMEDOUT' ||
        code === 'ESOCKET' ||
        code === 'ECONNECTION' ||
        /timeout|connection closed|self signed/i.test(message)
    );
};

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
const EMAIL_SEND_TIMEOUT_MS = 20000;

const withTimeout = (promise, ms, label = 'operation') =>
    Promise.race([
        promise,
        new Promise((_, reject) => {
            setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
        }),
    ]);

const sendEmail = async ({ to, subject, html, text }) => {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    let lastError;

    for (const useAltPort of [false, true]) {
        try {
            const transport = getTransporter(useAltPort);
            const info = await withTimeout(
                transport.sendMail({
                from: `"Adeeb Technology Lab" <${from}>`,
                to,
                subject,
                html,
                text: text || undefined,
                }),
                EMAIL_SEND_TIMEOUT_MS,
                'Email send'
            );

            console.log(`✅ Email sent to ${to} (messageId: ${info.messageId})`);
            return info;
        } catch (error) {
            lastError = error;
            if (!useAltPort && isRetryableSmtpError(error)) {
                console.warn('⚠️ SMTP on port 465 failed, retrying on port 587...');
                transporter = null;
                continue;
            }
            throw error;
        }
    }

    throw lastError;
};

module.exports = { sendEmail, isEmailConfigured, getTransporter };
