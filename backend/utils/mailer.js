const nodemailer = require('nodemailer');

// Set up a mock transporter or real transporter based on env variables
let transporter;

async function getTransporter() {
  if (transporter) return transporter;

  if (process.env.SMTP_HOST && process.env.SMTP_USER) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false, // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  } else {
    // Fallback: Create ethereal email test account on-the-fly or log to console
    try {
      let testAccount = await nodemailer.createTestAccount();
      transporter = nodemailer.createTransport({
        host: "smtp.ethereal.email",
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass,
        },
      });
      console.log(`[Mailer] Created Ethereal SMTP test account: ${testAccount.user}`);
    } catch (err) {
      console.warn("[Mailer] Failed to create Ethereal account. Falling back to stdout log-only mode.");
      transporter = {
        sendMail: async (mailOptions) => {
          console.log("\n--- [MOCK EMAIL SENT] ---");
          console.log(`To: ${mailOptions.to}`);
          console.log(`Subject: ${mailOptions.subject}`);
          console.log(`Body: ${mailOptions.text || mailOptions.html}`);
          console.log("-------------------------\n");
          return { messageId: 'mock-id-' + Math.random().toString(36).substr(2, 9) };
        }
      };
    }
  }
  return transporter;
}

async function sendNotificationEmail({ to, subject, text, html }) {
  try {
    const client = await getTransporter();
    const info = await client.sendMail({
      from: '"MedIntel Healthcare" <no-reply@medintel.com>',
      to,
      subject,
      text,
      html,
    });
    console.log(`[Mailer] Email sent successfully: ${info.messageId}`);
    return info;
  } catch (error) {
    console.error(`[Mailer] Error sending email to ${to}:`, error);
    return null;
  }
}

module.exports = {
  sendNotificationEmail
};
