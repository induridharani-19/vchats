import nodemailer from 'nodemailer';

const createMailTransporter = () => {
  const host = process.env.SMTP_HOST || 'smtp.gmail.com';
  const port = parseInt(process.env.SMTP_PORT || '587', 10);
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  const isMock = !user || user.includes('vchats.notifications@gmail.com') || !pass || pass.includes('your_');

  if (isMock) {
    console.log('Using Mock Email Transporter: Email alerts will be output directly to the server console.');
    return {
      sendMail: async (options: nodemailer.SendMailOptions) => {
        console.log(`
==================================================
MOCK EMAIL SENT:
From: ${options.from || process.env.EMAIL_FROM}
To: ${options.to}
Subject: ${options.subject}
Body:
${options.text || options.html}
==================================================
        `);
        return { messageId: 'mock-id-' + Math.random().toString(36).substr(2, 9) };
      }
    };
  }

  return nodemailer.createTransport({
    host,
    port,
    secure: port === 465, // true for 465, false for other ports
    auth: {
      user,
      pass,
    },
  });
};

export const mailTransporter = createMailTransporter();
export const emailFrom = process.env.EMAIL_FROM || 'VChats <no-reply@vchats.com>';
