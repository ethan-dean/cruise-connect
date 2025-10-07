import nodemailer from 'nodemailer';

///////////////////////////////////////////////////////////////////////////////////////////
// Initialize mailer.
const transporter = nodemailer.createTransport({
  service: 'Gmail',
  auth: {
    user: process.env.EMAIL_ADDRESS!,
    pass: process.env.EMAIL_PASSWORD_SECRET!
  }
});

// Verify connection configuration on startup
transporter.verify(function(error, success) {
  if (error) {
    console.error('Mailer configuration error:', error);
  } else {
    console.log('Mailer is ready to send emails');
  }
});

function getMailer() {
  return transporter;
}

///////////////////////////////////////////////////////////////////////////////////////////
// Exports for 'getMailer.ts'.
export {
  getMailer,
};
