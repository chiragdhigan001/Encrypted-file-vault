import bcrypt from "bcryptjs";
import unlockVaultModel from "../models/unlockVaultModel.js";
import fileModel from "../models/filemodel.js";
import fs from "fs";
import path from "path";


//----------Password logic------------

// @route   POST /api/vault/set-password
export const setVaultPassword = async (req, res) => {
    const userId = req.user.id;
    const { vaultPassword } = req.body; 

    if (!vaultPassword || vaultPassword.length < 8) {
        return res.json({ success: false, message: "Password must be at least 8 characters" });
    }

    try {
        const hashedVaultPassword = await bcrypt.hash(vaultPassword, 12);

        // This ensures one user only ever has ONE vault record
        await unlockVaultModel.findOneAndUpdate(
            { userId },
            { vaultPassword: hashedVaultPassword },
            { upsert: true, new: true }
        );

        return res.json({ success: true, message: "Vault Password Set Successfully" });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// @route   POST /api/vault/unlock
export const passwordUnlockVault = async (req, res) => {
    const userId = req.user.id;
    const { vaultPassword } = req.body;

    if (!vaultPassword) {
        return res.json({ success: false, message: "Please enter your password" });
    }

    try {
        const vault = await unlockVaultModel.findOne({ userId });

        if (!vault) {
            return res.json({ 
                success: false, 
                message: "Vault not initialized. Please set a password first." 
            });
        }

        // Compare provided text with the hash in DB
        const isMatch = await bcrypt.compare(vaultPassword, vault.vaultPassword);

        if (isMatch) {
            return res.json({ success: true, message: "Vault Unlocked" });
        } else {
            return res.json({ success: false, message: "Invalid Vault Password" });
        }

    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

// @route POST  /api/vault/upload
// @desc upload an encrypted file blob handled by multer
export const uploadFile = async (req, res) => {
    try {
        const userId = req.user.id;
        const { folder, size, originalType } = req.body;
        const file = req.file;

        if (!file) {
            return res.json({ success: false, message: "No file uploaded" });
        }

        const newfile = new fileModel({
            userID: userId,
            name: file.originalname,
            path: file.path,
            size: size || (file.size / 1024 / 1024).toFixed(2) + " MB",
            type: originalType || file.mimetype,
            folder: folder || 'General',
            isEncrypted: true
        })

        const savedFile = await newfile.save()
        res.json({
            success: true,
            message: 'File encrypted and saved to the vault',
            file: {
                id: savedFile._id,
                name: savedFile.name,
                size: savedFile.size,
                type: savedFile.type,
                folder: savedFile.folder,
                encrypted: savedFile.isEncrypted,
                uploadedAt: savedFile.uploadAt
            }
        })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

//@route GET /api/vault/files
//@desc Fetch all files stored in the authenticated user's vault
export const getVaultFiles = async (req, res) => {
    try {
        const userId = req.user.id;

        const files = await fileModel
            .find({ userID: userId })
            .sort({ uploadAt: -1 });

        const mappedFiles = files.map((file) => ({
            id: file._id,
            name: file.name,
            size: file.size,
            type: file.type,
            folder: file.folder,
            encrypted: file.isEncrypted,
            uploadedAt: file.uploadAt
        }));

        return res.json({ success: true, files: mappedFiles });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

//@route GET /api/vault/file/:fileId/download
//@desc Return the encrypted file contents for client-side decryption
export const downloadEncryptedFile = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userID = req.user.id;

        const file = await fileModel.findOne({ _id: fileId, userID });

        if (!file) {
            return res.status(404).json({ success: false, message: "File not found" });
        }

        if (!fs.existsSync(file.path)) {
            return res.status(404).json({ success: false, message: "Stored file is missing from disk" });
        }

        const safeName = path.basename(file.name).replace(/"/g, "");
        res.setHeader("Content-Type", "text/plain; charset=utf-8");
        res.setHeader("X-Original-File-Name", encodeURIComponent(safeName));
        res.setHeader("X-Original-File-Type", file.type);
        res.setHeader("Content-Disposition", `attachment; filename="${safeName}.enc"`);

        return fs.createReadStream(file.path).pipe(res);
    } catch (error) {
        return res.status(500).json({ success: false, message: error.message });
    }
};

//@route Delete /api/vault/delete/:fileId
//@desc Delete file metadata from DB and actual ile fro server disk
export const deleteFiles = async (req, res) => {
    try {
        const { fileId } = req.params;
        const userID = req.user.id
        
        const file = await fileModel.findOne({ _id: fileId, userID })

        if(!file) {
            return res.json({ success: false, message: 'File not found' })
        }

        // Delete from physical storage
        if(fs.existsSync(file.path)) {
            fs.unlinkSync(file.path)
        }

        // Delete from Database
        await fileModel.findByIdAndDelete(fileId)
        res.json({ success: true, message: 'File deleted successfully' })
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}
