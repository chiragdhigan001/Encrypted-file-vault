import mongoose from "mongoose";

const unlockVaultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', // Ensure this matches your User model name
        required: true,
        unique: true
    },
    vaultPassword: {
        type: String,
        required: true
    }
});

const unlockVaultModel = mongoose.model("unlockVault", unlockVaultSchema);

export default unlockVaultModel;