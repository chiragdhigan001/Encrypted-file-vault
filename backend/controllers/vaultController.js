import bcrypt from "bcryptjs";
import unlockVaultModel from "../models/unlockVaultModel.js";

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