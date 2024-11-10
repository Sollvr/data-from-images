import nodemailer from "nodemailer";
import { randomBytes } from "crypto";

const transporter = nodemailer.createTransport({
  host: "smtp.gmail.com",
  port: 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD,
  },
});

export async function generateVerificationToken(): Promise<string> {
  return randomBytes(32).toString("hex");
}

export async function sendVerificationEmail(email: string, token: string) {
  const verificationUrl = `https://datafromimages.replit.app/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to SnapExtract!</h1>
      <p>Please click the button below to verify your email address:</p>
      <a href="${verificationUrl}" style="
        display: inline-block;
        padding: 12px 24px;
        background-color: #3b82f6;
        color: white;
        text-decoration: none;
        border-radius: 6px;
        margin: 16px 0;
      ">Verify Email</a>
      <p>If the button doesn't work, copy and paste this link into your browser:</p>
      <p>${verificationUrl}</p>
      <p>This link will expire in 24 hours.</p>
    `,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("Verification email sent to:", email);
  } catch (error) {
    console.error("Error sending verification email:", error);
    throw new Error("Failed to send verification email");
  }
}
