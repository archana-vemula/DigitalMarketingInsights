import express from "express";
import cors from "cors";
import OpenAI from "openai";
import nodemailer from "nodemailer";
import dotenv from "dotenv";

dotenv.config();
const app = express();
app.use(cors());
app.use(express.json());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// Email transporter setup
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// In-memory storage for password reset tokens (in production, use a database)
const resetTokens = {};
const userEmails = {
  "testuser": "test@example.com",
  "revathi": "revathi@example.com",
  "revathimerugu": "revathimerugu30@gmail.com"
};

// Helper to generate reset token
function generateResetToken() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

// Send password reset email
async function sendPasswordResetEmail(email, resetToken) {
  const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}&email=${email}`;
  
  const mailOptions = {
    from: process.env.EMAIL_FROM,
    to: email,
    subject: "Password Reset Request - Digital Market Insights",
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <div style="background: linear-gradient(135deg, #2c7a7b 0%, #1a4a4c 100%); padding: 20px; border-radius: 8px 8px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0;">🌾 Digital Market Insights</h1>
        </div>
        <div style="background: #f9f9f9; padding: 30px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #2c7a7b; margin-bottom: 20px;">Password Reset Request</h2>
          <p style="color: #333; font-size: 16px; line-height: 1.6;">
            We received a request to reset your password. Click the button below to create a new password.
          </p>
          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetLink}" style="background: #2c7a7b; color: white; padding: 12px 30px; border-radius: 6px; text-decoration: none; font-weight: bold; display: inline-block;">
              Reset Password
            </a>
          </div>
          <p style="color: #666; font-size: 14px; line-height: 1.6;">
            Or copy and paste this link in your browser:
          </p>
          <p style="color: #2c7a7b; word-break: break-all; font-size: 13px;">
            ${resetLink}
          </p>
          <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
          <p style="color: #999; font-size: 12px;">
            This link will expire in 1 hour for security reasons.<br>
            If you didn't request this, please ignore this email.
          </p>
        </div>
      </div>
    `
  };
  
  return transporter.sendMail(mailOptions);
}

// Forgot Password Endpoint
app.post("/api/auth/forgot-password", async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.json({ success: false, message: "Email is required" });
  }

  // Find user by email (in production, query database)
  let foundUser = null;
  for (const [username, userEmail] of Object.entries(userEmails)) {
    if (userEmail === email) {
      foundUser = username;
      break;
    }
  }

  if (!foundUser) {
    return res.json({ success: false, message: "Email not found in our system" });
  }

  // Generate reset token
  const resetToken = generateResetToken();
  const resetLink = `${process.env.FRONTEND_URL}/reset-password.html?token=${resetToken}&email=${email}`;
  
  // Store token (expires in 1 hour)
  resetTokens[resetToken] = {
    email,
    username: foundUser,
    expiresAt: Date.now() + 3600000
  };

  // Try to send email, but always succeed with debug link
  try {
    if (process.env.EMAIL_USER && process.env.EMAIL_PASSWORD) {
      await sendPasswordResetEmail(email, resetToken);
      console.log(`✓ Password reset email sent to ${email}`);
    } else {
      console.log(`ℹ️  Email not configured. Using debug link instead.`);
    }
  } catch (error) {
    console.error("Email sending error:", error.message);
  }

  // Log debug link to console for testing
  console.log(`\n🔗 DEBUG: Password Reset Link:\n${resetLink}\n`);
  
  res.json({ 
    success: true, 
    message: "Password reset link has been generated. Check the backend console for the link.",
    debugLink: resetLink // Send debug link to frontend for development
  });
});

// Verify Reset Token Endpoint
app.post("/api/auth/verify-reset-token", (req, res) => {
  const { token } = req.body;

  if (!token || !resetTokens[token]) {
    return res.json({ success: false, message: "Invalid or expired reset link" });
  }

  const tokenData = resetTokens[token];
  if (tokenData.expiresAt < Date.now()) {
    delete resetTokens[token];
    return res.json({ success: false, message: "Reset link has expired" });
  }

  res.json({ success: true, email: tokenData.email, username: tokenData.username });
});

// Reset Password Endpoint
app.post("/api/auth/reset-password", (req, res) => {
  const { token, newPassword } = req.body;

  if (!token || !newPassword) {
    return res.json({ success: false, message: "Invalid request" });
  }

  if (!resetTokens[token]) {
    return res.json({ success: false, message: "Invalid or expired reset link" });
  }

  const tokenData = resetTokens[token];
  if (tokenData.expiresAt < Date.now()) {
    delete resetTokens[token];
    return res.json({ success: false, message: "Reset link has expired" });
  }

  // In production, update password in database with bcrypt hashing
  console.log(`✓ Password reset for user: ${tokenData.username}, email: ${tokenData.email}`);
  
  // Delete used token
  delete resetTokens[token];

  res.json({ success: true, message: "Password has been reset successfully! Please login with your new password." });
});

app.post("/chat", async (req, res) => {
  const userMessage = req.body.message;

  try {
    const completion = await client.chat.completions.create({
      model: "gpt-4.1-mini",
      messages: [
        { role: "system", content: "You are a friendly chatbot assistant." },
        { role: "user", content: userMessage }
      ]
    });

    const botReply = completion.choices[0].message.content;
    res.json({ reply: botReply });

  } catch (error) {
    console.error(error);
    res.status(500).json({ reply: "Oops! Something went wrong." });
  }
});

app.listen(5000, () => console.log("Backend running on port 5000"));
