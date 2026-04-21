import { useMemo, useState } from "react";
import axios from "axios";
import { Download, Eye, KeyRound, Loader2, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import ShareChatPanel from "./ShareChatPanel";
import { decryptCipherTextToBlob, getPreviewKind, openBlobDownload } from "./shareCrypto";
import "./sharedInbox.css";

export default function SharedInbox({ backendUrl, received, sent, refreshShares }) {
  const [activeTab, setActiveTab] = useState("received");
  const [activeShareId, setActiveShareId] = useState("");
  const [busyShareId, setBusyShareId] = useState("");
  const [previewState, setPreviewState] = useState({
    isOpen: false,
    fileName: "",
    mimeType: "",
    content: "",
    url: ""
  });

  const activeItems = activeTab === "received" ? received : sent;
  const activeShare = useMemo(() => activeItems.find((share) => share.id === activeShareId) || activeItems[0] || null, [activeItems, activeShareId]);

  const closePreview = () => {
    setPreviewState((current) => {
      if (current.url) URL.revokeObjectURL(current.url);
      return { isOpen: false, fileName: "", mimeType: "", content: "", url: "" };
    });
  };

  const getAccessKey = (share) => {
    if (!share.requiresPassword) return share.systemAccessKey;
    return window.prompt(`Enter the share password for "${share.fileName}"`);
  };

  const handleOpenShare = async (share, mode) => {
    const accessKey = getAccessKey(share);
    if (!accessKey) return;

    setBusyShareId(share.id);
    try {
      const { data } = await axios.get(`${backendUrl}/api/share/file/${share.id}/download`, {
        responseType: "text"
      });

      const blob = decryptCipherTextToBlob(data, accessKey, share.fileType);

      if (mode === "download") {
        openBlobDownload(blob, share.fileName);
        toast.success("Shared file download started.");
        return;
      }

      const previewKind = getPreviewKind(share.fileType);

      if (previewKind === "binary") {
        openBlobDownload(blob, share.fileName);
        toast.info("Binary file downloaded because inline preview is not supported.");
        return;
      }

      if (previewKind === "text") {
        const content = await blob.text();
        setPreviewState({ isOpen: true, fileName: share.fileName, mimeType: share.fileType, content, url: "" });
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreviewState({ isOpen: true, fileName: share.fileName, mimeType: share.fileType, content: "", url });
    } catch (error) {
      toast.error("Unable to open this shared file. The share password may be incorrect.");
    } finally {
      setBusyShareId("");
    }
  };

  const handleRevokeShare = async (shareId) => {
    setBusyShareId(shareId);
    try {
      const { data } = await axios.delete(`${backendUrl}/api/share/${shareId}`);
      if (data.success) {
        toast.success("Share revoked.");
        refreshShares();
      } else {
        toast.error(data.message || "Unable to revoke share.");
      }
    } catch (error) {
      toast.error("Unable to revoke share.");
    } finally {
      setBusyShareId("");
    }
  };

  return (
    <>
      <section className="shared-inbox-shell">
        <div className="shared-inbox-sidebar">
          <div className="shared-inbox-tabs">
            <button className={activeTab === "received" ? "active" : ""} onClick={() => { setActiveTab("received"); setActiveShareId(""); }}>Received</button>
            <button className={activeTab === "sent" ? "active" : ""} onClick={() => { setActiveTab("sent"); setActiveShareId(""); }}>Sent</button>
          </div>

          <div className="shared-inbox-list">
            {activeItems.length === 0 ? (
              <div className="shared-empty-card"><span>No shares in this list yet.</span></div>
            ) : (
              activeItems.map((share) => (
                <button key={share.id} className={`shared-inbox-item ${(activeShare?.id || "") === share.id ? "active" : ""}`} onClick={() => setActiveShareId(share.id)}>
                  <strong>{share.fileName}</strong>
                  <span>{activeTab === "received" ? `From ${share.owner?.name || "User"}` : `To ${share.recipient?.name || "User"}`}</span>
                  <small>{share.requiresPassword ? "Protected with share password" : "No password required"}</small>
                </button>
              ))
            )}
          </div>
        </div>

        <div className="shared-inbox-main">
          {!activeShare ? (
            <div className="shared-empty-card tall"><span>Select a share to view actions and chat.</span></div>
          ) : (
            <>
              <div className="shared-detail-card">
                <div>
                  <p className="shared-detail-eyebrow">Shared File</p>
                  <h3>{activeShare.fileName}</h3>
                  <span>{activeTab === "received" ? `Shared by ${activeShare.owner?.name || "User"}` : `Shared with ${activeShare.recipient?.name || "User"}`}</span>
                </div>
                <div className="shared-detail-meta">
                  <span>{activeShare.fileSize}</span>
                  <span>{activeShare.permission}</span>
                  <span>{activeShare.folder}</span>
                  {activeShare.requiresPassword && (
                    <span className="password-pill">
                      <KeyRound size={14} />
                      Share password required
                    </span>
                  )}
                </div>
                <div className="shared-detail-actions">
                  <button onClick={() => handleOpenShare(activeShare, "view")} disabled={busyShareId === activeShare.id}>
                    {busyShareId === activeShare.id ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
                    View
                  </button>
                  <button onClick={() => handleOpenShare(activeShare, "download")} disabled={busyShareId === activeShare.id || activeShare.permission !== "download"}>
                    <Download size={16} />
                    Download
                  </button>
                  {activeTab === "sent" && (
                    <button className="danger" onClick={() => handleRevokeShare(activeShare.id)} disabled={busyShareId === activeShare.id}>
                      <Trash2 size={16} />
                      Revoke
                    </button>
                  )}
                </div>
              </div>

              <ShareChatPanel backendUrl={backendUrl} endpointBase={`/api/share/${activeShare.id}/messages`} title={`${activeShare.fileName} conversation`} />
            </>
          )}
        </div>
      </section>

      {previewState.isOpen && (
        <div className="shared-preview-overlay" onClick={closePreview}>
          <div className="shared-preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="shared-preview-header">
              <div>
                <h3>{previewState.fileName}</h3>
                <p>Shared file preview</p>
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
