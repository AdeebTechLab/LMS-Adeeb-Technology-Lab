const nodemailer = require('nodemailer');

let transporter = null;

const getTransporter = () => {
    if (transporter) return transporter;

    const user = process.env.EMAIL_USER;
    const pass = process.env.EMAIL_PASS;

    if (!user || !pass) {
        throw new Error('EMAIL_USER and EMAIL_PASS must be set in backend/.env');
    }

    transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: Number(process.env.SMTP_PORT) || 465,
        secure: process.env.SMTP_SECURE !== 'false',
        auth: { user, pass },
    });

    return transporter;
};

const isEmailConfigured = () => Boolean(process.env.EMAIL_USER && process.env.EMAIL_PASS);

/**
 * @param {{ to: string, subject: string, html: string, text?: string }} options
 */
const sendEmail = async ({ to, subject, html, text }) => {
    const from = process.env.EMAIL_FROM || process.env.EMAIL_USER;
    const transport = getTransporter();

    await transport.verify();

    const info = await transport.sendMail({
        from: `"Adeeb Technology Lab" <${from}>`,
        to,
        subject,
        html,
        text: text || undefined,
    });

    console.log(`✅ Email sent to ${to} (messageId: ${info.messageId})`);
    return info;
};

module.exports = { sendEmail, isEmailConfigured, getTransporter };
