import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Loader2, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "react-toastify";
import "./trashPanel.css";

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", { day: "2-digit", month: "short", year: "numeric" }).format(date);
};

export default function TrashPanel({ backendUrl, onRestored }) {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadTrash = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await axios.get(`${backendUrl}/api/vault/trash`);
      if (data.success) {
        setFiles(data.files || []);
      }
    } catch (error) {
      toast.error("Unable to load trash.");
    } finally {
      setLoading(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadTrash();
  }, [loadTrash]);

  const restoreFile = async (fileId) => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/vault/restore/${fileId}`);
      if (data.success) {
        toast.success(data.message);
        setFiles((current) => current.filter((file) => file.id !== fileId));
        onRestored?.(data.file);
      } else {
        toast.error(data.message || "Unable to restore file.");
      }
    } catch (error) {
      toast.error("Unable to restore file.");
    }
  };

  const purgeFile = async (fileId) => {
    try {
      const { data } = await axios.delete(`${backendUrl}/api/vault/purge/${fileId}`);
      if (data.success) {
        toast.success(data.message);
        setFiles((current) => current.filter((file) => file.id !== fileId));
      } else {
        toast.error(data.message || "Unable to purge file.");
      }
    } catch (error) {
      toast.error("Unable to purge file.");
    }
  };

  return (
    <section className="trash-panel">
      <div className="trash-head">
        <div>
          <p className="trash-eyebrow">Trash & retention</p>
          <h3>Soft-deleted files stay recoverable until their retention window ends</h3>
        </div>
      </div>

      {loading ? (
        <div className="trash-empty">
          <Loader2 size={18} className="spin" />
          <span>Loading trash...</span>
        </div>
      ) : files.length === 0 ? (
        <div className="trash-empty">
          <span>No deleted files right now.</span>
        </div>
      ) : (
        <div className="trash-list">
          {files.map((file) => (
            <article key={file.id} className="trash-item">
              <div>
                <strong>{file.name}</strong>
                <span>Deleted {formatDate(file.deletedAt)} • Purges {formatDate(file.retentionExpiresAt)}</span>
              </div>
              <div className="trash-actions">
                <button className="ghost-btn" onClick={() => restoreFile(file.id)}>
                  <RotateCcw size={16} />
                  Restore
                </button>
                <button className="danger-outline-btn" onClick={() => purgeFile(file.id)}>
                  <Trash2 size={16} />
                  Purge
                </button>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
