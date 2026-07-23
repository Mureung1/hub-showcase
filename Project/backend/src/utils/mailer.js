const nodemailer = require('nodemailer');
const env = require('../config/env');

function isMailerConfigured() {
  return Boolean(env.smtp.host && env.smtp.user && env.smtp.password && env.smtp.from);
}

async function sendMail({ to, subject, text }) {
  if (!isMailerConfigured()) {
    return { sent: false, reason: 'SMTP_NOT_CONFIGURED' };
  }

  const transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.port === 465,
    auth: { user: env.smtp.user, pass: env.smtp.password },
  });
  const result = await transporter.sendMail({ from: env.smtp.from, to, subject, text });
  return { sent: true, messageId: result.messageId };
}

module.exports = { isMailerConfigured, sendMail };
