import mongoose from "mongoose";

const chatMessageSchema = new mongoose.Schema(
  {
    roomType: {
      type: String,
      enum: ["share", "public", "group"],
      required: true
    },
    shareId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "fileShare",
      default: null
    },
    groupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "group",
      default: null
    },
    senderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    body: {
      type: String,
      required: true,
      trim: true
    }
  },
  { timestamps: true }
);

const chatMessageModel = mongoose.model("chatMessage", chatMessageSchema);

export default chatMessageModel;
