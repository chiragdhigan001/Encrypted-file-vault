import { useEffect, useState } from "react";
import axios from "axios";
import { Globe2, Loader2, Send } from "lucide-react";
import { toast } from "react-toastify";
import "./publicGroupPanel.css";

const formatTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export default function PublicGroupPanel({ backendUrl }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadPublicMessages = async () => {
      setLoading(true);
      try {
        const { data } = await axios.get(`${backendUrl}/api/share/public/messages`);
        if (data.success) {
          setMessages(data.messages || []);
        } else {
          toast.error(data.message || "Unable to load public room.");
        }
      } catch (error) {
        toast.error("Unable to load public room.");
      } finally {
        setLoading(false);
      }
    };

    loadPublicMessages();
  }, [backendUrl]);

  const sendPublicMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    try {
      const { data } = await axios.post(`${backendUrl}/api/share/public/messages`, {
        body: draft
      });

      if (data.success) {
        setMessages((current) => [...current, data.message]);
        setDraft("");
      } else {
        toast.error(data.message || "Unable to send message.");
      }
    } catch (error) {
      toast.error("Unable to send message.");
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="public-room-panel">
      <div className="public-room-header">
        <div>
          <p className="room-eyebrow">Public Group</p>
          <h3>Open room for all vault users</h3>
        </div>
        <div className="public-room-badge">
          <Globe2 size={16} />
          Shared community chat
        </div>
      </div>

      <div className="public-room-feed">
        {loading ? (
          <div className="public-room-empty">
            <Loader2 size={18} className="spin" />
            <span>Loading public messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="public-room-empty">
            <Globe2 size={18} />
            <span>No public messages yet.</span>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="public-message-card">
              <div className="public-message-meta">
                <strong>{message.sender?.name || "User"}</strong>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="public-room-form" onSubmit={sendPublicMessage}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write to the public group" />
        <button type="submit" disabled={sending}>
          {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          Post
        </button>
      </form>
    </section>
  );
}
