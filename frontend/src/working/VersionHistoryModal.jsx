import { useEffect, useState } from "react";
import axios from "axios";
import { History, Loader2, RotateCcw, X } from "lucide-react";
import { toast } from "react-toastify";
import "./versionHistoryModal.css";

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export default function VersionHistoryModal({ backendUrl, file, onClose, onRestored }) {
  const [versions, setVersions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadVersions = async () => {
      try {
        const { data } = await axios.get(`${backendUrl}/api/vault/file/${file.id}/versions`);
        if (data.success) {
          setVersions(data.versions || []);
        } else {
          toast.error(data.message || "Unable to load versions.");
        }
      } catch (error) {
        toast.error("Unable to load versions.");
      } finally {
        setLoading(false);
      }
    };

    loadVersions();
  }, [backendUrl, file.id]);

  const restoreVersion = async (versionId) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/vault/file/${versionId}/restore-version`);
      if (data.success) {
        toast.success(data.message);
        onRestored?.(data.file);
        onClose();
      } else {
        toast.error(data.message || "Unable to restore this version.");
      }
    } catch (error) {
      toast.error("Unable to restore this version.");
    }
  };

  return (
    <div className="version-overlay" onClick={onClose}>
      <div className="version-card" onClick={(event) => event.stopPropagation()}>
        <div className="version-head">
          <div>
            <p className="version-eyebrow">Version history</p>
            <h3>{file.name}</h3>
          </div>
          <button className="icon-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {loading ? (
          <div className="version-empty">
            <Loader2 size={18} className="spin" />
            <span>Loading versions...</span>
          </div>
        ) : (
          <div className="version-list">
            {versions.map((version) => (
              <article key={version.id} className="version-item">
                <div>
                  <strong>Version {version.versionNumber}</strong>
                  <span>{formatDate(version.uploadedAt)} • {version.size}</span>
                </div>
                {version.isCurrentVersion ? (
                  <em className="success-chip">Current</em>
                ) : (
                  <button className="ghost-btn" onClick={() => restoreVersion(version.id)}>
                    <RotateCcw size={16} />
                    Restore
                  </button>
                )}
              </article>
            ))}
          </div>
        )}

        <div className="version-foot">
          <div className="status-chip">
            <History size={16} />
            Uploading the same file name now creates a new recoverable version.
          </div>
        </div>
      </div>
    </div>
  );
}
