import mongoose from 'mongoose'

const fileSchema = new mongoose.Schema({
    userID: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
    },
    name: {
        type: String,
        required: true
    },
    path: {
        type: String,
        required: true
    },
    size: {
        type: String,
        required: true
    },
    type: {
        type: String,
        required: true
    },
    sizeBytes: {
        type: Number,
        default: 0
    },
    folder: {
        type: String,
        default: 'General'
    },
    versionGroupId: {
        type: mongoose.Schema.Types.ObjectId,
        default: null,
        index: true
    },
    versionNumber: {
        type: Number,
        default: 1
    },
    isCurrentVersion: {
        type: Boolean,
        default: true
    },
    previousVersionId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'file',
        default: null
    },
    isEncrypted: {
        type: Boolean,
        default: true
    },
    encryptionVersion: {
        type: String,
        default: 'legacy-cryptojs'
    },
    encryptedDek: {
        type: String,
        default: ''
    },
    fileIv: {
        type: String,
        default: ''
    },
    wrapIv: {
        type: String,
        default: ''
    },
    integrityHash: {
        type: String,
        default: ''
    },
    legacyEncryption: {
        type: Boolean,
        default: true
    },
    aiCategory: {
        type: String,
        default: ""
    },
    aiTags: {
        type: [String],
        default: []
    },
    aiSensitiveFindings: {
        type: [String],
        default: []
    },
    aiSummary: {
        type: String,
        default: ""
    },
    extractedTextPreview: {
        type: String,
        default: ""
    },
    deletedAt: {
        type: Date,
        default: null,
        index: true
    },
    deletedByUserId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        default: null
    },
    retentionExpiresAt: {
        type: Date,
        default: null
    },
    uploadAt: {
        type: Date,
        default: Date.now
    }
})

const fileModel = mongoose.model('file', fileSchema)
export default fileModel
