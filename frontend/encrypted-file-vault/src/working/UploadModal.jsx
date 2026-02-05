import { useState } from 'react';
import { X, Upload, FolderOpen, Shield, CheckCircle } from 'lucide-react';
import './uploadModal.css';

 function UploadModal({ onClose, onUpload }) {
  const [fileName, setFileName] = useState('');
  const [fileSize, setFileSize] = useState('');
  const [selectedFolder, setSelectedFolder] = useState('Documents');
  const [dragActive, setDragActive] = useState(false);
  const [uploading, setUploading] = useState(false);

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
      const file = e.dataTransfer.files[0];
      setFileName(file.name);
      setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setFileName(file.name);
      setFileSize((file.size / (1024 * 1024)).toFixed(2) + ' MB');
    }
  };

  const handleUpload = () => {
    if (!fileName) return;
    setUploading(true);
    
    setTimeout(() => {
      const fileExtension = fileName.split('.').pop()?.toLowerCase() || '';
      let fileType = 'text';
      if (['pdf'].includes(fileExtension)) fileType = 'pdf';
      if (['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) fileType = 'image';
      if (['zip', 'rar', '7z'].includes(fileExtension)) fileType = 'archive';

      const newFile = {
        id: Date.now().toString(),
        name: fileName,
        size: fileSize,
        type: fileType,
        folder: selectedFolder,
        uploadedAt: new Date(),
        encrypted: true,
      };

      onUpload(newFile);
    }, 2000);
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        {/* Header */}
        <div className="modal-header">
          <h2 className="modal-title">Upload File</h2>
          <button onClick={onClose} className="close-btn">
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
            className={`dropzone ${dragActive ? 'active' : ''}`}
          >
            <Upload className={`upload-icon ${dragActive ? 'highlight' : ''}`} />
            <p className="primary-text">Drag and drop your file here</p>
            <p className="secondary-text">or</p>
            <label className="browse-label">
              Browse Files
              <input type="file" onChange={handleFileInput} className="hidden-input" />
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
              <p className="badge-title">Automatic Encryption</p>
              <p className="badge-text">Your file will be encrypted with AES-256 before storage</p>
            </div>
          </div>

          {/* Progress Bar */}
          {uploading && (
            <div className="progress-container">
              <div className="progress-labels">
                <span>Encrypting and uploading...</span>
                <span className="progress-percent">75%</span>
              </div>
              <div className="progress-track">
                <div className="progress-fill" style={{ width: '75%' }}></div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button onClick={onClose} className="btn-cancel">Cancel</button>
          <button 
            onClick={handleUpload} 
            disabled={!fileName || uploading} 
            className="btn-upload"
          >
            {uploading ? 'Uploading...' : 'Upload & Encrypt'}
          </button>
        </div>
      </div>
    </div>
  );
}
 export default UploadModal;