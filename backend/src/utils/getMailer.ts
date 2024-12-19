import nodemailer from 'nodemailer';

// Initialize mailer.
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS!,
    pass: process.env.EMAIL_PASSWORD_SECRET!
  }
});

function getMailer() {
  return transporter;
}

export {
  getMailer,
};
