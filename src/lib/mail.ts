import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;

  if (!user || !pass) {
    throw new Error("Gmail credentials (GMAIL_USER, GMAIL_PASS) are not configured");
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });

  return transporter;
}

export async function sendResetEmail(to: string, resetLink: string): Promise<void> {
  const t = getTransporter();
  await t.sendMail({
    from: `"No-Reply" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Password Reset Request",
    html: `
      <div style="font-family:Arial,Helvetica,sans-serif; padding:24px; color:#333;">
        <h2 style="color:#ff3800;">Password Reset</h2>
        <p>You requested a password reset. Click the button below to reset your password.</p>
        <p style="text-align:center; margin:24px 0;">
          <a href="${resetLink}" style="background:#ff3800; color:#fff; padding:12px 24px; text-decoration:none; border-radius:8px; display:inline-block;">
            Reset Password
          </a>
        </p>
        <p>This link will expire in 15 minutes.</p>
        <p>If you did not request this, please ignore this email.</p>
      </div>
    `,
  });
}
