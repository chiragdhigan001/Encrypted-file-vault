import { useMemo, useState } from "react";
import axios from "axios";
import {
  Copy,
  Download,
  Eye,
  KeyRound,
  Loader2,
  MoreVertical,
  Plus,
  Shield,
  UserPlus,
  Users,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import ShareChatPanel from "./ShareChatPanel";
import CreateGroupModal from "./CreateGroupModal";
import { decryptCipherTextToBlob, getPreviewKind, openBlobDownload } from "./shareCrypto";
import "./groupWorkspacePanel.css";

export default function GroupWorkspacePanel({ backendUrl, groups, groupShares, refreshAll }) {
  const [activeGroupId, setActiveGroupId] = useState("");
  const [joinToken, setJoinToken] = useState("");
  const [busyShareId, setBusyShareId] = useState("");
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showGroupMenu, setShowGroupMenu] = useState(false);
  const [changingMemberId, setChangingMemberId] = useState("");
  const [previewState, setPreviewState] = useState({ isOpen: false, fileName: "", mimeType: "", content: "", url: "" });

  const activeGroup = useMemo(() => groups.find((group) => group.id === activeGroupId) || groups[0] || null, [groups, activeGroupId]);
  const currentGroupShares = useMemo(() => groupShares.filter((share) => share.group?.id === activeGroup?.id), [groupShares, activeGroup]);

  const closePreview = () => {
    setPreviewState((current) => {
      if (current.url) URL.revokeObjectURL(current.url);
      return { isOpen: false, fileName: "", mimeType: "", content: "", url: "" };
    });
  };

  const copyInviteLink = async (link) => {
    await navigator.clipboard.writeText(link);
    toast.success("Invite link copied.");
  };

  const joinGroup = async () => {
    if (!joinToken.trim()) {
      toast.error("Paste an invite token first.");
      return;
    }

    const normalizedToken = joinToken.trim().split("/").filter(Boolean).pop();

    try {
      const { data } = await axios.post(`${backendUrl}/api/share/groups/join/${normalizedToken}`);
      if (data.success) {
        toast.success("Joined group successfully.");
        setJoinToken("");
        refreshAll();
      } else {
        toast.error(data.message || "Unable to join group.");
      }
    } catch (error) {
      toast.error("Unable to join group.");
    }
  };

  const openGroupShare = async (share, mode) => {
    const accessKey = share.requiresPassword ? window.prompt(`Enter the share password for "${share.fileName}"`) : share.systemAccessKey;
    if (!accessKey) return;

    setBusyShareId(share.id);
    try {
      const { data } = await axios.get(`${backendUrl}/api/share/file/${share.id}/download`, { responseType: "text" });
      const blob = decryptCipherTextToBlob(data, accessKey, share.fileType);

      if (mode === "download") {
        openBlobDownload(blob, share.fileName);
        return;
      }

      const previewKind = getPreviewKind(share.fileType);
      if (previewKind === "binary") {
        openBlobDownload(blob, share.fileName);
        return;
      }

      if (previewKind === "text") {
        setPreviewState({ isOpen: true, fileName: share.fileName, mimeType: share.fileType, content: await blob.text(), url: "" });
        return;
      }

      setPreviewState({ isOpen: true, fileName: share.fileName, mimeType: share.fileType, content: "", url: URL.createObjectURL(blob) });
    } catch (error) {
      toast.error("Unable to open this group share.");
    } finally {
      setBusyShareId("");
    }
  };

  const handleGroupAction = async (action) => {
    if (!activeGroup) return;

    try {
      if (action === "delete") {
        const { data } = await axios.delete(`${backendUrl}/api/share/groups/${activeGroup.id}`);
        if (!data.success) {
          toast.error(data.message || "Unable to delete group.");
          return;
        }
        toast.success("Group deleted successfully.");
      } else {
        const { data } = await axios.post(`${backendUrl}/api/share/groups/${activeGroup.id}/leave`);
        if (!data.success) {
          toast.error(data.message || "Unable to leave group.");
          return;
        }
        toast.success("Left group successfully.");
      }

      setShowGroupMenu(false);
      setActiveGroupId("");
      refreshAll();
    } catch (error) {
      toast.error(action === "delete" ? "Unable to delete group." : "Unable to leave group.");
    }
  };

  const updateRole = async (memberId, role) => {
    if (!activeGroup) return;

    setChangingMemberId(memberId);
    try {
      const { data } = await axios.patch(`${backendUrl}/api/share/groups/${activeGroup.id}/members/${memberId}/role`, { role });
      if (data.success) {
        toast.success(`Member updated to ${role}.`);
        refreshAll();
      } else {
        toast.error(data.message || "Unable to update role.");
      }
    } catch (error) {
      toast.error("Unable to update role.");
    } finally {
      setChangingMemberId("");
    }
  };

  return (
    <>
      <section className="group-workspace">
        <div className="group-sidebar">
          <button className="create-group-btn" onClick={() => setShowCreateModal(true)}>
            <Plus size={16} />
            Create Group
          </button>

          <div className="join-group-box">
            <label>Join group by invite token</label>
            <input value={joinToken} onChange={(event) => setJoinToken(event.target.value)} placeholder="Paste invite token" />
            <button onClick={joinGroup}>
              <UserPlus size={16} />
              Join
            </button>
          </div>

          <div className="group-list">
            {groups.length === 0 ? (
              <div className="group-empty-card">No groups yet.</div>
            ) : (
              groups.map((group) => (
                <button key={group.id} className={`group-item ${(activeGroup?.id || "") === group.id ? "active" : ""}`} onClick={() => { setActiveGroupId(group.id); setShowGroupMenu(false); }}>
                  <strong>{group.name}</strong>
                  <span>{group.members.length} members</span>
                  <small className="group-role-pill">{group.currentRole}</small>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="group-main">
          {!activeGroup ? (
            <div className="group-empty-card tall">Create or join a group to begin.</div>
          ) : (
            <>
              <div className="group-card">
                <div className="group-header-row">
                  <div>
                    <p className="group-eyebrow">Group Space</p>
                    <h3>{activeGroup.name}</h3>
                  </div>

                  <div className="group-menu-wrap">
                    <button className="group-menu-trigger" onClick={() => setShowGroupMenu((value) => !value)} aria-label="Group options">
                      <MoreVertical size={18} />
                    </button>

                    {showGroupMenu && (
                      <div className="group-menu-dropdown">
                        {activeGroup.isOwner ? (
                          <button onClick={() => handleGroupAction("delete")}>Delete Group</button>
                        ) : (
                          <button onClick={() => handleGroupAction("leave")}>Leave Group</button>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <p className="group-description">{activeGroup.description}</p>
                <div className="group-meta">
                  <span><Users size={14} /> {activeGroup.members.length} members</span>
                  <span><Shield size={14} /> You are {activeGroup.currentRole}</span>
                  <button onClick={() => copyInviteLink(activeGroup.inviteLink)}>
                    <Copy size={14} />
                    Copy Invite Link
                  </button>
                </div>
              </div>

              <div className="group-shares-card">
                <div className="group-card-topline">
                  <h4>Members and roles</h4>
                </div>

                <div className="group-member-role-list">
                  {activeGroup.members.map((member) => (
                    <div key={member.id} className="group-member-role-item">
                      <div>
                        <strong>{member.name}</strong>
                        <span>{member.email}</span>
                      </div>

                      <div className="group-member-role-actions">
                        <span className={`member-role-badge ${member.role}`}>{member.role}</span>
                        {activeGroup.isOwner && member.role !== "owner" && (
                          <select value={member.role} onChange={(event) => updateRole(member.id, event.target.value)} disabled={changingMemberId === member.id}>
                            <option value="member">Member</option>
                            <option value="admin">Admin</option>
                          </select>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="group-shares-card">
                <div className="group-card-topline">
                  <h4>Files shared in this group</h4>
                </div>
                {currentGroupShares.length === 0 ? (
                  <div className="group-share-empty">No files shared in this group yet.</div>
                ) : (
                  <div className="group-share-list">
                    {currentGroupShares.map((share) => (
                      <div key={share.id} className="group-share-item">
                        <div>
                          <strong>{share.fileName}</strong>
                          <span>By {share.owner?.name || "User"}</span>
                        </div>
                        <div className="group-share-actions">
                          {share.requiresPassword && <span className="password-pill"><KeyRound size={14} /> Password</span>}
                          <button onClick={() => openGroupShare(share, "view")} disabled={busyShareId === share.id}>
                            {busyShareId === share.id ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
                          </button>
                          <button onClick={() => openGroupShare(share, "download")} disabled={busyShareId === share.id || share.permission !== "download"}>
                            <Download size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <ShareChatPanel backendUrl={backendUrl} endpointBase={`/api/share/groups/${activeGroup.id}/messages`} title={`${activeGroup.name} group chat`} emptyLabel="No group messages yet." />
            </>
          )}
        </div>
      </section>

      {showCreateModal && (
        <CreateGroupModal
          backendUrl={backendUrl}
          onClose={() => setShowCreateModal(false)}
          onCreated={() => {
            setShowCreateModal(false);
            refreshAll();
          }}
        />
      )}

      {previewState.isOpen && (
        <div className="shared-preview-overlay" onClick={closePreview}>
          <div className="shared-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shared-preview-header">
              <div>
                <h3>{previewState.fileName}</h3>
                <p>Group file preview</p>
              </div>
              <button onClick={closePreview}>Close</button>
            </div>
            <div className="shared-preview-body">
              {getPreviewKind(previewState.mimeType) === "image" && previewState.url && <img src={previewState.url} alt={previewState.fileName} />}
              {getPreviewKind(previewState.mimeType) === "pdf" && previewState.url && <iframe src={previewState.url} title={previewState.fileName} />}
              {getPreviewKind(previewState.mimeType) === "text" && <pre>{previewState.content}</pre>}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
