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
    folder: {
        type: String,
        default: 'General'
    },
    isEncrypted: {
        type: Boolean,
        default: true
    },
    uploadAt: {
        type: Date,
        default: Date.now
    }
})

const fileModel = mongoose.model('file', fileSchema)
export default fileModel