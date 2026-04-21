import { useCallback, useContext, useEffect, useMemo, useState } from "react";
import axios from "axios";
import CryptoJS from "crypto-js";
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
  Shield,
  Trash2,
  Upload,
  X
} from "lucide-react";
import { toast } from "react-toastify";
import "./vaultDashboard.css";
import { AppContext } from "../context/AppContext";
import UploadModal from "./UploadModal";

const formatDate = (value) => {
  if (!value) return "Unknown";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";

  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric"
  }).format(date);
};

const getPreviewKind = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("xml")
  ) {
    return "text";
  }

  if (mimeType === "application/pdf") return "pdf";
  return "binary";
};

const bytesFromWordArray = (wordArray) => {
  const { words, sigBytes } = wordArray;
  const result = new Uint8Array(sigBytes);

  for (let i = 0; i < sigBytes; i += 1) {
    result[i] = (words[i >>> 2] >>> (24 - (i % 4) * 8)) & 0xff;
  }

  return result;
};

const decryptCipherTextToBlob = (cipherText, masterKey, mimeType) => {
  const decrypted = CryptoJS.AES.decrypt(cipherText, masterKey);

  if (!decrypted.sigBytes || decrypted.sigBytes <= 0) {
    throw new Error("Unable to decrypt this file. Please unlock the vault again.");
  }

  const bytes = bytesFromWordArray(decrypted);
  return new Blob([bytes], { type: mimeType || "application/octet-stream" });
};

const openBlobInNewTab = (blob, fileName) => {
  const objectUrl = URL.createObjectURL(blob);
  const openedWindow = window.open(objectUrl, "_blank", "noopener,noreferrer");

  if (!openedWindow) {
    window.location.href = objectUrl;
  }

  setTimeout(() => URL.revokeObjectURL(objectUrl), 60_000);

  return fileName;
};

export default function VaultDashboard({ onLock = () => {} }) {
  const [files, setFiles] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [selectedFolder, setSelectedFolder] = useState("All Files");
  const [showUploadModal, setShowUploadModal] = useState(false);
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

  const { backendUrl, masterKey, userData } = useContext(AppContext);

  const folders = useMemo(
    () => ["All Files", ...new Set(files.map((file) => file.folder || "General"))],
    [files]
  );

  const filteredFiles = useMemo(() => {
    return files.filter((file) => {
      const normalizedSearch = searchQuery.trim().toLowerCase();
      const matchesSearch = normalizedSearch
        ? (file.name || "").toLowerCase().includes(normalizedSearch)
        : true;
      const matchesFolder =
        selectedFolder === "All Files" || file.folder === selectedFolder;

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

    if (totalInMb >= 1024) {
      return `${(totalInMb / 1024).toFixed(2)} GB`;
    }

    return `${totalInMb.toFixed(2)} MB`;
  }, [files]);

  const imageCount = useMemo(
    () => files.filter((file) => file.type?.startsWith("image/")).length,
    [files]
  );

  const closePreview = useCallback(() => {
    setPreviewState((current) => {
      if (current.url) {
        URL.revokeObjectURL(current.url);
      }

      return {
        isOpen: false,
        fileName: "",
        mimeType: "",
        content: "",
        url: ""
      };
    });
    setPreviewFile(null);
  }, []);

  const fetchFiles = useCallback(
    async (showRefreshState = false) => {
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
    },
    [backendUrl]
  );

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  useEffect(() => {
    return () => {
      if (previewState.url) {
        URL.revokeObjectURL(previewState.url);
      }
    };
  }, [previewState.url]);

  const getFileIcon = (type, iconSize) => {
    if (type === "application/pdf") return <FileText size={iconSize} />;
    if (type?.startsWith("image/")) return <ImageIcon size={iconSize} />;
    if (type?.includes("zip") || type?.includes("rar") || type?.includes("archive")) {
      return <FileArchive size={iconSize} />;
    }
    return <FileText size={iconSize} />;
  };

  const fetchEncryptedPayload = async (fileId) => {
    const response = await axios.get(`${backendUrl}/api/vault/file/${fileId}/download`, {
      responseType: "text"
    });

    return response.data;
  };

  const handleViewFile = async (file) => {
    if (!masterKey) {
      toast.error("Vault key expired. Please unlock the vault again.");
      return;
    }

    setBusyFileId(file.id);

    try {
      const cipherText = await fetchEncryptedPayload(file.id);
      const blob = decryptCipherTextToBlob(cipherText, masterKey, file.type);
      const previewKind = getPreviewKind(file.type);

      if (previewKind === "binary") {
        openBlobInNewTab(blob, file.name);
        toast.success("Opened the decrypted file in a new tab.");
        return;
      }

      if (previewKind === "text") {
        const content = await blob.text();
        setPreviewState({
          isOpen: true,
          fileName: file.name,
          mimeType: file.type,
          content,
          url: ""
        });
        setPreviewFile(file);
        return;
      }

      const url = URL.createObjectURL(blob);
      setPreviewState({
        isOpen: true,
        fileName: file.name,
        mimeType: file.type,
        content: "",
        url
      });
      setPreviewFile(file);
    } catch (error) {
      toast.error(error.response?.data?.message || error.message || "Unable to decrypt file");
    } finally {
      setBusyFileId("");
    }
  };

  const handleDownloadFile = async (file) => {
    if (!masterKey) {
      toast.error("Vault key expired. Please unlock the vault again.");
      return;
    }

    setBusyFileId(file.id);

    try {
      const cipherText = await fetchEncryptedPayload(file.id);
      const blob = decryptCipherTextToBlob(cipherText, masterKey, file.type);
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");

      anchor.href = url;
      anchor.download = file.name;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();

      setTimeout(() => URL.revokeObjectURL(url), 30_000);
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
        if (previewFile?.id === fileId) {
          closePreview();
        }
        toast.success("File deleted successfully.");
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
    {
      label: "Stored Files",
      value: files.length,
      note: "Synced from your vault storage"
    },
    {
      label: "Protected Size",
      value: totalSizeLabel,
      note: "Encrypted before upload"
    },
    {
      label: "Images",
      value: imageCount,
      note: "Preview directly after decrypting"
    }
  ];

  return (
    <div className="vault-layout">
      <header className="vault-header">
        <div className="header-left">
          <div className="brand-icon">
            <Lock size={25} />
          </div>
          <div>
            <h2>Encrypted Vault</h2>
            <span className="stats">
              {files.length} files • {totalSizeLabel} protected • {userData?.name || "Vault User"}
            </span>
          </div>
        </div>

        <div className="header-actions">
          <button
            className="ghost-btn"
            onClick={() => fetchFiles(true)}
            disabled={isRefreshing || isLoading}
          >
            {isRefreshing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
            Refresh
          </button>
          <button className="lock-btn" onClick={onLock}>
            <LogOut size={16} />
            Lock Vault
          </button>
        </div>
      </header>

      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Secure file workspace</p>
          <h1>Upload encrypted files, keep them stored, and decrypt only when you need to view them.</h1>
          <p className="hero-text">
            Files stay stored in the vault after encryption. When you want access, decrypt them in the browser and preview or download the original file safely.
          </p>
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
      </section>

      <section className="summary-grid">
        {summaryCards.map((card) => (
          <article key={card.label} className="summary-card">
            <p className="summary-label">{card.label}</p>
            <strong className="summary-value">{card.value}</strong>
            <span className="summary-note">{card.note}</span>
          </article>
        ))}
      </section>

      <section className="vault-panel">
        <div className="actions-bar">
          <div className="search-box">
            <Search size={18} />
            <input
              value={searchQuery}
              onChange={(event) => setSearchQuery(event.target.value)}
              placeholder="Search files by name"
            />
          </div>

          <div className="actions-right">
            <div className="folder-pills">
              {folders.map((folder) => (
                <button
                  key={folder}
                  className={selectedFolder === folder ? "active" : ""}
                  onClick={() => setSelectedFolder(folder)}
                >
                  {folder}
                </button>
              ))}
            </div>

            <div className="view-toggle">
              <button
                className={viewMode === "list" ? "active" : ""}
                onClick={() => setViewMode("list")}
                aria-label="List view"
              >
                <List size={16} />
              </button>
              <button
                className={viewMode === "grid" ? "active" : ""}
                onClick={() => setViewMode("grid")}
                aria-label="Grid view"
              >
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
            <span>
              {files.length === 0
                ? "No encrypted files stored yet. Upload one to get started."
                : "No files match your current search or folder filter."}
            </span>
          </div>
        ) : (
          <div className={viewMode === "grid" ? "grid-view" : "list-view"}>
            {filteredFiles.map((file) => {
              const isBusy = busyFileId === file.id;

              return (
                <article key={file.id} className="file-card">
                  <div className="file-primary">
                    <div className="file-icon">{getFileIcon(file.type, viewMode === "grid" ? 28 : 20)}</div>
                    <div className="file-meta-block">
                      <strong className="file-name">{file.name}</strong>
                      <span className="file-date">Added {formatDate(file.uploadedAt)}</span>
                    </div>
                  </div>

                  <div className="file-details">
                    <span>{file.size}</span>
                    <span>{file.folder || "General"}</span>
                    <span className="status-tag">
                      <Shield size={14} />
                      Encrypted
                    </span>
                  </div>

                  <div className="file-actions">
                    <button
                      className="action-btn"
                      onClick={() => handleViewFile(file)}
                      disabled={isBusy}
                    >
                      {isBusy ? <Loader2 size={16} className="spin" /> : <Eye size={16} />}
                      View
                    </button>
                    <button
                      className="action-btn"
                      onClick={() => handleDownloadFile(file)}
                      disabled={isBusy}
                    >
                      <Download size={16} />
                      Download
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => handleDeleteFile(file.id)}
                      disabled={isBusy}
                    >
                      <Trash2 size={16} />
                      Delete
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={(file) => {
            setFiles((current) => [file, ...current]);
            setShowUploadModal(false);
          }}
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
              {getPreviewKind(previewState.mimeType) === "image" && previewState.url && (
                <img className="preview-image" src={previewState.url} alt={previewState.fileName} />
              )}

              {getPreviewKind(previewState.mimeType) === "pdf" && previewState.url && (
                <iframe
                  className="preview-frame"
                  src={previewState.url}
                  title={previewState.fileName}
                />
              )}

              {getPreviewKind(previewState.mimeType) === "text" && (
                <pre className="preview-text">{previewState.content}</pre>
              )}
            </div>

            <div className="preview-footer">
              <button className="ghost-btn" onClick={closePreview}>
                Close
              </button>
              <button
                className="primary-btn"
                onClick={() => previewFile && handleDownloadFile(previewFile)}
              >
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
