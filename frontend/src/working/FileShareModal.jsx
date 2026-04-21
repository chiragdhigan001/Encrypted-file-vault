import { useEffect, useState } from "react";
import axios from "axios";
import {
  Globe2,
  KeyRound,
  Loader2,
  Search,
  Share2,
  Shield,
  Users,
  UserPlus,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import {
  createRandomShareKey,
  decryptCipherTextToBlob,
  encryptBlobWithKey
} from "./shareCrypto";
import "./fileShareModal.css";

export default function FileShareModal({ file, backendUrl, masterKey, onClose, onShared }) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [groups, setGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState("");
  const [shareScope, setShareScope] = useState("direct");
  const [permission, setPermission] = useState("view");
  const [usePassword, setUsePassword] = useState(false);
  const [sharePassword, setSharePassword] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const loadGroups = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/share/groups`);
        if (data.success) {
          setGroups(data.groups || []);
        }
      } catch (error) {
        // keep modal usable for direct shares even if groups fail
      }
    };

    loadGroups();
  }, [backendUrl]);

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (shareScope !== "direct" || query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/user/search`, {
          params: { query: query.trim() }
        });

        if (data.success) {
          const takenIds = new Set(selectedUsers.map((user) => user._id));
          setResults((data.users || []).filter((user) => !takenIds.has(user._id)));
        }
      } catch (error) {
        toast.error("User search failed.");
      } finally {
        setLoadingUsers(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [backendUrl, query, selectedUsers, shareScope]);

  const addUser = (user) => {
    setSelectedUsers((current) => [...current, user]);
    setQuery("");
    setResults([]);
  };

  const removeUser = (userId) => {
    setSelectedUsers((current) => current.filter((user) => user._id !== userId));
  };

  const validateSelection = () => {
    if (shareScope === "direct" && selectedUsers.length === 0) {
      toast.error("Choose at least one username to share with.");
      return false;
    }

    if (shareScope === "group" && !selectedGroupId) {
      toast.error("Choose a group before sharing.");
      return false;
    }

    if (usePassword && sharePassword.trim().length < 4) {
      toast.error("Set a share password with at least 4 characters.");
      return false;
    }

    return true;
  };

  const handleShare = async () => {
    if (!masterKey) {
      toast.error("Unlock the vault again before sharing files.");
      return;
    }

    if (!validateSelection()) return;

    setSaving(true);

    try {
      const { data: cipherText } = await axios.get(`${backendUrl}/api/vault/file/${file.id}/download`, {
        responseType: "text"
      });

      const originalBlob = decryptCipherTextToBlob(cipherText, masterKey, file.type);
      const shareKey = usePassword ? sharePassword.trim() : createRandomShareKey();
      const sharedCipherText = await encryptBlobWithKey(originalBlob, shareKey);

      const formData = new FormData();
      formData.append("shareFile", new Blob([sharedCipherText], { type: "text/plain" }), `${file.name}.share`);
      formData.append("permission", permission);
      formData.append("requiresPassword", String(usePassword));
      formData.append("systemAccessKey", usePassword ? "" : shareKey);
      formData.append("shareScope", shareScope);
      formData.append("recipients", JSON.stringify(selectedUsers.map((user) => user._id)));
      formData.append("groupId", selectedGroupId);

      const response = await axios.post(`${backendUrl}/api/share/file/${file.id}`, formData);

      if (response.data.success) {
        toast.success(
          shareScope === "public"
            ? "File shared publicly."
            : shareScope === "group"
              ? "File shared with group."
              : "File shared successfully."
        );
        onShared?.();
        onClose();
      } else {
        toast.error(response.data.message || "Unable to share the file.");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to create the shared copy.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="file-share-overlay" onClick={onClose}>
      <div className="file-share-card" onClick={(event) => event.stopPropagation()}>
        <div className="file-share-header">
          <div>
            <p className="file-share-eyebrow">Share Encrypted File</p>
            <h3>{file.name}</h3>
            <span>Share directly, publicly, or into a manual group without touching the original vault file.</span>
          </div>
          <button className="file-share-icon-btn" onClick={onClose} aria-label="Close share dialog">
            <X size={18} />
          </button>
        </div>

        <div className="file-share-body">
          <div className="scope-grid">
            <button className={`scope-card ${shareScope === "direct" ? "active" : ""}`} onClick={() => setShareScope("direct")}>
              <UserPlus size={18} />
              <div>
                <strong>Direct</strong>
                <span>Pick users by username</span>
              </div>
            </button>
            <button className={`scope-card ${shareScope === "public" ? "active" : ""}`} onClick={() => setShareScope("public")}>
              <Globe2 size={18} />
              <div>
                <strong>Public</strong>
                <span>Visible to every user</span>
              </div>
            </button>
            <button className={`scope-card ${shareScope === "group" ? "active" : ""}`} onClick={() => setShareScope("group")}>
              <Users size={18} />
              <div>
                <strong>Group</strong>
                <span>Share into one of your groups</span>
              </div>
            </button>
          </div>

          {shareScope === "direct" && (
            <>
              <div className="file-share-section">
                <label>Find user by username</label>
                <div className="file-share-search">
                  <Search size={16} />
                  <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name" />
                  {loadingUsers && <Loader2 size={16} className="spin" />}
                </div>

                {results.length > 0 && (
                  <div className="file-share-results">
                    {results.map((user) => (
                      <button key={user._id} className="file-share-result" onClick={() => addUser(user)}>
                        <div>
                          <strong>{user.name}</strong>
                          <span>{user.email}</span>
                        </div>
                        <span className="file-share-add-pill">
                          <UserPlus size={14} />
                          Add
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="file-share-section">
                <label>Selected recipients</label>
                <div className="selected-users">
                  {selectedUsers.length === 0 && <p className="empty-note">No users selected yet.</p>}
                  {selectedUsers.map((user) => (
                    <div key={user._id} className="selected-user-chip">
                      <div>
                        <strong>{user.name}</strong>
                        <span>{user.email}</span>
                      </div>
                      <button onClick={() => removeUser(user._id)} aria-label={`Remove ${user.name}`}>
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </>
          )}

          {shareScope === "group" && (
            <div className="file-share-section">
              <label>Choose group</label>
              <select value={selectedGroupId} onChange={(event) => setSelectedGroupId(event.target.value)}>
                <option value="">Select a group</option>
                {groups.map((group) => (
                  <option key={group.id} value={group.id}>{group.name}</option>
                ))}
              </select>
            </div>
          )}

          <div className="file-share-grid">
            <div className="file-share-section">
              <label>Access permission</label>
              <select value={permission} onChange={(event) => setPermission(event.target.value)}>
                <option value="view">View only</option>
                <option value="download">View and download</option>
              </select>
            </div>

            <div className="file-share-section">
              <label>Share password</label>
              <button type="button" className={`toggle-password-btn ${usePassword ? "active" : ""}`} onClick={() => setUsePassword((value) => !value)}>
                <KeyRound size={16} />
                {usePassword ? "Password required" : "Optional password off"}
              </button>
            </div>
          </div>

          {usePassword && (
            <div className="file-share-section">
              <label>Separate share password</label>
              <input type="password" value={sharePassword} onChange={(event) => setSharePassword(event.target.value)} placeholder="This is different from the vault unlock password" />
            </div>
          )}

          <div className="file-share-note">
            <Shield size={18} />
            <p>Every share creates a separate encrypted share copy. Public and group shares can still be protected with a share password.</p>
          </div>
        </div>

        <div className="file-share-footer">
          <button className="secondary-action" onClick={onClose} disabled={saving}>Cancel</button>
          <button className="primary-action" onClick={handleShare} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Share2 size={16} />}
            Share File
          </button>
        </div>
      </div>
    </div>
  );
}
