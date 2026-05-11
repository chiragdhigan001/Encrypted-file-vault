import crypto from "crypto";
import * as otplib from "otplib";
import QRCode from "qrcode";
import { OAuth2Client } from "google-auth-library";
import userModel from "../models/userModel.js";
import sessionModel from "../models/sessionModel.js";
import auditLogModel from "../models/auditLogModel.js";
import fileModel from "../models/filemodel.js";
import { writeAuditLog } from "../utils/auditLog.js";
import { clearAuthCookies, issueSession, revokeSessionByRefreshToken, setAuthCookies } from "../utils/authSession.js";
import { getRolePermissions, hasPermission } from "../utils/rbac.js";

const { authenticator } = otplib;
const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID || undefined);

const hashRecoveryCode = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const generateRecoveryCodes = () => {
  const plainCodes = Array.from({ length: 8 }, () =>
    crypto.randomBytes(4).toString("hex").match(/.{1,4}/g).join("-")
  );

  return {
    plainCodes,
    hashedCodes: plainCodes.map(hashRecoveryCode)
  };
};

const signMfaChallenge = (userId) =>
  crypto
    .createHmac("sha256", process.env.JWT_SECRET)
    .update(`${userId}:${Date.now()}:${crypto.randomUUID()}`)
    .digest("hex");

const inMemoryMfaChallenges = new Map();

const createMfaChallenge = (userId) => {
  const challenge = signMfaChallenge(userId);
  inMemoryMfaChallenges.set(challenge, {
    userId: String(userId),
    expiresAt: Date.now() + 10 * 60 * 1000
  });
  return challenge;
};

const consumeMfaChallenge = (challenge) => {
  const payload = inMemoryMfaChallenges.get(challenge);
  if (!payload || payload.expiresAt < Date.now()) {
    inMemoryMfaChallenges.delete(challenge);
    return null;
  }
  inMemoryMfaChallenges.delete(challenge);
  return payload;
};

const mapSession = (session, currentSessionId) => ({
  id: session._id,
  ipAddress: session.ipAddress,
  userAgent: session.userAgent,
  fingerprint: session.fingerprint,
  lastSeenAt: session.lastSeenAt,
  createdAt: session.createdAt,
  expiresAt: session.expiresAt,
  isCurrent: String(session._id) === String(currentSessionId)
});

const buildRiskScore = ({ user, activeSessions, recentFailures }) => {
  let score = 45;
  if (user.isMfaEnabled) score += 20;
  if (user.isAccountVerified) score += 10;
  if (activeSessions <= 3) score += 10;
  if (recentFailures === 0) score += 15;
  return Math.max(0, Math.min(100, score));
};

export const beginMfaSetup = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);

    if (!user) {
      return res.json({ success: false, message: "User not found" });
    }

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(user.email, "Secure Vault", secret);
    const qrCodeDataUrl = await QRCode.toDataURL(otpauth);

    user.mfaTempSecret = secret;
    await user.save();

    return res.json({
      success: true,
      setup: {
        qrCodeDataUrl,
        secret,
        otpauth
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const enableMfa = async (req, res) => {
  try {
    const { otp } = req.body;
    const user = await userModel.findById(req.user.id);

    if (!user?.mfaTempSecret) {
      return res.json({ success: false, message: "No MFA setup is pending" });
    }

    if (!otp || !authenticator.verify({ token: String(otp), secret: user.mfaTempSecret })) {
      return res.json({ success: false, message: "Invalid authentication code" });
    }

    const { plainCodes, hashedCodes } = generateRecoveryCodes();
    user.mfaSecret = user.mfaTempSecret;
    user.mfaTempSecret = "";
    user.isMfaEnabled = true;
    user.recoveryCodes = hashedCodes;
    await user.save();
    await writeAuditLog({ req, userId: user._id, action: "mfa_enable", status: "success" });

    return res.json({
      success: true,
      recoveryCodes: plainCodes,
      message: "Two-factor authentication enabled"
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const disableMfa = async (req, res) => {
  try {
    const { otp, recoveryCode } = req.body;
    const user = await userModel.findById(req.user.id);

    if (!user?.isMfaEnabled || !user.mfaSecret) {
      return res.json({ success: false, message: "MFA is not enabled" });
    }

    const otpValid = otp ? authenticator.verify({ token: String(otp), secret: user.mfaSecret }) : false;
    const recoveryHash = recoveryCode ? hashRecoveryCode(String(recoveryCode).trim()) : "";
    const recoveryIndex = recoveryHash ? user.recoveryCodes.findIndex((code) => code === recoveryHash) : -1;

    if (!otpValid && recoveryIndex === -1) {
      return res.json({ success: false, message: "A valid OTP or recovery code is required" });
    }

    if (recoveryIndex >= 0) {
      user.recoveryCodes.splice(recoveryIndex, 1);
    }

    user.isMfaEnabled = false;
    user.mfaSecret = "";
    user.mfaTempSecret = "";
    user.recoveryCodes = [];
    await user.save();
    await writeAuditLog({ req, userId: user._id, action: "mfa_disable", status: "success" });

    return res.json({ success: true, message: "Two-factor authentication disabled" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getSecurityOverview = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id);
    const sessions = await sessionModel.find({
      userId: req.user.id,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ lastSeenAt: -1 });
    const recentAuditLogs = await auditLogModel
      .find({ userId: req.user.id })
      .sort({ createdAt: -1 })
      .limit(15);
    const recentFailures = recentAuditLogs.filter((log) => log.status === "failure").length;
    const deletedFiles = await fileModel.countDocuments({ userID: req.user.id, deletedAt: { $ne: null } });

    return res.json({
      success: true,
      overview: {
        role: user.role,
        permissions: getRolePermissions(user.role),
        isMfaEnabled: user.isMfaEnabled,
        isGoogleConnected: Boolean(user.googleId),
        isAccountVerified: user.isAccountVerified,
        sessions: sessions.map((session) => mapSession(session, req.user.sessionId)),
        recentAuditLogs,
        trashCount: deletedFiles,
        riskScore: buildRiskScore({
          user,
          activeSessions: sessions.length,
          recentFailures
        })
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const listUserSessions = async (req, res) => {
  try {
    const sessions = await sessionModel.find({
      userId: req.user.id,
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    }).sort({ lastSeenAt: -1 });

    return res.json({
      success: true,
      sessions: sessions.map((session) => mapSession(session, req.user.sessionId))
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const revokeSession = async (req, res) => {
  try {
    const { sessionId } = req.params;
    const session = await sessionModel.findOneAndUpdate(
      { _id: sessionId, userId: req.user.id, revokedAt: null },
      { revokedAt: new Date() },
      { new: true }
    );

    if (!session) {
      return res.json({ success: false, message: "Session not found" });
    }

    if (String(session._id) === String(req.user.sessionId)) {
      await revokeSessionByRefreshToken(req.cookies.refreshToken);
      clearAuthCookies(res);
    }

    await writeAuditLog({ req, userId: req.user.id, action: "session_revoke", status: "success", targetType: "session", targetId: String(session._id) });
    return res.json({ success: true, message: "Session revoked successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getAuditLogs = async (req, res) => {
  try {
    const user = await userModel.findById(req.user.id).select("role");
    const canAuditAll = hasPermission(user, "audit");
    const limit = Math.min(Number(req.query.limit) || 50, 200);
    const filters = canAuditAll && req.query.scope === "all" ? {} : { userId: req.user.id };

    const logs = await auditLogModel.find(filters).sort({ createdAt: -1 }).limit(limit);
    return res.json({ success: true, logs, scope: canAuditAll && req.query.scope === "all" ? "all" : "self" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const updateUserRole = async (req, res) => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!["user", "admin", "auditor", "team_owner"].includes(role)) {
      return res.json({ success: false, message: "Invalid role" });
    }

    const updatedUser = await userModel.findByIdAndUpdate(userId, { role }, { new: true }).select("_id name email role");

    if (!updatedUser) {
      return res.json({ success: false, message: "User not found" });
    }

    await writeAuditLog({ req, userId: req.user.id, action: "role_update", status: "success", targetType: "user", targetId: String(updatedUser._id), metadata: { role } });
    return res.json({ success: true, user: updatedUser });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const verifyMfaLogin = async (req, res) => {
  try {
    const { mfaToken, otp, recoveryCode } = req.body;
    const challenge = consumeMfaChallenge(mfaToken);

    if (!challenge?.userId) {
      return res.json({ success: false, message: "MFA session expired. Please log in again." });
    }

    const user = await userModel.findById(challenge.userId);

    if (!user?.isMfaEnabled || !user.mfaSecret) {
      return res.json({ success: false, message: "MFA is not enabled for this user" });
    }

    const otpValid = otp ? authenticator.verify({ token: String(otp), secret: user.mfaSecret }) : false;
    const recoveryHash = recoveryCode ? hashRecoveryCode(String(recoveryCode).trim()) : "";
    const recoveryIndex = recoveryHash ? user.recoveryCodes.findIndex((code) => code === recoveryHash) : -1;

    if (!otpValid && recoveryIndex === -1) {
      await writeAuditLog({ req, userId: user._id, action: "mfa_login", status: "failure", message: "Invalid OTP/recovery code" });
      return res.json({ success: false, message: "Invalid authentication code" });
    }

    if (recoveryIndex >= 0) {
      user.recoveryCodes.splice(recoveryIndex, 1);
      await user.save();
    }

    const { accessToken, refreshToken } = await issueSession(user._id, req);
    setAuthCookies(res, accessToken, refreshToken);
    await writeAuditLog({ req, userId: user._id, action: "mfa_login", status: "success" });
    return res.json({ success: true, message: "Login completed" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const maybeStartMfaChallenge = async (user) => {
  if (!user?.isMfaEnabled || !user.mfaSecret) {
    return null;
  }

  return createMfaChallenge(user._id);
};

export const googleAuth = async (req, res) => {
  try {
    const { credential } = req.body;

    if (!process.env.GOOGLE_CLIENT_ID) {
      return res.json({ success: false, message: "Google authentication is not configured yet." });
    }

    if (!credential) {
      return res.json({ success: false, message: "Missing Google credential" });
    }

    const ticket = await googleClient.verifyIdToken({
      idToken: credential,
      audience: process.env.GOOGLE_CLIENT_ID
    });
    const payload = ticket.getPayload();

    if (!payload?.email) {
      return res.json({ success: false, message: "Google account email is missing" });
    }

    let user = await userModel.findOne({ email: payload.email });

    if (!user) {
      user = await userModel.create({
        name: payload.name || payload.email.split("@")[0],
        email: payload.email,
        password: crypto.randomBytes(24).toString("hex"),
        googleId: payload.sub || "",
        isAccountVerified: Boolean(payload.email_verified)
      });
    } else if (!user.googleId) {
      user.googleId = payload.sub || "";
      await user.save();
    }

    const mfaToken = await maybeStartMfaChallenge(user);
    if (mfaToken) {
      return res.json({ success: true, requiresMfa: true, mfaToken, email: user.email });
    }

    const { accessToken, refreshToken } = await issueSession(user._id, req);
    setAuthCookies(res, accessToken, refreshToken);
    await writeAuditLog({ req, userId: user._id, action: "google_login", status: "success" });
    return res.json({ success: true, message: "Signed in with Google" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getGlobalAuditSnapshot = async (req, res) => {
  try {
    const logs = await auditLogModel.aggregate([
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$action",
          total: { $sum: 1 },
          failures: {
            $sum: {
              $cond: [{ $eq: ["$status", "failure"] }, 1, 0]
            }
          }
        }
      }
    ]);

    return res.json({ success: true, stats: logs });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const listUsersForAdmin = async (req, res) => {
  try {
    const users = await userModel
      .find({})
      .select("_id name email role isAccountVerified isMfaEnabled lastLoginAt googleId")
      .sort({ createdAt: -1 })
      .limit(200);

    return res.json({
      success: true,
      users: users.map((user) => ({
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        isAccountVerified: user.isAccountVerified,
        isMfaEnabled: user.isMfaEnabled,
        isGoogleConnected: Boolean(user.googleId),
        lastLoginAt: user.lastLoginAt
      }))
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
