import { useState, useContext } from 'react'; 
import { X, Upload, FolderOpen, Shield, CheckCircle, Loader2 } from 'lucide-react';
import axios from 'axios';
import { toast } from 'react-toastify';
import { AppContext } from "../context/AppContext"; 
import './uploadModal.css';
import { encryptFileForVault } from './vaultCrypto';
import { analyzeFileWithLocalAi } from './aiAssist';

function UploadModal({ onClose, onUpload }) {
    const [file, setFile] = useState(null); 
    const [fileName, setFileName] = useState('');
    const [fileSize, setFileSize] = useState('');
    const [selectedFolder, setSelectedFolder] = useState('Documents');
    const [dragActive, setDragActive] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [progress, setProgress] = useState(0);

    const { backendUrl, vaultSession } = useContext(AppContext);

    const folders = ['Documents', 'Personal', 'Security', 'Work', 'Other'];

    const handleDrag = (e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            const selectedFile = e.dataTransfer.files[0];
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setFileSize((selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB');
        }
    };

    const handleFileInput = (e) => {
        if (e.target.files && e.target.files[0]) {
            const selectedFile = e.target.files[0];
            setFile(selectedFile);
            setFileName(selectedFile.name);
            setFileSize((selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB');
        }
    };

    // --- ENCRYPTION & UPLOAD LOGIC ---
    const handleUpload = async () => {
        if (!file || !vaultSession?.vaultKey) {
            toast.error("Encryption key missing. Please unlock the vault again.");
            return;
        }

        setUploading(true);
        setProgress(10);

        try {
            setProgress(30);
            const { encryptedBlob, metadata } = await encryptFileForVault(file, vaultSession.vaultKey);
            const aiInsight = await analyzeFileWithLocalAi(file);

            setProgress(70);
            const formData = new FormData();
            formData.append('file', encryptedBlob, `${file.name}.vault`);
            formData.append('folder', selectedFolder);
            formData.append('size', fileSize);
            formData.append('sizeBytes', String(metadata.sizeBytes));
            formData.append('originalType', metadata.originalType);
            formData.append('originalName', metadata.originalName);
            formData.append('encryptionVersion', metadata.encryptionVersion);
            formData.append('encryptedDek', metadata.encryptedDek);
            formData.append('fileIv', metadata.fileIv);
            formData.append('wrapIv', metadata.wrapIv);
            formData.append('integrityHash', metadata.integrityHash);
            formData.append('aiCategory', aiInsight.aiCategory);
            formData.append('aiTags', JSON.stringify(aiInsight.aiTags || []));
            formData.append('aiSensitiveFindings', JSON.stringify(aiInsight.aiSensitiveFindings || []));
            formData.append('aiSummary', aiInsight.aiSummary || '');
            formData.append('extractedTextPreview', aiInsight.extractedTextPreview || '');

            setProgress(85);
            axios.defaults.withCredentials = true;
            const { data } = await axios.post(`${backendUrl}/api/vault/upload`, formData);

            if (data.success) {
                setProgress(100);
                toast.success('File secured and uploaded!')
                onUpload(data.file ?? {
                    id: Date.now().toString(),
                    name: file.name,
                    size: fileSize,
                    sizeBytes: file.size,
                    type: file.type || 'application/octet-stream',
                    folder: selectedFolder,
                    encrypted: true,
                    uploadedAt: new Date().toISOString(),
                    encryptionVersion: metadata.encryptionVersion,
                    encryptedDek: metadata.encryptedDek,
                    fileIv: metadata.fileIv,
                    wrapIv: metadata.wrapIv,
                    integrityHash: metadata.integrityHash,
                    aiCategory: aiInsight.aiCategory,
                    aiTags: aiInsight.aiTags,
                    aiSensitiveFindings: aiInsight.aiSensitiveFindings,
                    aiSummary: aiInsight.aiSummary,
                    extractedTextPreview: aiInsight.extractedTextPreview
                }); 
            } else {
                toast.error(data.message);
            }
        } catch (error) {
            toast.error('Encryption or Upload failed');
            console.error(error);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div className="modal-overlay">
            <div className="modal-content">
                {/* Header */}
                <div className="modal-header">
                    <h2 className="modal-title">Upload File</h2>
                    <button onClick={onClose} className="close-btn" disabled={uploading}>
                        <X size={20} />
                    </button>
                </div>

                {/* Body */}
                <div className="modal-body">
                    {/* Dropzone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        className={`dropzone ${dragActive ? 'active' : ''} ${file ? 'has-file' : ''}`}
                    >
                        <Upload className={`upload-icon ${dragActive ? 'highlight' : ''}`} />
                        <p className="primary-text">
                            {file ? "File selected" : "Drag and drop your file here"}
                        </p>
                        <p className="secondary-text">or</p>
                        <label className="browse-label">
                            Browse Files
                            <input type="file" onChange={handleFileInput} className="hidden-input" disabled={uploading} />
                        </label>
                    </div>

                    {/* File Preview */}
                    {fileName && (
                        <div className="file-preview">
                            <div className="preview-info">
                                <CheckCircle size={20} className="success-icon" />
                                <span>{fileName}</span>
                            </div>
                            <p className="preview-size">{fileSize}</p>
                        </div>
                    )}

                    {/* Folder Select */}
                    <div className="form-group">
                        <label className="input-label">Destination Folder</label>
                        <div className="input-relative">
                            <FolderOpen className="inner-icon" />
                            <select
                                value={selectedFolder}
                                onChange={(e) => setSelectedFolder(e.target.value)}
                                className="modal-select"
                                disabled={uploading}
                            >
                                {folders.map((folder) => (
                                    <option key={folder} value={folder}>{folder}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    {/* Encryption Badge */}
                    <div className="encryption-badge">
                        <Shield size={20} className="shield-icon" />
                        <div>
                            <p className="badge-title">End-to-End Encryption</p>
                            <p className="badge-text">AES-256 bits local encryption active</p>
                        </div>
                    </div>

                    {/* Progress Bar */}
                    {uploading && (
                        <div className="progress-container">
                            <div className="progress-labels">
                                <span>{progress < 50 ? 'Encrypting...' : 'Uploading...'}</span>
                                <span className="progress-percent">{progress}%</span>
                            </div>
                            <div className="progress-track">
                                <div className="progress-fill" style={{ width: `${progress}%` }}></div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="modal-footer">
                    <button onClick={onClose} className="btn-cancel" disabled={uploading}>
                        Cancel
                    </button>
                    <button
                        onClick={handleUpload}
                        disabled={!fileName || uploading}
                        className="btn-upload"
                    >
                        {uploading ? (
                            <><Loader2 className="animate-spin" size={18} /> Working...</>
                        ) : (
                            'Upload & Encrypt'
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
}

export default UploadModal;
