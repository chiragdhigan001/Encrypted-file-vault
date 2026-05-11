import mongoose from "mongoose";

const auditLogSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null,
      index: true
    },
    action: {
      type: String,
      required: true,
      index: true
    },
    status: {
      type: String,
      enum: ["success", "failure"],
      required: true
    },
    ipAddress: {
      type: String,
      default: ""
    },
    userAgent: {
      type: String,
      default: ""
    },
    fingerprint: {
      type: String,
      default: ""
    },
    targetType: {
      type: String,
      default: ""
    },
    targetId: {
      type: String,
      default: ""
    },
    message: {
      type: String,
      default: ""
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { timestamps: true }
);

const auditLogModel = mongoose.model("auditLog", auditLogSchema);

export default auditLogModel;
