import bcrypt from "bcryptjs";
import userModel from "../models/userModel.js";
import transporter from "../config/nodemailer.js";
import {
  clearAuthCookies,
  issueSession,
  revokeAllSessionsForUser,
  revokeSessionByRefreshToken,
  setAuthCookies
} from "../utils/authSession.js";
import { writeAuditLog } from "../utils/auditLog.js";
import { maybeStartMfaChallenge } from "./securityController.js";

const sendJsonError = (res, message) => res.json({ success: false, message });

// Register Controller
export const register = async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return sendJsonError(res, "Missing details, All fields are required");
  }

  try {
    const existingUser = await userModel.findOne({ email });

    if (existingUser) {
      return sendJsonError(res, "User already exist");
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    const user = await userModel.create({
      name,
      email,
      password: hashedPassword
    });

    const { accessToken, refreshToken } = await issueSession(user._id, req);
    setAuthCookies(res, accessToken, refreshToken);

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: email,
      subject: "Welcome to Encryption File Vault",
      text: `Hello ${name},\n\nWelcome to Encryption File Vault! We're excited to have you on board.\n\nBest regards,\nThe Encryption File Vault Team`
    });

    await writeAuditLog({ req, userId: user._id, action: "register", status: "success" });
    return res.json({ success: true });
  } catch (error) {
    await writeAuditLog({ req, action: "register", status: "failure", message: error.message, metadata: { email } });
    return sendJsonError(res, error.message);
  }
};

// Login Controller
export const login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return sendJsonError(res, "Missing details");
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      await writeAuditLog({ req, action: "login", status: "failure", message: "User not found", metadata: { email } });
      return sendJsonError(res, "User not found");
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      await writeAuditLog({ req, userId: user._id, action: "login", status: "failure", message: "Invalid credentials" });
      return sendJsonError(res, "Invalid credentials");
    }

    user.lastLoginAt = new Date();
    await user.save();

    const mfaToken = await maybeStartMfaChallenge(user);
    if (mfaToken) {
      await writeAuditLog({ req, userId: user._id, action: "login", status: "success", message: "Primary auth passed, MFA required" });
      return res.json({ success: true, requiresMfa: true, mfaToken, email: user.email });
    }

    const { accessToken, refreshToken } = await issueSession(user._id, req);
    setAuthCookies(res, accessToken, refreshToken);
    await writeAuditLog({ req, userId: user._id, action: "login", status: "success" });

    return res.json({ success: true });
  } catch (error) {
    await writeAuditLog({ req, action: "login", status: "failure", message: error.message, metadata: { email } });
    return sendJsonError(res, error.message);
  }
};

// Logout Controller
export const logout = async (req, res) => {
  try {
    await revokeSessionByRefreshToken(req.cookies.refreshToken);
    clearAuthCookies(res);

    if (req.user?.id) {
      await writeAuditLog({ req, userId: req.user.id, action: "logout", status: "success" });
    }

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

export const logoutAllSessions = async (req, res) => {
  try {
    await revokeAllSessionsForUser(req.user.id);
    clearAuthCookies(res);
    await writeAuditLog({ req, userId: req.user.id, action: "logout_all", status: "success" });
    return res.json({ success: true, message: "All sessions revoked successfully" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

// Send verification OTP
export const sendVerifyOTP = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return sendJsonError(res, "User not found");
    }

    if (user.isAccountVerified) {
      return sendJsonError(res, "Account already verified");
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.verifyOTP = otp;
    user.verifyOTPExpiryAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Account Verification OTP",
      text: `Your OTP for account verification is ${otp}.\n\nThis OTP is valid for 10 minutes.`
    });

    return res.json({ success: true, message: "OTP sent to your email address" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

// Verify Email Controller
export const verifyEmail = async (req, res) => {
  try {
    const { otp } = req.body;

    if (!otp) {
      return sendJsonError(res, "OTP is required");
    }

    const user = await userModel.findById(req.user.id);

    if (!user) {
      return sendJsonError(res, "User not found");
    }

    if (!user.verifyOTP || user.verifyOTP !== otp) {
      return sendJsonError(res, "Invalid OTP");
    }

    if (user.verifyOTPExpiryAt < Date.now()) {
      return sendJsonError(res, "OTP expired");
    }

    user.isAccountVerified = true;
    user.verifyOTP = "";
    user.verifyOTPExpiryAt = 0;
    await user.save();

    return res.json({ success: true, message: "Email verified successfully" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

// Check if user is authenticated
export const isAuthenticated = async (req, res) => {
  try {
    return res.json({ success: true, sessionId: req.user.sessionId || "" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

// Send password reset OTP
export const sendResetPasswordOTP = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return sendJsonError(res, "Email is required");
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return sendJsonError(res, "User not found");
    }

    const otp = String(Math.floor(100000 + Math.random() * 900000));
    user.resetPasswordOTP = otp;
    user.resetPasswordOTPExpiryAt = Date.now() + 10 * 60 * 1000;
    user.resetPasswordOTPVerifiedAt = 0;
    await user.save();

    await transporter.sendMail({
      from: process.env.SENDER_EMAIL,
      to: user.email,
      subject: "Password Reset OTP",
      text: `Your OTP for password reset is ${otp}.`
    });

    return res.json({ success: true, message: "OTP sent to your email address" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

// Verify Reset OTP
export const verifyResetOTP = async (req, res) => {
  const { email, otp } = req.body;

  if (!email || !otp) {
    return sendJsonError(res, "Missing details");
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return sendJsonError(res, "User not found");
    }

    if (!user.resetPasswordOTP || user.resetPasswordOTP !== otp) {
      return sendJsonError(res, "Invalid OTP");
    }

    if (user.resetPasswordOTPExpiryAt < Date.now()) {
      return sendJsonError(res, "OTP expired");
    }

    user.resetPasswordOTPVerifiedAt = Date.now();
    await user.save();

    return res.json({ success: true, message: "OTP verified" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};

// Reset User Password
export const resetPassword = async (req, res) => {
  const { email, newPassword } = req.body;

  if (!email || !newPassword) {
    return sendJsonError(res, "Missing details");
  }

  try {
    const user = await userModel.findOne({ email });

    if (!user) {
      return sendJsonError(res, "User not found");
    }

    if (!user.resetPasswordOTPVerifiedAt) {
      return sendJsonError(res, "OTP not verified");
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.resetPasswordOTP = "";
    user.resetPasswordOTPExpiryAt = 0;
    user.resetPasswordOTPVerifiedAt = 0;
    await user.save();

    return res.json({ success: true, message: "Password reset successfully" });
  } catch (error) {
    return sendJsonError(res, error.message);
  }
};
