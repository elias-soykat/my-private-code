const nodemailer = require('nodemailer');
const config = require('../config');

const sendEmail = async (options) => {
  const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: config.EMAIL_USERNAME, pass: config.EMAIL_APP_PASSWORD },
  });

  const mailOptions = {
    from: 'Welcome to DevLink <eliasmd624@gmail.com>',
    to: options.email,
    subject: options.subject,
    html: options.message,
  };

  await transporter.sendMail(mailOptions);
};

module.exports = sendEmail;
