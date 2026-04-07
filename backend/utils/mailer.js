const nodemailer = require('nodemailer');
const { getEmailConfig } = require('../services/secretsManager');

const sendEmail = async (to, subject, html) => {
    const { host, port, user, pass, from } = getEmailConfig();
    const transporter = nodemailer.createTransport({
        host,
        port,
        secure: false,
        auth: {
            user,
            pass,
        },
    });

    return transporter.sendMail({
        from,
        to,
        subject,
        html
    });
}

module.exports = sendEmail;