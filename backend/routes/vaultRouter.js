import express from "express";
import {
  setVaultPassword,
  passwordUnlockVault,
  uploadFile,
  deleteFiles,
  getVaultFiles,
  downloadEncryptedFile
} from "../controllers/vaultController.js";
import userAuth from "../middleware/userAuth.js";
import upload from "../middleware/multer.js";

const vaultRouter = express.Router()

vaultRouter.post("/set-password", userAuth, setVaultPassword)
vaultRouter.post("/unlock", userAuth, passwordUnlockVault)
vaultRouter.post(
  "/upload",
  userAuth,
  upload.single("file"),
  uploadFile
);
vaultRouter.get("/files", userAuth, getVaultFiles);
vaultRouter.get("/file/:fileId/download", userAuth, downloadEncryptedFile);
vaultRouter.delete("/delete/:fileId", userAuth, deleteFiles);

export default vaultRouter;
