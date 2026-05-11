import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    password: {
        type: String,
        required: true
    },
    role: {
        type: String,
        enum: ["user", "admin", "auditor", "team_owner"],
        default: "user"
    },
    googleId: {
        type: String,
        default: ""
    },
    isMfaEnabled: {
        type: Boolean,
        default: false
    },
    mfaSecret: {
        type: String,
        default: ""
    },
    mfaTempSecret: {
        type: String,
        default: ""
    },
    recoveryCodes: {
        type: [String],
        default: []
    },
    verifyOTP: {
        type: String,
        default:""
    },
    verifyOTPExpiryAt: {
        type: Number,
        default: 0
    },
    isAccountVerified: {
        type: Boolean,
        default: false
    },
    resetOTP: {
        type: Number,
        default: 0
    },
    resetPasswordOTP: {
        type: String,
        default: ""
    },
    resetPasswordOTPExpiryAt: {
        type: Number,
        default: 0
    },
    resetPasswordOTPVerifiedAt: {
        type: Number,
        default: 0
    },
    lastLoginAt: {
        type: Date,
        default: null
    }
    
});

const userModel = mongoose.model("user", userSchema);

export default userModel;
