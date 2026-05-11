import mongoose from "mongoose";

const fileShareSchema = new mongoose.Schema(
  {
    fileId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "file",
      required: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    recipientId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      default: null
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      default: null
    },
    shareScope: {
      type: String,
      enum: ["direct", "public", "group"],
      default: "direct"
    },
    fileName: {
      type: String,
      required: true
    },
    fileType: {
      type: String,
      required: true
    },
    fileSize: {
      type: String,
      required: true
    },
    folder: {
      type: String,
      default: "General"
    },
    permission: {
      type: String,
      enum: ["view", "download"],
      default: "view"
    },
    requiresPassword: {
      type: Boolean,
      default: false
    },
    systemAccessKey: {
      type: String,
      default: ""
    },
    shareLinkToken: {
      type: String,
      default: "",
      index: true
    },
    expiresAt: {
      type: Date,
      default: null
    },
    oneTimeAccess: {
      type: Boolean,
      default: false
    },
    accessCount: {
      type: Number,
      default: 0
    },
    lastAccessedAt: {
      type: Date,
      default: null
    },
    revokedAt: {
      type: Date,
      default: null
    },
    revokeReason: {
      type: String,
      default: ""
    },
    downloadHistory: {
      type: [
        {
          userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "user",
            default: null
          },
          ipAddress: {
            type: String,
            default: ""
          },
          accessedAt: {
            type: Date,
            default: Date.now
          }
        }
      ],
      default: []
    },
    shareCopyPath: {
      type: String,
      required: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const fileShareModel = mongoose.model("fileShare", fileShareSchema);

export default fileShareModel;
