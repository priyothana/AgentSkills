const nodemailer = require('nodemailer');

const transport = nodemailer.createTransport({ url: process.env.SMTP_URL });

async function sendMail(to, subject, text) {
  await transport.sendMail({ from: 'sales@example.com', to, subject, text });
}

module.exports = { sendMail };
