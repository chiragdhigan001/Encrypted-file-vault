import { FileText, Image, Archive, File, Download, Trash2, Eye, Shield, Users as UsersIcon, Share2 } from 'lucide-react';
import './fileList.css';

export default function FileList({ files, viewMode, onShare, isSharedView }) {
  const getFileIcon = (type) => {
    switch (type) {
      case 'pdf':
      case 'text': return FileText;
      case 'image': return Image;
      case 'archive': return Archive;
      default: return File;
    }
  };

  const getFileColorClass = (type) => {
    return `icon-${type || 'default'}`;
  };

  if (files.length === 0) {
    return (
      <div className="empty-state">
        <File className="empty-icon" />
        <p>No files found</p>
      </div>
    );
  }

  if (viewMode === 'grid') {
    return (
      <div className="file-grid">
        {files.map((file) => {
          const Icon = getFileIcon(file.type);
          return (
            <div key={file.id} className="grid-item group">
              <div className="grid-header">
                <div className={`icon-container ${getFileColorClass(file.type)}`}>
                  <Icon className="w-6 h-6" />
                </div>
                {file.encrypted && (
                  <div className="shield-badge">
                    <Shield className="w-3.5 h-3.5" />
                  </div>
                )}
              </div>
              
              <h3 className="file-name" title={file.name}>{file.name}</h3>
              <p className="file-meta">
                {file.size} • {file.uploadedAt.toLocaleDateString()}
              </p>

              {file.sharedBy && (
                <p className="shared-by-label">
                  <UsersIcon className="w-3 h-3" />
                  Shared by {file.sharedBy.userName}
                </p>
              )}

              <div className="grid-actions">
                <button className="btn-view">
                  <Eye className="w-3 h-3" /> View
                </button>
                {!isSharedView && (
                  <button onClick={() => onShare(file.id)} className="btn-icon">
                    <Share2 className="w-3.5 h-3.5" />
                  </button>
                )}
                <button className="btn-icon"><Download className="w-3.5 h-3.5" /></button>
                <button className="btn-icon btn-delete"><Trash2 className="w-3.5 h-3.5" /></button>
              </div>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <div className="list-view-container">
      <div className="table-wrapper">
        <table className="file-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Folder</th>
              <th>Size</th>
              <th>Uploaded</th>
              <th>Status</th>
              {isSharedView ? <th>Shared By</th> : <th>Shared</th>}
              <th className="text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {files.map((file) => {
              const Icon = getFileIcon(file.type);
              return (
                <tr key={file.id} className="table-row group">
                  <td>
                    <div className="name-cell">
                      <div className={getFileColorClass(file.type)}>
                        <Icon className="w-5 h-5" />
                      </div>
                      <span>{file.name}</span>
                    </div>
                  </td>
                  <td><span className="meta-text">{file.folder}</span></td>
                  <td><span className="meta-text">{file.size}</span></td>
                  <td><span className="meta-text">{file.uploadedAt.toLocaleDateString()}</span></td>
                  <td>
                    {file.encrypted && (
                      <div className="status-encrypted">
                        <Shield className="w-4 h-4" />
                        <span>Encrypted</span>
                      </div>
                    )}
                  </td>
                  <td>
                    {isSharedView ? (
                      <div className="shared-info">
                        <UsersIcon className="w-4 h-4" />
                        <span>{file.sharedBy?.userName}</span>
                      </div>
                    ) : (
                      <div className="shared-info">
                        {file.sharedWith?.length > 0 ? (
                          <><UsersIcon className="w-4 h-4" /><span>{file.sharedWith.length} user(s)</span></>
                        ) : <span className="not-shared">Not shared</span>}
                      </div>
                    )}
                  </td>
                  <td>
                    <div className="row-actions">
                      <button className="action-btn"><Eye className="w-4 h-4" /></button>
                      {!isSharedView && (
                        <button onClick={() => onShare(file.id)} className="action-btn share"><Share2 className="w-4 h-4" /></button>
                      )}
                      <button className="action-btn"><Download className="w-4 h-4" /></button>
                      <button className="action-btn delete"><Trash2 className="w-4 h-4" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}