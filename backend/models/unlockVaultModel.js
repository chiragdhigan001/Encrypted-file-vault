import mongoose from "mongoose";

const unlockVaultSchema = new mongoose.Schema({
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user', 
        required: true,
        unique: true
    },
    vaultPassword: {
        type: String,
        default: ""
    },
    authVerifier: {
        type: String,
        default: ""
    },
    kdfSalt: {
        type: String,
        default: ""
    },
    kdfIterations: {
        type: Number,
        default: 210000
    },
    scheme: {
        type: String,
        enum: ["legacy-bcrypt", "zk-v1"],
        default: "legacy-bcrypt"
    }
}, { timestamps: true });

const unlockVaultModel = mongoose.model("unlockVault", unlockVaultSchema);

export default unlockVaultModel;
