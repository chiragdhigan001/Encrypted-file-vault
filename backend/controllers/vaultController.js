import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";
import mongoose from "mongoose";
import unlockVaultModel from "../models/unlockVaultModel.js";
import fileModel from "../models/filemodel.js";
import { createVaultSalt, deriveVaultAuthVerifier } from "../utils/vaultCrypto.js";
import { writeAuditLog } from "../utils/auditLog.js";
import localStorageAdapter from "../infra/storage/localStorage.js";

const RETENTION_DAYS = 30;

const formatSizeLabel = (sizeBytes = 0) => {
  const numericSize = Number(sizeBytes) || 0;
  if (numericSize >= 1024 * 1024 * 1024) return `${(numericSize / (1024 * 1024 * 1024)).toFixed(2)} GB`;
  if (numericSize >= 1024 * 1024) return `${(numericSize / (1024 * 1024)).toFixed(2)} MB`;
  if (numericSize >= 1024) return `${(numericSize / 1024).toFixed(2)} KB`;
  return `${numericSize} B`;
};

const mapVaultFile = (file) => ({
  id: file._id,
  name: file.name,
  size: file.size,
  sizeBytes: file.sizeBytes,
  type: file.type,
  folder: file.folder,
  encrypted: file.isEncrypted,
  uploadedAt: file.uploadAt,
  encryptionVersion: file.encryptionVersion,
  encryptedDek: file.encryptedDek,
  fileIv: file.fileIv,
  wrapIv: file.wrapIv,
  integrityHash: file.integrityHash,
  legacyEncryption: file.legacyEncryption,
  versionGroupId: file.versionGroupId,
  versionNumber: file.versionNumber,
  isCurrentVersion: file.isCurrentVersion,
  previousVersionId: file.previousVersionId,
  deletedAt: file.deletedAt,
  retentionExpiresAt: file.retentionExpiresAt,
  aiCategory: file.aiCategory,
  aiTags: file.aiTags,
  aiSensitiveFindings: file.aiSensitiveFindings,
  aiSummary: file.aiSummary,
  extractedTextPreview: file.extractedTextPreview
});

const permanentlyDeleteFile = async (file) => {
  localStorageAdapter.delete(file.path);
  await fileModel.findByIdAndDelete(file._id);
};

const ensureFileAccess = (fileId, userId) =>
  fileModel.findOne({ _id: fileId, userID: userId });

const promoteVersion = async (file) => {
  await fileModel.updateMany(
    { userID: file.userID, versionGroupId: file.versionGroupId },
    { isCurrentVersion: false }
  );
  file.isCurrentVersion = true;
  file.deletedAt = null;
  file.deletedByUserId = null;
  file.retentionExpiresAt = null;
  await file.save();
};

export const getVaultStatus = async (req, res) => {
  try {
    const vault = await unlockVaultModel.findOne({ userId: req.user.id });

    if (!vault) {
      return res.json({ success: true, initialized: false });
    }

    return res.json({
      success: true,
      initialized: true,
      scheme: vault.authVerifier ? "zk-v1" : "legacy-bcrypt",
      kdfSalt: vault.kdfSalt || "",
      kdfIterations: vault.kdfIterations || 210000
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const setVaultPassword = async (req, res) => {
  const userId = req.user.id;
  const { authVerifier, vaultSalt, vaultIterations } = req.body;

  if (!authVerifier || !vaultSalt || !vaultIterations) {
    return res.json({ success: false, message: "Vault key setup data is incomplete" });
  }

  try {
    await unlockVaultModel.findOneAndUpdate(
      { userId },
      {
        authVerifier,
        kdfSalt: vaultSalt,
        kdfIterations: Number(vaultIterations),
        scheme: "zk-v1"
      },
      { upsert: true, new: true }
    );

    await writeAuditLog({ req, userId, action: "vault_password_set", status: "success" });
    return res.json({ success: true, message: "Vault Password Set Successfully" });
  } catch (error) {
    await writeAuditLog({ req, userId, action: "vault_password_set", status: "failure", message: error.message });
    return res.json({ success: false, message: error.message });
  }
};

export const passwordUnlockVault = async (req, res) => {
  const userId = req.user.id;
  const { vaultPassword, vaultAuthVerifier } = req.body;

  try {
    const vault = await unlockVaultModel.findOne({ userId });

    if (!vault) {
      return res.json({
        success: false,
        message: "Vault not initialized. Please set a password first."
      });
    }

    if (vault.authVerifier) {
      if (!vaultAuthVerifier) {
        return res.json({ success: false, message: "Vault proof is required" });
      }

      if (vaultAuthVerifier !== vault.authVerifier) {
        await writeAuditLog({ req, userId, action: "vault_unlock", status: "failure", message: "Invalid vault proof" });
        return res.json({ success: false, message: "Invalid Vault Password" });
      }

      await writeAuditLog({ req, userId, action: "vault_unlock", status: "success" });
      return res.json({ success: true, message: "Vault Unlocked" });
    }

    if (!vaultPassword) {
      return res.json({ success: false, message: "Please enter your password" });
    }

    const isMatch = await bcrypt.compare(vaultPassword, vault.vaultPassword);

    if (!isMatch) {
      await writeAuditLog({ req, userId, action: "vault_unlock", status: "failure", message: "Invalid legacy vault password" });
      return res.json({ success: false, message: "Invalid Vault Password" });
    }

    const kdfSalt = createVaultSalt();
    const kdfIterations = 210000;
    const authVerifier = deriveVaultAuthVerifier(vaultPassword, kdfSalt, kdfIterations);

    vault.authVerifier = authVerifier;
    vault.kdfSalt = kdfSalt;
    vault.kdfIterations = kdfIterations;
    vault.scheme = "zk-v1";
    await vault.save();

    await writeAuditLog({ req, userId, action: "vault_unlock", status: "success", message: "Legacy vault migrated" });
    return res.json({ success: true, message: "Vault Unlocked", migrated: true, kdfSalt, kdfIterations });
  } catch (error) {
    await writeAuditLog({ req, userId, action: "vault_unlock", status: "failure", message: error.message });
    return res.json({ success: false, message: error.message });
  }
};

export const uploadFile = async (req, res) => {
  try {
    const userId = req.user.id;
    const {
      folder,
      size,
      sizeBytes,
      originalType,
      originalName,
      encryptionVersion,
      encryptedDek,
      fileIv,
      wrapIv,
      integrityHash,
      aiCategory = "",
      aiTags = "[]",
      aiSensitiveFindings = "[]",
      aiSummary = "",
      extractedTextPreview = ""
    } = req.body;
    const file = req.file;

    if (!file) {
      return res.json({ success: false, message: "No file uploaded" });
    }

    const parsedAiTags = (() => {
      try {
        return JSON.parse(aiTags);
      } catch {
        return [];
      }
    })();
    const parsedSensitiveFindings = (() => {
      try {
        return JSON.parse(aiSensitiveFindings);
      } catch {
        return [];
      }
    })();

    const existingCurrentFile = await fileModel.findOne({
      userID: userId,
      name: originalName || file.originalname,
      folder: folder || "General",
      deletedAt: null,
      isCurrentVersion: true
    }).sort({ versionNumber: -1 });

    const versionGroupId = existingCurrentFile?.versionGroupId || new mongoose.Types.ObjectId();
    const versionNumber = existingCurrentFile ? (existingCurrentFile.versionNumber || 1) + 1 : 1;

    if (existingCurrentFile) {
      existingCurrentFile.isCurrentVersion = false;
      await existingCurrentFile.save();
    }

    const savedFile = await fileModel.create({
      userID: userId,
      name: originalName || file.originalname,
      path: file.path,
      size: size || formatSizeLabel(sizeBytes || file.size),
      sizeBytes: Number(sizeBytes) || 0,
      type: originalType || file.mimetype,
      folder: folder || "General",
      versionGroupId,
      versionNumber,
      previousVersionId: existingCurrentFile?._id || null,
      isCurrentVersion: true,
      isEncrypted: true,
      encryptionVersion: encryptionVersion || "legacy-cryptojs",
      encryptedDek: encryptedDek || "",
      fileIv: fileIv || "",
      wrapIv: wrapIv || "",
      integrityHash: integrityHash || "",
      legacyEncryption: !encryptionVersion || encryptionVersion === "legacy-cryptojs",
      aiCategory: aiCategory || "",
      aiTags: Array.isArray(parsedAiTags) ? parsedAiTags : [],
      aiSensitiveFindings: Array.isArray(parsedSensitiveFindings) ? parsedSensitiveFindings : [],
      aiSummary: aiSummary || "",
      extractedTextPreview: extractedTextPreview || ""
    });

    await writeAuditLog({
      req,
      userId,
      action: "vault_upload",
      status: "success",
      targetType: "file",
      targetId: String(savedFile._id),
      metadata: {
        encryptionVersion: savedFile.encryptionVersion,
        fileName: savedFile.name,
        versionNumber
      }
    });

    return res.json({
      success: true,
      message: versionNumber > 1 ? "New file version uploaded and saved to the vault" : "File encrypted and saved to the vault",
      file: mapVaultFile(savedFile)
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getVaultFiles = async (req, res) => {
  try {
    const files = await fileModel.find({
      userID: req.user.id,
      deletedAt: null,
      isCurrentVersion: true
    }).sort({ uploadAt: -1 });

    return res.json({ success: true, files: files.map(mapVaultFile) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getTrashFiles = async (req, res) => {
  try {
    const files = await fileModel.find({
      userID: req.user.id,
      deletedAt: { $ne: null }
    }).sort({ deletedAt: -1 });

    return res.json({ success: true, files: files.map(mapVaultFile) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const getFileVersions = async (req, res) => {
  try {
    const file = await ensureFileAccess(req.params.fileId, req.user.id);

    if (!file) {
      return res.json({ success: false, message: "File not found" });
    }

    const versions = await fileModel.find({
      userID: req.user.id,
      versionGroupId: file.versionGroupId
    }).sort({ versionNumber: -1 });

    return res.json({ success: true, versions: versions.map(mapVaultFile) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const restoreFileVersion = async (req, res) => {
  try {
    const file = await ensureFileAccess(req.params.fileId, req.user.id);

    if (!file) {
      return res.json({ success: false, message: "File not found" });
    }

    await promoteVersion(file);
    await writeAuditLog({ req, userId: req.user.id, action: "vault_version_restore", status: "success", targetType: "file", targetId: String(file._id) });

    return res.json({ success: true, message: "File version restored", file: mapVaultFile(file) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const downloadEncryptedFile = async (req, res) => {
  try {
    const file = await fileModel.findOne({
      _id: req.params.fileId,
      userID: req.user.id
    });

    if (!file) {
      return res.status(404).json({ success: false, message: "File not found" });
    }

    if (!localStorageAdapter.exists(file.path)) {
      return res.status(404).json({ success: false, message: "Stored file is missing from disk" });
    }

    const safeName = path.basename(file.name).replace(/"/g, "");
    res.setHeader("Content-Type", "application/octet-stream");
    res.setHeader("X-Original-File-Name", encodeURIComponent(safeName));
    res.setHeader("X-Original-File-Type", file.type);
    res.setHeader("X-Encryption-Version", file.encryptionVersion || "legacy-cryptojs");
    res.setHeader("Content-Disposition", `attachment; filename="${safeName}.enc"`);

    await writeAuditLog({
      req,
      userId: req.user.id,
      action: "vault_download_encrypted",
      status: "success",
      targetType: "file",
      targetId: String(file._id)
    });

    return localStorageAdapter.stream(file.path).pipe(res);
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export const deleteFiles = async (req, res) => {
  try {
    const file = await ensureFileAccess(req.params.fileId, req.user.id);

    if (!file) {
      return res.json({ success: false, message: "File not found" });
    }

    file.deletedAt = new Date();
    file.deletedByUserId = req.user.id;
    file.retentionExpiresAt = new Date(Date.now() + RETENTION_DAYS * 24 * 60 * 60 * 1000);
    await file.save();

    await writeAuditLog({ req, userId: req.user.id, action: "vault_delete", status: "success", targetType: "file", targetId: String(file._id) });
    return res.json({ success: true, message: "File moved to trash", file: mapVaultFile(file) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const restoreTrashFile = async (req, res) => {
  try {
    const file = await fileModel.findOne({
      _id: req.params.fileId,
      userID: req.user.id,
      deletedAt: { $ne: null }
    });

    if (!file) {
      return res.json({ success: false, message: "Trash file not found" });
    }

    await promoteVersion(file);
    await writeAuditLog({ req, userId: req.user.id, action: "vault_restore", status: "success", targetType: "file", targetId: String(file._id) });
    return res.json({ success: true, message: "File restored from trash", file: mapVaultFile(file) });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const purgeTrashFile = async (req, res) => {
  try {
    const file = await fileModel.findOne({
      _id: req.params.fileId,
      userID: req.user.id
    });

    if (!file) {
      return res.json({ success: false, message: "File not found" });
    }

    await permanentlyDeleteFile(file);
    await writeAuditLog({ req, userId: req.user.id, action: "vault_purge", status: "success", targetType: "file", targetId: String(req.params.fileId) });
    return res.json({ success: true, message: "File permanently deleted" });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};
