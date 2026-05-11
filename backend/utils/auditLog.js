import auditLogModel from "../models/auditLogModel.js";

export const writeAuditLog = async ({
  req,
  userId = null,
  action,
  status,
  targetType = "",
  targetId = "",
  message = "",
  metadata = {}
}) => {
  try {
    await auditLogModel.create({
      userId,
      action,
      status,
      ipAddress: req?.ip || "",
      userAgent: req?.get?.("user-agent") || "",
      fingerprint: req?.fingerprint || "",
      targetType,
      targetId,
      message,
      metadata
    });
  } catch (error) {
    console.error("Audit log write failed:", error.message);
  }
};
