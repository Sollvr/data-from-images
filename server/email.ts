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
  const verificationUrl = `${process.env.REPLIT_URL || 'http://localhost:5000'}/verify-email?token=${token}`;
  
  const mailOptions = {
    from: process.env.EMAIL_USER,
    to: email,
    subject: "Verify your email address",
    html: `
      <h1>Welcome to SnapExtract!</h1>
      <p>Thank you for starting your registration. Please follow these steps to complete your account setup:</p>
      <ol>
        <li>Click the verification button below to verify your email address</li>
        <li>After verification, you'll be redirected to set up your password</li>
        <li>Once your password is set, you can log in to start using SnapExtract</li>
      </ol>
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
