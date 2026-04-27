import express from "express";
import userAuth from "../middleware/userAuth.js";
import shareUpload from "../middleware/shareUpload.js";
import {
  createFileShare,
  getSharedInbox,
  getSharedFileCopy,
  revokeShare,
  getShareMessages,
  postShareMessage,
  getPublicMessages,
  postPublicMessage,
  createGroup,
  getGroups,
  joinGroupByToken,
  getGroupMessages,
  postGroupMessage,
  leaveGroup,
  deleteGroup,
  updateGroupMemberRole
} from "../controllers/shareController.js";

const shareRouter = express.Router();

shareRouter.get("/public/messages", userAuth, getPublicMessages);
shareRouter.post("/public/messages", userAuth, postPublicMessage);
shareRouter.get("/groups", userAuth, getGroups);
shareRouter.post("/groups", userAuth, createGroup);
shareRouter.post("/groups/join/:inviteToken", userAuth, joinGroupByToken);
shareRouter.post("/groups/:groupId/leave", userAuth, leaveGroup);
shareRouter.delete("/groups/:groupId", userAuth, deleteGroup);
shareRouter.patch("/groups/:groupId/members/:memberId/role", userAuth, updateGroupMemberRole);
shareRouter.get("/groups/:groupId/messages", userAuth, getGroupMessages);
shareRouter.post("/groups/:groupId/messages", userAuth, postGroupMessage);
shareRouter.get("/inbox", userAuth, getSharedInbox);
shareRouter.post("/file/:fileId", userAuth, shareUpload.single("shareFile"), createFileShare);
shareRouter.get("/file/:shareId/download", userAuth, getSharedFileCopy);
shareRouter.delete("/:shareId", userAuth, revokeShare);
shareRouter.get("/:shareId/messages", userAuth, getShareMessages);
shareRouter.post("/:shareId/messages", userAuth, postShareMessage);

export default shareRouter;
