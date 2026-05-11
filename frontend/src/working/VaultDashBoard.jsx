import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  AlertCircle,
  Download,
  Eye,
  FileArchive,
  FileText,
  Grid,
  Image as ImageIcon,
  List,
  Loader2,
  Lock,
  LogOut,
  RefreshCw,
  Search,
  Share2,
  Shield,
  History,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import "./vaultDashboard.css";
import { AppContext } from "../context/AppContext";
import UploadModal from "./UploadModal";
import FileShareModal from "./FileShareModal";
import ShareWorkspace from "./ShareWorkspace";
import { getPreviewKind, openBlobDownload } from "./shareCrypto";
import { decryptVaultFileBlob } from "./vaultCrypto";
import SecurityCenterPanel from "./SecurityCenterPanel";
import TrashPanel from "./TrashPanel";
import VersionHistoryModal from "./VersionHistoryModal";

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

const openBlobInNewTab = (blob) => {
  const objectUrl = URL.createObjectURL(blob);
  const openedWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");
  if (!openedWindow) window.location.href = objectUrl;
  setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
};

export default function VaultDashboard({ onLock = () => {} }) {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selectedFolder, setSelectedFolder] = useState("All Files");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [activeWorkspace, setActiveWorkspace] = useState("vault");
  const [shareTargetFile, setShareTargetFile] = useState(null);
  const [versionTargetFile, setVersionTargetFile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [busyFileId, setBusyFileId] = useState("");
  const [previewFile, setPreviewFile] = useState(null);
  const [previewState, setPreviewState] = useState({
    isOpen: false,
    fileName: "",
    mimeType: "",
    content: "",
    url: ""
  });

  const { backendUrl, vaultSession, setVaultSession, userData } = useContext(AppContext);

  const folders = useMemo(() => ["All Files", ...new Set(files.map((file) => file.folder || "General"))], [files]);

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const aiText = [
        file.name,
        file.aiCategory,
        ...(file.aiTags || []),
        ...(file.aiSensitiveFindings || []),
        file.aiSummary,
        file.extractedTextPreview
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const matchesSearch = normalizedSearch ? aiText.includes(normalizedSearch) : true;
      const matchesFolder = selectedFolder === "All Files" || file.folder === selectedFolder;
      return matchesSearch && matchesFolder;
    });
  }, [files, searchQuery, selectedFolder]);

  const totalSizeLabel = useMemo(() => {
    const totalInMb = files.reduce((sum, file) => {
      const [rawValue = "0", rawUnit = "MB"] = String(file.size || "0 MB").split(" ");
      const value = parseFloat(rawValue) || 0;
      const unit = rawUnit.toUpperCase();
      if (unit === "KB") return sum + value / 1024;
      if (unit === "GB") return sum + value * 1024;
      return sum + value;
    }, 0);

    return totalInMb >= 1024 ? `${(totalInMb / 1024).toFixed(2)} GB` : `${totalInMb.toFixed(2)} MB`;
  }, [files]);

  const imageCount = useMemo(() => files.filter((file) => file.type?.startsWith("image/")).length, [files]);
  const sensitiveCount = useMemo(() => files.filter((file) => (file.aiSensitiveFindings || []).length > 0).length, [files]);

  const closePreview = useCallback(() => {
    setPreviewState((current) => {
      if (current.url) URL.revokeObjectURL(current.url);
      return { isOpen: false, fileName: "", mimeType: "", content: "", url: "" };
    });
    setPreviewFile(null);
  }, []);

  const fetchFiles = useCallback(async (showRefreshState = false) => {
    if (!backendUrl) return;

    if (showRefreshState) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
    }

    try {
      const { data } = await axios.get(`${backendUrl}/api/vault/files`);
      if (data.success) {
        setFiles(data.files || []);
      } else {
        toast.error(data.message || "Unable to load vault files");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to load vault files");
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    return () => {
      if (previewState.url) URL.revokeObjectURL(previewState.url);
    };
  }, [previewState.url]);

  const getFileIcon = (type, iconSize) => {
    if (type === "application/pdf") return <FileText size={iconSize} />;
    if (type?.startsWith("image/")) return <ImageIcon size={iconSize} />;
    if (type?.includes("zip") || type?.includes("rar") || type?.includes("archive")) return <FileArchive size={iconSize} />;
    return <FileText size={iconSize} />;
  };

  const fetchEncryptedPayload = async (fileId) => {
    const response = await axios.get(`${backendUrl}/api/vault/file/${fileId}/download`, {
      responseType: "arraybuffer"
    });
    return response.data instanceof ArrayBuffer ? response.data : response.data.buffer;
  };

  const handleViewFile = async (file) => {
    if (!vaultSession) {
      toast.error("Vault key expired. Please unlock the vault again.");
      return;
    }

    setBusyFileId(file.id);
    try {
      const encryptedPayload = await fetchEncryptedPayload(file.id);
      const blob = await decryptVaultFileBlob(encryptedPayload, file, vaultSession);
      const previewKind = getPreviewKind(file.type);

      if (previewKind === "binary") {
        openBlobInNewTab(blob);
        toast.success("Opened the decrypted file in a new tab.");
        return;
      }

      if (previewKind === "text") {
        const content = await blob.text();
        setPreviewState({ isOpen: true, fileName: file.name, mimeType: file.type, content, url: "" });
        setPreviewFile(file);
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreviewState({ isOpen: true, fileName: file.name, mimeType: file.type, content: "", url });
      setPreviewFile(file);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to decrypt file");
    } finally {
      setBusyFileId("");
    }
  };

  const handleDownloadFile = async (file) => {
    if (!vaultSession) {
      toast.error("Vault key expired. Please unlock the vault again.");
      return;
    }

    setBusyFileId(file.id);
    try {
      const encryptedPayload = await fetchEncryptedPayload(file.id);
      const blob = await decryptVaultFileBlob(encryptedPayload, file, vaultSession);
      openBlobDownload(blob, file.name);
      toast.success("Decrypted file download started.");
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to download file");
    } finally {
      setBusyFileId("");
    }
  };

  const handleDeleteFile = async (fileId) => {
    setBusyFileId(fileId);
    try {
      const { data } = await axios.delete(`${backendUrl}/api/vault/delete/${fileId}`);
      if (data.success) {
        setFiles((current) => current.filter((file) => file.id !== fileId));
        if (previewFile?.id === fileId) closePreview();
        toast.success(data.message || "File moved to trash.");
      } else {
        toast.error(data.message || "Unable to delete file");
      }
    } catch (error) {
      toast.error(error.response?.data?.message || "Unable to delete file");
    } finally {
      setBusyFileId("");
    }
  };

  const summaryCards = [
    { label: "Stored Files", value: files.length, note: "Synced from your vault storage" },
    { label: "Protected Size", value: totalSizeLabel, note: "Encrypted before upload" },
    { label: "Images", value: imageCount, note: "Preview directly after decrypting" },
    { label: "Sensitive", value: sensitiveCount, note: "Locally tagged before upload" }
  ];

  const staggerContainer = {
    hidden: {},
    show: {
      transition: {
        staggerChildren: 0.08
      }
    }
  };

  const riseIn = {
    hidden: { opacity: 0, y: 18, scale: 0.98 },
    show: { opacity: 1, y: 0, scale: 1, transition: { duration: 0.45, ease: "easeOut" } }
  };

  return (
    <div className="vault-layout">
      <motion.header className="vault-header" initial={{ opacity: 0, y: -16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
        <div className="header-left">
          <div className="brand-icon">
            <Lock size={25} />
          </div>
          <div>
            <h2>Encrypted Vault</h2>
            <span className="stats">{files.length} files • {totalSizeLabel} protected • {userData?.name || "Vault User"}</span>
          </div>
        </div>

        <div className="header-actions">
          <button className="ghost-btn" onClick={() => fetchFiles(true)} disabled={isRefreshing || isLoading}>
            {isRefreshing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
          <button className="lock-btn" onClick={() => {
            setVaultSession(null);
            onLock();
          }}>
            <LogOut size={16} />
            Lock Vault
          </button>
        </div>
      </motion.header>

      <motion.section className="hero-panel glow-panel" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.55, ease: "easeOut" }}>
        <div className="hero-copy">
          <p className="eyebrow">Secure file workspace</p>
          <h1>Upload encrypted files, keep them stored, and share them with controlled access when needed.</h1>
          <p className="hero-text">Your vault keeps the original encrypted file. Sharing creates a separate share copy with optional password protection and its own conversation thread.</p>
        </div>

        <div className="hero-status">
          <div className="status-chip">
            <Shield size={16} />
            AES-256 client-side encryption active
          </div>
          <button className="primary-btn" onClick={() => setShowUploadModal(true)}>
            <Upload size={16} />
            Upload File
          </button>
        </div>
      </motion.section>

      <motion.section className="summary-grid summary-grid-wide" variants={staggerContainer} initial="hidden" animate="show">
        {summaryCards.map((card) => (
          <motion.article key={card.label} className="summary-card floating-card" variants={riseIn} whileHover={{ y: -4, scale: 1.01 }}>
            <p className="summary-label">{card.label}</p>
            <strong className="summary-value">{card.value}</strong>
            <span className="summary-note">{card.note}</span>
          </motion.article>
        ))}
      </motion.section>

      <motion.section className="workspace-switch" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15, duration: 0.35 }}>
        <button className={activeWorkspace === "vault" ? "active" : ""} onClick={() => setActiveWorkspace("vault")}>Vault Files</button>
        <button className={activeWorkspace === "sharing" ? "active" : ""} onClick={() => setActiveWorkspace("sharing")}>Sharing</button>
        <button className={activeWorkspace === "security" ? "active" : ""} onClick={() => setActiveWorkspace("security")}>Security Center</button>
      </motion.section>

      {activeWorkspace === "vault" ? (
        <motion.section className="vault-panel vault-panel-animated" initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
          <div className="actions-bar">
            <div className="search-box">
              <Search size={18} />
              <input value={searchQuery} onChange={(event) => setSearchQuery(event.target.value)} placeholder="Search files by name" />
            </div>

            <div className="actions-right">
              <div className="folder-pills">
                {folders.map((folder) => (
                  <button key={folder} className={selectedFolder === folder ? "active" : ""} onClick={() => setSelectedFolder(folder)}>
                    {folder}
                  </button>
                ))}
              </div>

              <div className="view-toggle">
                <button className={viewMode === "list" ? "active" : ""} onClick={() => setViewMode("list")} aria-label="List view">
                  <List size={16} />
                </button>
                <button className={viewMode === "grid" ? "active" : ""} onClick={() => setViewMode("grid")} aria-label="Grid view">
                  <Grid size={16} />
                </button>
              </div>
            </div>
          </div>

          {isLoading ? (
            <div className="state-card">
              <Loader2 size={18} className="spin" />
              <span>Loading your stored files...</span>
            </div>
          ) : filteredFiles.length === 0 ? (
            <div className="state-card">
              <AlertCircle size={18} />
              <span>{files.length === 0 ? "No encrypted files stored yet. Upload one to get started." : "No files match your current search or folder filter."}</span>
            </div>
          ) : (
            <motion.div className={viewMode === "grid" ? "grid-view" : "list-view"} variants={staggerContainer} initial="hidden" animate="show">
              {filteredFiles.map((file) => {
                const isBusy = busyFileId === file.id;
                return (
                  <motion.article key={file.id} className="file-card interactive-card" variants={riseIn} whileHover={{ y: -6 }}>
                    <div className="file-primary">
                      <div className="file-icon">{getFileIcon(file.type, viewMode === "grid" ? 28 : 20)}</div>
                      <div className="file-meta-block">
                        <strong className="file-name">{file.name}</strong>
                        <span className="file-date">Added {formatDate(file.uploadedAt)}</span>
                        {file.aiSummary ? <small className="file-ai-summary">{file.aiSummary}</small> : null}
                      </div>
                    </div>

                    <div className="file-details">
                      <span>{file.size}</span>
                      <span>{file.folder || "General"}</span>
                      {file.aiCategory ? <span>{file.aiCategory}</span> : null}
                      <span className="status-tag">
                        <Shield size={14} />
                        Encrypted
                      </span>
                    </div>

                    {(file.aiTags?.length || file.aiSensitiveFindings?.length) ? (
                      <div className="file-ai-tags">
                        {[...(file.aiTags || []), ...(file.aiSensitiveFindings || []).map((tag) => `Risk: ${tag}`)].slice(0, 4).map((tag) => (
                          <span key={tag} className="ai-tag">{tag}</span>
                        ))}
                      </div>
                    ) : null}

                    <div className="file-actions">
                      <button className="action-btn" onClick={() => setShareTargetFile(file)} disabled={isBusy}>
                        <Share2 size={16} />
                        Share
                      </button>
                      <button className="action-btn" onClick={() => handleViewFile(file)} disabled={isBusy}>
                        {isBusy ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
                        View
                      </button>
                      <button className="action-btn" onClick={() => handleDownloadFile(file)} disabled={isBusy}>
                        <Download size={16} />
                        Download
                      </button>
                      <button className="action-btn" onClick={() => setVersionTargetFile(file)} disabled={isBusy}>
                        <History size={16} />
                        Versions
                      </button>
                      <button className="action-btn danger" onClick={() => handleDeleteFile(file.id)} disabled={isBusy}>
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </motion.article>
                );
              })}
            </motion.div>
          )}

          <TrashPanel
            backendUrl={backendUrl}
            onRestored={() => fetchFiles(true)}
          />
        </motion.section>
      ) : activeWorkspace === "sharing" ? (
        <ShareWorkspace backendUrl={backendUrl} />
      ) : (
        <SecurityCenterPanel backendUrl={backendUrl} userData={userData} />
      )}

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={(file) => {
            setFiles((current) => [file, ...current]);
            setShowUploadModal(false);
          }}
        />
      )}

      {shareTargetFile && (
        <FileShareModal
          file={shareTargetFile}
          backendUrl={backendUrl}
          vaultSession={vaultSession}
          onClose={() => setShareTargetFile(null)}
          onShared={() => setActiveWorkspace("sharing")}
        />
      )}

      {versionTargetFile && (
        <VersionHistoryModal
          backendUrl={backendUrl}
          file={versionTargetFile}
          onClose={() => setVersionTargetFile(null)}
          onRestored={() => fetchFiles(true)}
        />
      )}

      {previewState.isOpen && (
        <div className="preview-overlay" onClick={closePreview}>
          <div className="preview-modal" onClick={(event) => event.stopPropagation()}>
            <div className="preview-header">
              <div>
                <h3>{previewState.fileName}</h3>
                <p>Decrypted locally for viewing</p>
              </div>
              <button className="icon-btn" onClick={closePreview} aria-label="Close preview">
                <X size={18} />
              </button>
            </div>

            <div className="preview-body">
              {getPreviewKind(previewState.mimeType) === "image" && previewState.url && <img className="preview-image" src={previewState.url} alt={previewState.fileName} />}
              {getPreviewKind(previewState.mimeType) === "pdf" && previewState.url && <iframe className="preview-frame" src={previewState.url} title={previewState.fileName} />}
              {getPreviewKind(previewState.mimeType) === "text" && <pre className="preview-text">{previewState.content}</pre>}
            </div>

            <div className="preview-footer">
              <button className="ghost-btn" onClick={closePreview}>Close</button>
              <button className="primary-btn" onClick={() => previewFile && handleDownloadFile(previewFile)}>
                <Download size={16} />
                Download Decrypted File
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
