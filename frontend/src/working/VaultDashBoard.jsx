import { useState, useMemo } from "react";
import {
  Lock,
  Upload,
  Search,
  FolderPlus,
  Grid,
  List,
  LogOut,
  FileText,
  Image as ImageIcon,
  FileArchive
} from "lucide-react";
import "./vaultDashboard.css";
import UploadModal from "./UploadModal";


export default function VaultDashboard({ onLock = () => {} }) {

  // ---------------- STATE ----------------
  const [files, setFiles] = useState([
    { id: "1", name: "Financial_Report.pdf", size: "2.4 MB", type: "pdf", folder: "Documents", encrypted: true },
    { id: "2", name: "Meeting_Notes.docx", size: "892 KB", type: "text", folder: "Work", encrypted: true, sharedBy: { userName: "Sarah" } },
    { id: "3", name: "Project_Alpha.zip", size: "45 MB", type: "archive", folder: "Work", encrypted: true },
    { id: "4", name: "Profile_Pic.png", size: "1.2 MB", type: "image", folder: "Personal", encrypted: true }
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [viewMode, setViewMode] = useState("list");
  const [showUploadModal, setShowUploadModal] = useState(false);
  const [selectedFolder, setSelectedFolder] = useState("All Files");
  const [activeTab, setActiveTab] = useState("my-files");

  // ---------------- LOGIC ----------------

  const folders = useMemo(() => {
    return ["All Files", ...new Set(files.map(f => f.folder || "Others"))];
  }, [files]);

  const myFiles = files.filter(f => !f.sharedBy);
  const sharedWithMeFiles = files.filter(f => f.sharedBy);
  const activeFiles = activeTab === "my-files" ? myFiles : sharedWithMeFiles;

  const filteredFiles = activeFiles.filter(file => {
    const matchesSearch =
      (file.name || "").toLowerCase().includes(searchQuery.toLowerCase());

    const matchesFolder =
      selectedFolder === "All Files" || file.folder === selectedFolder;

    return matchesSearch && matchesFolder;
  });

  const totalSize = useMemo(() => {
    return files.reduce((acc, file) => {
      const size = parseFloat(file.size) || 0;
      const unit = file.size?.split(" ")[1] || "MB";
      return acc + (unit === "KB" ? size / 1024 : size);
    }, 0);
  }, [files]);

  const getFileIcon = (type) => {
    const iconSize = viewMode === "grid" ? 40 : 20;
    if (type === "pdf") return <FileText size={iconSize} />;
    if (type === "image") return <ImageIcon size={iconSize} />;
    if (type === "archive") return <FileArchive size={iconSize} />;
    return <FileText size={iconSize} />;
  };

  // ---------------- UI ----------------
  return (
    <div className="vault-layout">

      {/* HEADER */}
      <header className="vault-header">
        <div className="header-left">
          <div className="brand-icon">
            <Lock size={20} />
          </div>
          <div>
            <h2>Encrypted Vault</h2>
            <span className="stats">
              {myFiles.length} files • {sharedWithMeFiles.length} shared • {totalSize.toFixed(1)} MB
            </span>
          </div>
        </div>

        <button className="lock-btn" onClick={onLock}>
          <LogOut size={16} /> Lock Vault
        </button>
      </header>

      {/* ACTION BAR */}
      <div className="actions-bar">

        <div className="search-box">
          <Search size={18} />
          <input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search files..."
          />
        </div>

        <div className="actions-right">

          <button
            className="primary-btn"
            onClick={() => setShowUploadModal(true)}
          >
            <Upload size={16} /> Upload
          </button>

          <button className="secondary-btn">
            <FolderPlus size={16} /> New Folder
          </button>

          <div className="view-toggle">
            <button
              className={viewMode === "list" ? "active" : ""}
              onClick={() => setViewMode("list")}
            >
              <List size={16} />
            </button>

            <button
              className={viewMode === "grid" ? "active" : ""}
              onClick={() => setViewMode("grid")}
            >
              <Grid size={16} />
            </button>
          </div>

        </div>
      </div>

      {/* TABS */}
      <div className="tabs">
        <button
          className={activeTab === "my-files" ? "active" : ""}
          onClick={() => { setActiveTab("my-files"); setSelectedFolder("All Files"); }}
        >
          My Files
        </button>

        <button
          className={activeTab === "shared-with-me" ? "active" : ""}
          onClick={() => { setActiveTab("shared-with-me"); setSelectedFolder("All Files"); }}
        >
          Shared With Me
        </button>
      </div>

      {/* FOLDERS */}
      <div className="folders">
        {folders.map(folder => (
          <button
            key={folder}
            className={selectedFolder === folder ? "active" : ""}
            onClick={() => setSelectedFolder(folder)}
          >
            {folder}
          </button>
        ))}
      </div>

      {/* FILES */}
      <div className={viewMode === "grid" ? "grid-view" : "list-view"}>

        {filteredFiles.length === 0 && (
          <p className="empty">No files found</p>
        )}

        {filteredFiles.map(file => (
          <div key={file.id} className="file-card">

            <div className="file-left">
              {getFileIcon(file.type)}
              <span>{file.name}</span>
            </div>

            {viewMode === "list" && (
              <>
                <span>{file.size}</span>
                <span>{file.folder}</span>
                <span>🔐 Encrypted</span>
              </>
            )}

            {activeTab === "shared-with-me" && (
              <span>Shared by {file.sharedBy?.userName}</span>
            )}

          </div>
        ))}

      </div>

      {/* UPLOAD MODAL */}
      {showUploadModal && (
        <UploadModal
          onClose={() => setShowUploadModal(false)}
          onUpload={(file) =>
            setFiles(prev => [
              ...prev,
              {
                id: Date.now().toString(),
                name: file.name,
                size: `${(file.size / 1024 / 1024).toFixed(2)} MB`,
                type: file.type.includes("image") ? "image" : "file",
                folder: "Uploads",
                encrypted: true
              }
            ])
          }
        />
      )}

    </div>
  );
}
