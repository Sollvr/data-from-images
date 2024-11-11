import nodemailer from "nodemailer";
import { randomBytes } from "crypto";
import { promisify } from "util";

const randomBytesAsync = promisify(randomBytes);

// Create reusable transporter with Gmail
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD,
  },
});

export async function generateVerificationToken(): Promise<string> {
  const buffer = await randomBytesAsync(32);
  return buffer.toString("hex");
}

export async function sendVerificationEmail(email: string, token: string) {
  // Use VITE_API_URL from environment with localhost fallback
  const verificationUrl = `${process.env.VITE_API_URL || 'http://localhost:5000'}/verify-email?token=${token}`;

  const mailOptions = {
    from: process.env.GMAIL_USER,
    to: email,
    subject: "Verify your email address",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #333;">Verify your email address</h2>
        <p>Thank you for registering! Please click the button below to verify your email address:</p>
        <a href="${verificationUrl}" style="display: inline-block; background-color: #4F46E5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 4px; margin: 16px 0;">
          Verify Email
        </a>
        <p style="color: #666; font-size: 14px;">If you didn't request this email, please ignore it.</p>
        <p style="color: #666; font-size: 14px;">This link will expire in 24 hours.</p>
      </div>
    `,
  };

  await transporter.sendMail(mailOptions);
}
