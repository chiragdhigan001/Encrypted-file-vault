import { useState } from "react";
import axios from "axios";
import { Download, Eye, Globe2, KeyRound, Loader2 } from "lucide-react";
import { toast } from "react-toastify";
import ShareChatPanel from "./ShareChatPanel";
import { decryptCipherTextToBlob, getPreviewKind, openBlobDownload } from "./shareCrypto";
import "./publicShareBoard.css";

export default function PublicShareBoard({ backendUrl, publicShares }) {
  const [activeShareId, setActiveShareId] = useState("");
  const [busyShareId, setBusyShareId] = useState("");
  const [previewState, setPreviewState] = useState({ isOpen: false, fileName: "", mimeType: "", content: "", url: "" });

  const activeShare = publicShares.find((share) => share.id === activeShareId) || publicShares[0] || null;

  const closePreview = () => {
    setPreviewState((current) => {
      if (current.url) URL.revokeObjectURL(current.url);
      return { isOpen: false, fileName: "", mimeType: "", content: "", url: "" };
    });
  };

  const openShare = async (share, mode) => {
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
      toast.error("Unable to open this public share.");
    } finally {
      setBusyShareId("");
    }
  };

  return (
    <>
      <section className="public-share-board">
        <div className="public-share-list">
          {publicShares.length === 0 ? (
            <div className="public-share-empty">No public files shared yet.</div>
          ) : (
            publicShares.map((share) => (
              <button key={share.id} className={`public-share-item ${(activeShare?.id || "") === share.id ? "active" : ""}`} onClick={() => setActiveShareId(share.id)}>
                <strong>{share.fileName}</strong>
                <span>By {share.owner?.name || "User"}</span>
                <small>{share.requiresPassword ? "Public share with password" : "Open public share"}</small>
              </button>
            ))
          )}
        </div>

        <div className="public-share-main">
          {!activeShare ? (
            <div className="public-share-empty tall">Select a public file share.</div>
          ) : (
            <>
              <div className="public-share-card">
                <div>
                  <p className="share-card-eyebrow">Public Share</p>
                  <h3>{activeShare.fileName}</h3>
                  <span>Shared by {activeShare.owner?.name || "User"}</span>
                </div>
                <div className="public-share-meta">
                  <span>{activeShare.fileSize}</span>
                  <span>{activeShare.permission}</span>
                  {activeShare.requiresPassword && (
                    <span className="password-pill"><KeyRound size={14} /> Password protected</span>
                  )}
                </div>
                <div className="public-share-actions">
                  <button onClick={() => openShare(activeShare, "view")} disabled={busyShareId === activeShare.id}>
                    {busyShareId === activeShare.id ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
                    View
                  </button>
                  <button onClick={() => openShare(activeShare, "download")} disabled={busyShareId === activeShare.id || activeShare.permission !== "download"}>
                    <Download size={16} />
                    Download
                  </button>
                  <div className="public-badge">
                    <Globe2 size={16} />
                    Visible to all users
                  </div>
                </div>
              </div>

              <ShareChatPanel backendUrl={backendUrl} endpointBase={`/api/share/${activeShare.id}/messages`} title={`${activeShare.fileName} public thread`} emptyLabel="No one has talked about this public share yet." />
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
                <p>Public file preview</p>
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
