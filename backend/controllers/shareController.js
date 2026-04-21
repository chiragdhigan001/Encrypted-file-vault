import fs from "fs";
import crypto from "crypto";
import fileModel from "../models/filemodel.js";
import fileShareModel from "../models/fileShareModel.js";
import chatMessageModel from "../models/chatMessageModel.js";
import userModel from "../models/userModel.js";
import groupModel from "../models/groupModel.js";

const mapUser = (user) =>
  user
    ? {
        id: user._id,
        name: user.name,
        email: user.email
      }
    : null;

const mapShare = (share, currentUserId) => ({
  id: share._id,
  fileId: share.fileId,
  fileName: share.fileName,
  fileType: share.fileType,
  fileSize: share.fileSize,
  folder: share.folder,
  permission: share.permission,
  requiresPassword: share.requiresPassword,
  systemAccessKey: share.requiresPassword ? "" : share.systemAccessKey,
  createdAt: share.createdAt,
  shareScope: share.shareScope,
  owner: mapUser(share.ownerId),
  recipient: mapUser(share.recipientId),
  group: share.groupId
    ? {
        id: share.groupId._id,
        name: share.groupId.name,
        inviteToken: share.groupId.inviteToken
      }
    : null,
  direction:
    String(share.ownerId?._id || share.ownerId) === String(currentUserId)
      ? "sent"
      : "received"
});

const userCanAccessShare = async (share, currentUserId) => {
  if (!share || !share.isActive) return false;

  if (share.shareScope === "public") return true;
  if (String(share.ownerId) === String(currentUserId)) return true;
  if (share.recipientId && String(share.recipientId) === String(currentUserId)) return true;

  if (share.groupId) {
    const group = await groupModel.findById(share.groupId).select("memberIds ownerId");
    if (!group || !group.isActive) return false;
    return (
      String(group.ownerId) === String(currentUserId) ||
      group.memberIds.some((memberId) => String(memberId) === String(currentUserId))
    );
  }

  return false;
};

export const createFileShare = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { fileId } = req.params;
    const {
      recipients = "[]",
      permission = "view",
      requiresPassword = "false",
      systemAccessKey = "",
      shareScope = "direct",
      groupId = ""
    } = req.body;
    const shareFile = req.file;

    const ownerFile = await fileModel.findOne({ _id: fileId, userID: ownerId });

    if (!ownerFile) {
      return res.json({ success: false, message: "Original file not found" });
    }

    if (!shareFile) {
      return res.json({ success: false, message: "Encrypted share copy is missing" });
    }

    if (shareScope === "public") {
      const createdShare = await fileShareModel.create({
        fileId: ownerFile._id,
        ownerId,
        fileName: ownerFile.name,
        fileType: ownerFile.type,
        fileSize: ownerFile.size,
        folder: ownerFile.folder,
        permission,
        requiresPassword: requiresPassword === "true",
        systemAccessKey: requiresPassword === "true" ? "" : systemAccessKey,
        shareCopyPath: shareFile.path,
        shareScope: "public"
      });

      return res.json({ success: true, message: "File shared publicly", shares: [createdShare] });
    }

    if (shareScope === "group") {
      const group = await groupModel.findOne({ _id: groupId, ownerId, isActive: true });

      if (!group) {
        return res.json({ success: false, message: "Group not found" });
      }

      const createdShare = await fileShareModel.create({
        fileId: ownerFile._id,
        ownerId,
        groupId: group._id,
        fileName: ownerFile.name,
        fileType: ownerFile.type,
        fileSize: ownerFile.size,
        folder: ownerFile.folder,
        permission,
        requiresPassword: requiresPassword === "true",
        systemAccessKey: requiresPassword === "true" ? "" : systemAccessKey,
        shareCopyPath: shareFile.path,
        shareScope: "group"
      });

      return res.json({ success: true, message: "File shared with group", shares: [createdShare] });
    }

    const parsedRecipients = JSON.parse(recipients);

    if (!Array.isArray(parsedRecipients) || parsedRecipients.length === 0) {
      return res.json({ success: false, message: "Select at least one user to share with" });
    }

    const uniqueRecipientIds = [...new Set(parsedRecipients)];
    const recipientUsers = await userModel.find({ _id: { $in: uniqueRecipientIds } }).select("_id name email");

    if (recipientUsers.length === 0) {
      return res.json({ success: false, message: "No valid recipients found" });
    }

    const shareDocs = recipientUsers.map((user) => ({
      fileId: ownerFile._id,
      ownerId,
      recipientId: user._id,
      fileName: ownerFile.name,
      fileType: ownerFile.type,
      fileSize: ownerFile.size,
      folder: ownerFile.folder,
      permission,
      requiresPassword: requiresPassword === "true",
      systemAccessKey: requiresPassword === "true" ? "" : systemAccessKey,
      shareCopyPath: shareFile.path,
      shareScope: "direct"
    }));

    const createdShares = await fileShareModel.insertMany(shareDocs);
    return res.json({ success: true, message: "File shared successfully", shares: createdShares });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getSharedInbox = async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const userGroups = await groupModel.find({
      isActive: true,
      $or: [{ ownerId: currentUserId }, { memberIds: currentUserId }]
    }).select("_id");

    const groupIds = userGroups.map((group) => group._id);

    const shares = await fileShareModel
      .find({
        isActive: true,
        $or: [
          { recipientId: currentUserId },
          { ownerId: currentUserId },
          { shareScope: "public" },
          { groupId: { $in: groupIds } }
        ]
      })
      .populate("ownerId", "name email")
      .populate("recipientId", "name email")
      .populate("groupId", "name inviteToken")
      .sort({ createdAt: -1 });

    const received = shares
      .filter((share) => {
        if (share.shareScope === "public") return String(share.ownerId?._id) !== String(currentUserId);
        if (share.shareScope === "group") return String(share.ownerId?._id) !== String(currentUserId);
        return String(share.recipientId?._id) === String(currentUserId);
      })
      .map((share) => mapShare(share, currentUserId));

    const sent = shares
      .filter((share) => String(share.ownerId?._id) === String(currentUserId))
      .map((share) => mapShare(share, currentUserId));

    const publicShares = shares
      .filter((share) => share.shareScope === "public")
      .map((share) => mapShare(share, currentUserId));

    const groupShares = shares
      .filter((share) => share.shareScope === "group")
      .map((share) => mapShare(share, currentUserId));

    return res.json({ success: true, received, sent, publicShares, groupShares });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getSharedFileCopy = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { shareId } = req.params;
    const share = await fileShareModel.findById(shareId);

    if (!share || !share.isActive) {
      return res.status(404).json({ success: false, message: "Shared file not found" });
    }

    const isAllowed = await userCanAccessShare(share, currentUserId);

    if (!isAllowed) {
      return res.status(403).json({ success: false, message: "You do not have access to this share" });
    }

    if (!fs.existsSync(share.shareCopyPath)) {
      return res.status(404).json({ success: false, message: "Shared copy is missing from disk" });
    }

    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    return fs.createReadStream(share.shareCopyPath).pipe(res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const revokeShare = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { shareId } = req.params;
    const share = await fileShareModel.findOne({ _id: shareId, ownerId });

    if (!share) {
      return res.json({ success: false, message: "Share not found" });
    }

    share.isActive = false;
    await share.save();

    return res.json({ success: true, message: "Share revoked successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getShareMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { shareId } = req.params;
    const share = await fileShareModel.findById(shareId);

    if (!share || !share.isActive) {
      return res.json({ success: false, message: "Share thread not found" });
    }

    const isAllowed = await userCanAccessShare(share, currentUserId);

    if (!isAllowed) {
      return res.json({ success: false, message: "You do not have access to this chat" });
    }

    const messages = await chatMessageModel
      .find({ roomType: "share", shareId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      messages: messages.map((message) => ({
        id: message._id,
        body: message.body,
        createdAt: message.createdAt,
        sender: mapUser(message.senderId)
      }))
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const postShareMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { shareId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.json({ success: false, message: "Message cannot be empty" });
    }

    const share = await fileShareModel.findById(shareId);

    if (!share || !share.isActive) {
      return res.json({ success: false, message: "Share thread not found" });
    }

    const isAllowed = await userCanAccessShare(share, currentUserId);

    if (!isAllowed) {
      return res.json({ success: false, message: "You do not have access to this chat" });
    }

    const created = await chatMessageModel.create({
      roomType: "share",
      shareId,
      senderId: currentUserId,
      body: body.trim()
    });

    const populated = await created.populate("senderId", "name email");

    return res.json({
      success: true,
      message: {
        id: populated._id,
        body: populated.body,
        createdAt: populated.createdAt,
        sender: mapUser(populated.senderId)
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getPublicMessages = async (req, res) => {
  try {
    const messages = await chatMessageModel
      .find({ roomType: "public" })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 })
      .limit(200);

    return res.json({
      success: true,
      messages: messages.map((message) => ({
        id: message._id,
        body: message.body,
        createdAt: message.createdAt,
        sender: mapUser(message.senderId)
      }))
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const postPublicMessage = async (req, res) => {
  try {
    const senderId = req.user.id;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.json({ success: false, message: "Message cannot be empty" });
    }

    const created = await chatMessageModel.create({
      roomType: "public",
      senderId,
      body: body.trim()
    });

    const populated = await created.populate("senderId", "name email");

    return res.json({
      success: true,
      message: {
        id: populated._id,
        body: populated.body,
        createdAt: populated.createdAt,
        sender: mapUser(populated.senderId)
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const createGroup = async (req, res) => {
  try {
    const ownerId = req.user.id;
    const { name, description = "", memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      return res.json({ success: false, message: "Group name is required" });
    }

    const normalizedMemberIds = [...new Set([ownerId, ...memberIds])];
    const inviteToken = crypto.randomBytes(12).toString("hex");
    const inviteLink = `${req.protocol}://${req.get("host")}/api/share/groups/join/${inviteToken}`;
    const finalDescription = description?.trim()
      ? `${description.trim()}\n\nInvitation link: ${inviteLink}`
      : `Invitation link: ${inviteLink}`;

    const group = await groupModel.create({
      name: name.trim(),
      description: finalDescription,
      ownerId,
      memberIds: normalizedMemberIds,
      inviteToken
    });

    const populated = await group.populate([
      { path: "ownerId", select: "name email" },
      { path: "memberIds", select: "name email" }
    ]);

    return res.json({
      success: true,
      group: {
        id: populated._id,
        name: populated.name,
        description: populated.description,
        inviteToken: populated.inviteToken,
        inviteLink,
        owner: mapUser(populated.ownerId),
        members: populated.memberIds.map((member) => mapUser(member))
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getGroups = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const groups = await groupModel
      .find({
        isActive: true,
        $or: [{ ownerId: currentUserId }, { memberIds: currentUserId }]
      })
      .populate("ownerId", "name email")
      .populate("memberIds", "name email")
      .sort({ createdAt: -1 });

    const payload = groups.map((group) => ({
      id: group._id,
      name: group.name,
      description: group.description,
      inviteToken: group.inviteToken,
      inviteLink: `${req.protocol}://${req.get("host")}/api/share/groups/join/${group.inviteToken}`,
      owner: mapUser(group.ownerId),
      members: group.memberIds.map((member) => mapUser(member)),
      isOwner: String(group.ownerId?._id) === String(currentUserId)
    }));

    return res.json({ success: true, groups: payload });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const joinGroupByToken = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { inviteToken } = req.params;

    const group = await groupModel.findOne({ inviteToken, isActive: true });

    if (!group) {
      return res.json({ success: false, message: "Invite link is invalid" });
    }

    if (!group.memberIds.some((memberId) => String(memberId) === String(currentUserId))) {
      group.memberIds.push(currentUserId);
      await group.save();
    }

    return res.json({ success: true, message: "Joined group successfully" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getGroupMessages = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { groupId } = req.params;
    const group = await groupModel.findById(groupId).select("ownerId memberIds isActive");

    if (!group || !group.isActive) {
      return res.json({ success: false, message: "Group not found" });
    }

    const isAllowed =
      String(group.ownerId) === String(currentUserId) ||
      group.memberIds.some((memberId) => String(memberId) === String(currentUserId));

    if (!isAllowed) {
      return res.json({ success: false, message: "You are not a member of this group" });
    }

    const messages = await chatMessageModel
      .find({ roomType: "group", groupId })
      .populate("senderId", "name email")
      .sort({ createdAt: 1 });

    return res.json({
      success: true,
      messages: messages.map((message) => ({
        id: message._id,
        body: message.body,
        createdAt: message.createdAt,
        sender: mapUser(message.senderId)
      }))
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const postGroupMessage = async (req, res) => {
  try {
    const currentUserId = req.user.id;
    const { groupId } = req.params;
    const { body } = req.body;

    if (!body || !body.trim()) {
      return res.json({ success: false, message: "Message cannot be empty" });
    }

    const group = await groupModel.findById(groupId).select("ownerId memberIds isActive");

    if (!group || !group.isActive) {
      return res.json({ success: false, message: "Group not found" });
    }

    const isAllowed =
      String(group.ownerId) === String(currentUserId) ||
      group.memberIds.some((memberId) => String(memberId) === String(currentUserId));

    if (!isAllowed) {
      return res.json({ success: false, message: "You are not a member of this group" });
    }

    const created = await chatMessageModel.create({
      roomType: "group",
      groupId,
      senderId: currentUserId,
      body: body.trim()
    });

    const populated = await created.populate("senderId", "name email");

    return res.json({
      success: true,
      message: {
        id: populated._id,
        body: populated.body,
        createdAt: populated.createdAt,
        sender: mapUser(populated.senderId)
      }
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
