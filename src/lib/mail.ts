import nodemailer from "nodemailer";

let transporter: nodemailer.Transporter | null = null;

function getTransporter() {
  if (transporter) return transporter;

  const user = process.env.GMAIL_USER;
  const pass = process.env.GMAIL_PASS;

  if (!user || !pass) {
    throw new Error(
      "Gmail credentials (GMAIL_USER, GMAIL_PASS) are not configured"
    );
  }

  transporter = nodemailer.createTransport({
    host: "smtp.gmail.com",
    port: 587,
    secure: false,
    auth: {
      user,
      pass,
    },
    tls: {
      rejectUnauthorized: false,
    },
  });

  return transporter;
}

export async function sendResetPasswordEmail(
  to: string,
  password: string
): Promise<void> {
  const t = getTransporter();

  await t.sendMail({
    from: `"No-Reply" <${process.env.GMAIL_USER}>`,
    to,
    subject: "Your New Password",
    html: `
      <div style="
        font-family:Arial,Helvetica,sans-serif;
        padding:24px;
        color:#333;
        max-width:600px;
        margin:auto;
        border:1px solid #eee;
        border-radius:12px;
      ">

        <h2 style="color:#ff3800;">
          Password Reset
        </h2>

        <p>
          Your password has been reset successfully.
        </p>

        <p>
          Your new temporary password is:
        </p>

        <div style="
          background:#f5f5f5;
          padding:15px;
          border-radius:8px;
          text-align:center;
          font-size:24px;
          font-weight:bold;
          letter-spacing:2px;
          color:#111;
          margin:20px 0;
        ">
          ${password}
        </div>

        <p>
          Please use this password to login to your account.
        </p>

        <p style="color:#777;">
          For security, please change your password after logging in.
        </p>

        <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

        <p style="font-size:12px;color:#999;">
          If you did not request a password reset, please contact support
          immediately.
        </p>

      </div>
    `,
  });
}
