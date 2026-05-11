import express from "express";
import {
  getVaultStatus,
  setVaultPassword,
  passwordUnlockVault,
  uploadFile,
  deleteFiles,
  getVaultFiles,
  downloadEncryptedFile,
  getTrashFiles,
  restoreTrashFile,
  purgeTrashFile,
  getFileVersions,
  restoreFileVersion
} from "../controllers/vaultController.js";
import userAuth from "../middleware/userAuth.js";
import upload from "../middleware/multer.js";

const vaultRouter = express.Router()

vaultRouter.get("/status", userAuth, getVaultStatus)
vaultRouter.post("/set-password", userAuth, setVaultPassword)
vaultRouter.post("/unlock", userAuth, passwordUnlockVault)
vaultRouter.post(
  "/upload",
  userAuth,
  upload.single("file"),
  uploadFile
);
vaultRouter.get("/files", userAuth, getVaultFiles);
vaultRouter.get("/trash", userAuth, getTrashFiles);
vaultRouter.get("/file/:fileId/versions", userAuth, getFileVersions);
vaultRouter.post("/file/:fileId/restore-version", userAuth, restoreFileVersion);
vaultRouter.get("/file/:fileId/download", userAuth, downloadEncryptedFile);
vaultRouter.delete("/delete/:fileId", userAuth, deleteFiles);
vaultRouter.post("/restore/:fileId", userAuth, restoreTrashFile);
vaultRouter.delete("/purge/:fileId", userAuth, purgeTrashFile);

export default vaultRouter;
