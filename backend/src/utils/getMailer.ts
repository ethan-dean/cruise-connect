import nodemailer from 'nodemailer';

// Initialize mailer.
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: 'thecruiseconnect.noreply@gmail.com',
    pass: process.env.EMAIL_PASSWORD_SECRET!
  }
});

function getMailer() {
  return transporter;
}

export default getMailer;
