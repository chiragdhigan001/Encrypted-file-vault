import bcrypt from "bcryptjs";
import unlockVaultModel from "../models/unlockVaultModel.js";
import fileModel from "../models/filemodel.js";
import fs from 'fs'


//----------Password logic------------

// @route   POST /api/vault/set-password
export const setVaultPassword = async (req, res) => {
    // userId is attached to req.body by the userAuth middleware
    const { userId, vaultPassword } = req.body; 

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
    const { userId, vaultPassword } = req.body;

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
        const { userId, folder } = req.body;
        const file = req.file;

        if (!file) {
            return res.json({ success: false, message: "No file uploaded" });
        }

        const newfile = new fileModel({
            userId,
            name: file.originalname,
            path: file.path,
            size: (file.size / 1024 / 1024).toFixed(2) + "MB",
            type: file.mimetype,
            folder: folder || 'General',
            isEncrypted: true
        })

        await newfile.save()
        res.json({ success: true, message: 'File encrypted and saved to the vault'})
    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

//@route Delete /api/vault/delete/:fileId
//@desc Delete file metadata from DB and actual ile fro server disk
export const deleteFiles = async (req, res) => {
    try {
        const { fileId } = req.params;
        const { userID } = req.body
        
        const file = await fileModel.findOne({ _id: fileId, userID })

        if(!file) {
            return res.json({ success: false, message: 'File not found' })
        }

        // Delete from physical storage
        if(fs.existsSync(file.path)) {
            fs.unlink(file.path)
        }

        // Delete from Database
        await fileModel.findByIdAndDelete(fileId)
        res.json({ success: true, message: 'File deleted successfully' })
    } catch (error) {
        
    }
}