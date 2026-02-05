import { useState } from "react";
import { X, Search, Trash2, Shield, Eye, Download } from "lucide-react";
import "./shareModal.css";

const availableUsers = [
  { id: "2", name: "Sarah Johnson", email: "sarah.j@example.com", avatar: "SJ" },
  { id: "3", name: "Mike Chen", email: "mike.chen@example.com", avatar: "MC" },
  { id: "4", name: "Emily Rodriguez", email: "emily.r@example.com", avatar: "ER" },
  { id: "5", name: "James Wilson", email: "james.w@example.com", avatar: "JW" },
  { id: "6", name: "Lisa Anderson", email: "lisa.a@example.com", avatar: "LA" }
];

export default function ShareModal({
  file = {},
  onClose = () => {},
  onShare = () => {}
}) {

  const [searchQuery, setSearchQuery] = useState("");
  const [sharedUsers, setSharedUsers] = useState(file.sharedWith || []);

  // ---------------- FILTER USERS ----------------

  const filteredUsers = availableUsers.filter((user) => {
    const matchesSearch =
      user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      user.email.toLowerCase().includes(searchQuery.toLowerCase());

    const notAlreadyShared =
      !sharedUsers.some((s) => s.userId === user.id);

    return matchesSearch && notAlreadyShared;
  });

  // ---------------- ACTIONS ----------------

  const addUser = (user, permission) => {
    setSharedUsers((prev) => [
      ...prev,
      {
        userId: user.id,
        userName: user.name,
        permission
      }
    ]);
    setSearchQuery("");
  };

  const removeUser = (userId) => {
    setSharedUsers((prev) =>
      prev.filter((s) => s.userId !== userId)
    );
  };

  const updatePermission = (userId, permission) => {
    setSharedUsers((prev) =>
      prev.map((s) =>
        s.userId === userId ? { ...s, permission } : s
      )
    );
  };

  const handleSave = () => {
    onShare(file.id, sharedUsers);
    onClose();
  };

  // ---------------- UI ----------------

  return (
    <div className="share-modal-overlay">
      <div className="share-modal-card">

        {/* HEADER */}
        <div className="share-modal-header">
          <div>
            <h2 className="header-title">Share File</h2>
            <p className="header-subtitle">
              {file?.name || "Untitled file"}
            </p>
          </div>

          <button onClick={onClose} className="close-icon-btn">
            <X size={20} />
          </button>
        </div>

        {/* CONTENT */}
        <div className="share-modal-content">

          {/* Encryption Notice */}
          <div className="encryption-notice">
            <Shield size={18} />
            <div>
              <p className="notice-title">End-to-End Encrypted Sharing</p>
              <p className="notice-text">
                Files remain encrypted during transfer. Only users with access can decrypt.
              </p>
            </div>
          </div>

          {/* SEARCH */}
          <div className="search-section">
            <label className="section-label">Add People</label>

            <div className="search-input-wrapper">
              <Search size={16} />
              <input
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name or email..."
                className="share-search-input"
              />
            </div>

            {searchQuery && filteredUsers.length > 0 && (
              <div className="search-results-dropdown">
                {filteredUsers.map((user) => (
                  <div key={user.id} className="search-result-item">

                    <div className="user-info-group">
                      <div className="user-avatar">{user.avatar}</div>
                      <div>
                        <p className="user-name">{user.name}</p>
                        <p className="user-email">{user.email}</p>
                      </div>
                    </div>

                    <div className="action-buttons">
                      <button
                        onClick={() => addUser(user, "view")}
                        className="btn-view-only"
                      >
                        View Only
                      </button>

                      <button
                        onClick={() => addUser(user, "download")}
                        className="btn-can-download"
                      >
                        Can Download
                      </button>
                    </div>

                  </div>
                ))}
              </div>
            )}
          </div>

          {/* SHARED USERS */}
          {sharedUsers.length > 0 && (
            <div className="shared-list-section">

              <label className="section-label">
                People with access ({sharedUsers.length})
              </label>

              <div className="shared-users-stack">
                {sharedUsers.map((share) => {
                  const user = availableUsers.find(
                    (u) => u.id === share.userId
                  );
                  if (!user) return null;

                  return (
                    <div key={share.userId} className="shared-user-item">

                      <div className="user-info-group">
                        <div className="user-avatar">{user.avatar}</div>
                        <div>
                          <p className="user-name">{user.name}</p>
                          <p className="user-email">{user.email}</p>
                        </div>
                      </div>

                      <div className="permission-controls">

                        <select
                          value={share.permission}
                          onChange={(e) =>
                            updatePermission(
                              share.userId,
                              e.target.value
                            )
                          }
                          className="permission-select"
                        >
                          <option value="view">View Only</option>
                          <option value="download">Can Download</option>
                        </select>

                        <button
                          onClick={() => removeUser(share.userId)}
                          className="remove-user-btn"
                        >
                          <Trash2 size={16} />
                        </button>

                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* GUIDE */}
          <div className="permission-guide">
            <h3 className="guide-title">Permission Levels</h3>

            <div className="guide-stack">

              <div className="guide-item">
                <Eye size={18} />
                <div>
                  <p className="guide-label">View Only</p>
                  <p className="guide-desc">
                    Can view file details but cannot download
                  </p>
                </div>
              </div>

              <div className="guide-item">
                <Download size={18} />
                <div>
                  <p className="guide-label">Can Download</p>
                  <p className="guide-desc">
                    Can view and download the encrypted file
                  </p>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* FOOTER */}
        <div className="share-modal-footer">
          <button onClick={onClose} className="footer-btn-cancel">
            Cancel
          </button>

          <button onClick={handleSave} className="footer-btn-save">
            Save Changes
          </button>
        </div>

      </div>
    </div>
  );
}
