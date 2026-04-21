import { useEffect, useState } from "react";
import axios from "axios";
import { Loader2, MessageSquare, Send } from "lucide-react";
import { toast } from "react-toastify";
import "./shareChatPanel.css";

const formatTime = (value) =>
  new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(value));

export default function ShareChatPanel({ backendUrl, endpointBase, title, emptyLabel = "No messages yet. Start the conversation." }) {
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    const loadMessages = async () => {
      if (!endpointBase) return;
      setLoading(true);
      try {
        const { data } = await axios.get(`${backendUrl}${endpointBase}`);
        if (data.success) {
          setMessages(data.messages || []);
        } else {
          toast.error(data.message || "Unable to load messages.");
        }
      } catch (error) {
        toast.error("Unable to load messages.");
      } finally {
        setLoading(false);
      }
    };

    loadMessages();
  }, [backendUrl, endpointBase]);

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!draft.trim()) return;

    setSending(true);
    try {
      const { data } = await axios.post(`${backendUrl}${endpointBase}`, { body: draft });
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
    <section className="share-chat-panel">
      <div className="share-chat-header">
        <div>
          <p className="chat-eyebrow">Conversation</p>
          <h3>{title || "Chat"}</h3>
        </div>
      </div>

      <div className="share-chat-messages">
        {loading ? (
          <div className="chat-empty">
            <Loader2 size={18} className="spin" />
            <span>Loading messages...</span>
          </div>
        ) : messages.length === 0 ? (
          <div className="chat-empty">
            <MessageSquare size={18} />
            <span>{emptyLabel}</span>
          </div>
        ) : (
          messages.map((message) => (
            <article key={message.id} className="chat-bubble">
              <div className="chat-meta">
                <strong>{message.sender?.name || "User"}</strong>
                <span>{formatTime(message.createdAt)}</span>
              </div>
              <p>{message.body}</p>
            </article>
          ))
        )}
      </div>

      <form className="share-chat-form" onSubmit={sendMessage}>
        <input value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="Write a message" />
        <button type="submit" disabled={sending}>
          {sending ? <Loader2 size={16} className="spin" /> : <Send size={16} />}
          Send
        </button>
      </form>
    </section>
  );
}
