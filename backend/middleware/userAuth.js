import jwt from "jsonwebtoken";
import {
  clearAuthCookies,
  issueSession,
  markSessionSeen,
  resolveSessionFromRefreshToken,
  setAuthCookies
} from "../utils/authSession.js";

const userAuth = async (req, res, next) => {
  const { token, refreshToken } = req.cookies;

  try {
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      if (decoded?.id) {
        req.user = { id: decoded.id, sessionId: decoded.sessionId || "" };
        await markSessionSeen(decoded.sessionId, req);
        return next();
      }
    }
  } catch (error) {
    // fall through to refresh token recovery
  }

  try {
    const session = await resolveSessionFromRefreshToken(refreshToken);

    if (!session?.userId?._id) {
      clearAuthCookies(res);
      return res.status(401).json({ success: false, message: "Unauthorized Access" });
    }

    const { accessToken, refreshToken: nextRefreshToken, session: rotatedSession } = await issueSession(
      session.userId._id,
      req,
      session
    );
    setAuthCookies(res, accessToken, nextRefreshToken);
    req.user = { id: session.userId._id, sessionId: rotatedSession._id };
    return next();
  } catch (error) {
    clearAuthCookies(res);
    return res.status(401).json({ success: false, message: "Unauthorized Access" });
  }
};

export default userAuth;
