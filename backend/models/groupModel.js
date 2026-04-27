import mongoose from "mongoose";

const groupSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    description: {
      type: String,
      default: "",
      trim: true
    },
    ownerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "user",
      required: true
    },
    memberIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
      }
    ],
    adminIds: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "user"
      }
    ],
    inviteToken: {
      type: String,
      required: true,
      unique: true
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

const groupModel = mongoose.model("group", groupSchema);

export default groupModel;
