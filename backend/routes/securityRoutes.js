import express from "express";
import userAuth from "../middleware/userAuth.js";
import requirePermission from "../middleware/requirePermission.js";
import {
  beginMfaSetup,
  disableMfa,
  enableMfa,
  getAuditLogs,
  getGlobalAuditSnapshot,
  getSecurityOverview,
  googleAuth,
  listUsersForAdmin,
  listUserSessions,
  revokeSession,
  updateUserRole,
  verifyMfaLogin
} from "../controllers/securityController.js";

const securityRouter = express.Router();

securityRouter.post("/auth/google", googleAuth);
securityRouter.post("/auth/mfa/verify", verifyMfaLogin);
securityRouter.get("/overview", userAuth, getSecurityOverview);
securityRouter.get("/sessions", userAuth, listUserSessions);
securityRouter.delete("/sessions/:sessionId", userAuth, revokeSession);
securityRouter.post("/mfa/setup", userAuth, beginMfaSetup);
securityRouter.post("/mfa/enable", userAuth, enableMfa);
securityRouter.post("/mfa/disable", userAuth, disableMfa);
securityRouter.get("/audit", userAuth, getAuditLogs);
securityRouter.get("/audit/snapshot", userAuth, requirePermission("audit"), getGlobalAuditSnapshot);
securityRouter.get("/admin/users", userAuth, requirePermission("manage_users"), listUsersForAdmin);
securityRouter.patch("/admin/users/:userId/role", userAuth, requirePermission("manage_users"), updateUserRole);

export default securityRouter;
