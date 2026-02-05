import { useState, useEffect } from "react";
import { X, Search, Trash2, Shield, Eye, Download, UserPlus } from "lucide-react";
import axios from "axios";
import "./shareModal.css";

export default function ShareModal({ file, onClose, onShare, backendUrl }) {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [sharedUsers, setSharedUsers] = useState(file.sharedWith || []);
  const [loading, setLoading] = useState(false);

  // Search users from Database by Email/ID
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchQuery.length > 2) {
        setLoading(true);
        try {
          const { data } = await axios.get(`${backendUrl}/api/user/search?query=${searchQuery}`);
          // Filter out people already added
          const available = data.users.filter(u => !sharedUsers.some(s => s.userId === u._id));
          setSearchResults(available);
        } catch (err) {
          console.error("User search failed", err);
        } finally {
          setLoading(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500); // Debounce to save API calls

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery, sharedUsers]);

  const addUser = (user, permission) => {
    setSharedUsers([...sharedUsers, { userId: user._id, userName: user.name, email: user.email, permission }]);
    setSearchQuery("");
  };

  return (
    <div className="share-modal-overlay">
      <div className="share-modal-card">
        <div className="share-modal-header">
          <div>
            <h2 className="header-title">Share "{file.name}"</h2>
            <p className="header-subtitle">Secure encrypted sharing</p>
          </div>
          <button onClick={onClose} className="close-icon-btn"><X size={20} /></button>
        </div>

        <div className="share-modal-content">
          <div className="search-section">
            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Enter user email..."
                className="share-search-input"
              />
            </div>

            {/* Real-time Results */}
            {searchResults.length > 0 && (
              <div className="search-results-dropdown">
                {searchResults.map(user => (
                  <div key={user._id} className="search-result-item">
                    <div className="user-info">
                      <p className="user-name">{user.name}</p>
                      <p className="user-email">{user.email}</p>
                    </div>
                    <button onClick={() => addUser(user, "view")} className="btn-add">
                      <UserPlus size={14} /> Add
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="shared-list-section">
            <label className="section-label">People with access</label>
            <div className="shared-users-stack">
              {sharedUsers.map((share) => (
                <div key={share.userId} className="shared-user-item">
                  <span>{share.userName} ({share.email})</span>
                  <div className="permission-controls">
                    <select 
                      value={share.permission} 
                      onChange={(e) => updatePermission(share.userId, e.target.value)}
                    >
                      <option value="view">View</option>
                      <option value="download">Download</option>
                    </select>
                    <button onClick={() => setSharedUsers(prev => prev.filter(u => u.userId !== share.userId))}>
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="share-modal-footer">
          <button onClick={onClose} className="footer-btn-cancel">Cancel</button>
          <button onClick={() => { onShare(file.id, sharedUsers); onClose(); }} className="footer-btn-save">
            Save Permissions
          </button>
        </div>
      </div>
    </div>
  );
}