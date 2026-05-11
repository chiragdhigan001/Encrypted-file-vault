import crypto from "crypto";
import jwt from "jsonwebtoken";
import sessionModel from "../models/sessionModel.js";

const ACCESS_COOKIE = "token";
const REFRESH_COOKIE = "refreshToken";
const ACCESS_TOKEN_TTL_MS = 15 * 60 * 1000;
const REFRESH_TOKEN_TTL_MS = 30 * 24 * 60 * 60 * 1000;

const getCookieBaseOptions = () => ({
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: process.env.NODE_ENV === "production" ? "none" : "strict",
  path: "/"
});

export const createAccessToken = ({ userId, sessionId }) =>
  jwt.sign(
    { id: String(userId), sessionId: String(sessionId) },
    process.env.JWT_SECRET,
    { expiresIn: "15m" }
  );

export const hashToken = (token) =>
  crypto.createHash("sha256").update(token).digest("hex");

export const buildFingerprint = (req) =>
  crypto
    .createHash("sha256")
    .update(
      [
        req.get("user-agent") || "",
        req.get("accept-language") || "",
        req.ip || "",
        req.get("sec-ch-ua-platform") || ""
      ].join("|")
    )
    .digest("hex");

export const setAuthCookies = (res, accessToken, refreshToken) => {
  res.cookie(ACCESS_COOKIE, accessToken, {
    ...getCookieBaseOptions(),
    maxAge: ACCESS_TOKEN_TTL_MS
  });

  res.cookie(REFRESH_COOKIE, refreshToken, {
    ...getCookieBaseOptions(),
    maxAge: REFRESH_TOKEN_TTL_MS
  });
};

export const clearAuthCookies = (res) => {
  res.clearCookie(ACCESS_COOKIE, getCookieBaseOptions());
  res.clearCookie(REFRESH_COOKIE, getCookieBaseOptions());
};

export const issueSession = async (userId, req, existingSession = null) => {
  const refreshToken = crypto.randomBytes(48).toString("hex");
  const refreshTokenHash = hashToken(refreshToken);
  const sessionPayload = {
    refreshTokenHash,
    fingerprint: buildFingerprint(req),
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || "",
    lastSeenAt: new Date(),
    expiresAt: new Date(Date.now() + REFRESH_TOKEN_TTL_MS),
    revokedAt: null
  };

  const session = existingSession
    ? await sessionModel.findByIdAndUpdate(existingSession._id, sessionPayload, { new: true })
    : await sessionModel.create({
        userId,
        ...sessionPayload
      });

  const accessToken = createAccessToken({ userId, sessionId: session._id });
  return { accessToken, refreshToken, session };
};

export const resolveSessionFromRefreshToken = async (refreshToken) => {
  if (!refreshToken) return null;

  return sessionModel
    .findOne({
      refreshTokenHash: hashToken(refreshToken),
      revokedAt: null,
      expiresAt: { $gt: new Date() }
    })
    .populate("userId");
};

export const markSessionSeen = async (sessionId, req) => {
  if (!sessionId) return;

  await sessionModel.findByIdAndUpdate(sessionId, {
    lastSeenAt: new Date(),
    ipAddress: req.ip || "",
    userAgent: req.get("user-agent") || ""
  });
};

export const revokeSessionByRefreshToken = async (refreshToken) => {
  if (!refreshToken) return;

  await sessionModel.findOneAndUpdate(
    { refreshTokenHash: hashToken(refreshToken), revokedAt: null },
    { revokedAt: new Date() }
  );
};

export const revokeAllSessionsForUser = async (userId) => {
  await sessionModel.updateMany(
    { userId, revokedAt: null },
    { revokedAt: new Date() }
  );
};
