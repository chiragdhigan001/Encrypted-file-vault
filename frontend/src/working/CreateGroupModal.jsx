import { useEffect, useState } from "react";
import axios from "axios";
import { Copy, Loader2, Search, UserPlus, Users, X } from "lucide-react";
import { toast } from "react-toastify";
import "./createGroupModal.css";

export default function CreateGroupModal({ backendUrl, onClose, onCreated }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState([]);
  const [members, setMembers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const [saving, setSaving] = useState(false);
  const [createdInviteLink, setCreatedInviteLink] = useState("");

  useEffect(() => {
    const timer = setTimeout(async () => {
      if (query.trim().length < 2) {
        setResults([]);
        return;
      }

      setLoadingUsers(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/user/search`, {
          params: { query: query.trim() }
        });

        if (data.success) {
          const takenIds = new Set(members.map((member) => member._id));
          setResults((data.users || []).filter((user) => !takenIds.has(user._id)));
        }
      } catch (error) {
        toast.error("Unable to search users.");
      } finally {
        setLoadingUsers(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [backendUrl, members, query]);

  const createGroup = async () => {
    if (!name.trim()) {
      toast.error("Group name is required.");
      return;
    }

    setSaving(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/share/groups`, {
        name,
        description,
        memberIds: members.map((member) => member._id)
      });

      if (data.success) {
        setCreatedInviteLink(data.group.inviteLink);
        toast.success("Group created successfully.");
        onCreated?.();
      } else {
        toast.error(data.message || "Unable to create group.");
      }
    } catch (error) {
      toast.error("Unable to create group.");
    } finally {
      setSaving(false);
    }
  };

  const copyInviteLink = async () => {
    if (!createdInviteLink) return;
    await navigator.clipboard.writeText(createdInviteLink);
    toast.success("Invite link copied.");
  };

  return (
    <div className="group-modal-overlay" onClick={onClose}>
      <div className="group-modal-card" onClick={(event) => event.stopPropagation()}>
        <div className="group-modal-header">
          <div>
            <p className="group-modal-eyebrow">Create Group</p>
            <h3>Build a manual group with invite link</h3>
          </div>
          <button onClick={onClose} aria-label="Close">
            <X size={18} />
          </button>
        </div>

        <div className="group-modal-body">
          <label>Group name</label>
          <input value={name} onChange={(event) => setName(event.target.value)} placeholder="Design Team, Family, Finance Circle..." />

          <label>Description</label>
          <textarea value={description} onChange={(event) => setDescription(event.target.value)} placeholder="Add a short description. The invite link will be appended automatically." rows={4} />

          <label>Add members</label>
          <div className="group-user-search">
            <Search size={16} />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search usernames" />
            {loadingUsers && <Loader2 size={16} className="spin" />}
          </div>

          {results.length > 0 && (
            <div className="group-user-results">
              {results.map((user) => (
                <button key={user._id} className="group-user-item" onClick={() => setMembers((current) => [...current, user])}>
                  <div>
                    <strong>{user.name}</strong>
                    <span>{user.email}</span>
                  </div>
                  <span><UserPlus size={14} /> Add</span>
                </button>
              ))}
            </div>
          )}

          <div className="group-member-list">
            {members.length === 0 ? (
              <div className="group-member-empty">
                <Users size={16} />
                <span>No extra members selected yet.</span>
              </div>
            ) : (
              members.map((member) => (
                <div key={member._id} className="group-member-chip">
                  <div>
                    <strong>{member.name}</strong>
                    <span>{member.email}</span>
                  </div>
                  <button onClick={() => setMembers((current) => current.filter((user) => user._id !== member._id))}>
                    <X size={14} />
                  </button>
                </div>
              ))
            )}
          </div>

          {createdInviteLink && (
            <div className="created-link-box">
              <p>Invite link</p>
              <code>{createdInviteLink}</code>
              <button onClick={copyInviteLink}>
                <Copy size={14} />
                Copy Link
              </button>
            </div>
          )}
        </div>

        <div className="group-modal-footer">
          <button className="secondary-action" onClick={onClose}>Close</button>
          <button className="primary-action" onClick={createGroup} disabled={saving}>
            {saving ? <Loader2 size={16} className="spin" /> : <Users size={16} />}
            Create Group
          </button>
        </div>
      </div>
    </div>
  );
}
