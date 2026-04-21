import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { Globe2, Inbox, Loader2, RefreshCw, Users } from "lucide-react";
import { toast } from "react-toastify";
import SharedInbox from "./SharedInbox";
import PublicGroupPanel from "./PublicGroupPanel";
import PublicShareBoard from "./PublicShareBoard";
import GroupWorkspacePanel from "./GroupWorkspacePanel";
import "./shareWorkspace.css";

export default function ShareWorkspace({ backendUrl }) {
  const [received, setReceived] = useState([]);
  const [sent, setSent] = useState([]);
  const [publicShares, setPublicShares] = useState([]);
  const [groupShares, setGroupShares] = useState([]);
  const [groups, setGroups] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [tab, setTab] = useState("shares");

  const loadWorkspace = useCallback(async (useRefreshState = false) => {
    if (useRefreshState) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }

    try {
      const [shareResponse, groupResponse] = await Promise.all([
        axios.get(`${backendUrl}/api/share/inbox`),
        axios.get(`${backendUrl}/api/share/groups`)
      ]);

      if (shareResponse.data.success) {
        setReceived(shareResponse.data.received || []);
        setSent(shareResponse.data.sent || []);
        setPublicShares(shareResponse.data.publicShares || []);
        setGroupShares(shareResponse.data.groupShares || []);
      } else {
        toast.error(shareResponse.data.message || "Unable to load sharing workspace.");
      }

      if (groupResponse.data.success) {
        setGroups(groupResponse.data.groups || []);
      } else {
        toast.error(groupResponse.data.message || "Unable to load groups.");
      }
    } catch (error) {
      toast.error("Unable to load sharing workspace.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [backendUrl]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  return (
    <section className="share-workspace">
      <div className="share-workspace-header">
        <div>
          <p className="share-workspace-eyebrow">Sharing Workspace</p>
          <h2>Direct shares, public file drops, manual groups, and open chat spaces</h2>
        </div>

        <button onClick={() => loadWorkspace(true)} disabled={refreshing || loading}>
          {refreshing ? <Loader2 size={16} className="spin" /> : <RefreshCw size={16} />}
          Refresh
        </button>
      </div>

      <div className="share-workspace-tabs wrap">
        <button className={tab === "shares" ? "active" : ""} onClick={() => setTab("shares")}>
          <Inbox size={16} />
          Direct Shares
        </button>
        <button className={tab === "public-files" ? "active" : ""} onClick={() => setTab("public-files")}>
          <Globe2 size={16} />
          Public Files
        </button>
        <button className={tab === "groups" ? "active" : ""} onClick={() => setTab("groups")}>
          <Users size={16} />
          Groups
        </button>
        <button className={tab === "public-room" ? "active" : ""} onClick={() => setTab("public-room")}>
          <Users size={16} />
          Public Group Chat
        </button>
      </div>

      {loading ? (
        <div className="share-workspace-empty">
          <Loader2 size={18} className="spin" />
          <span>Loading sharing workspace...</span>
        </div>
      ) : tab === "shares" ? (
        <SharedInbox backendUrl={backendUrl} received={received} sent={sent} refreshShares={() => loadWorkspace(true)} />
      ) : tab === "public-files" ? (
        <PublicShareBoard backendUrl={backendUrl} publicShares={publicShares} />
      ) : tab === "groups" ? (
        <GroupWorkspacePanel backendUrl={backendUrl} groups={groups} groupShares={groupShares} refreshAll={() => loadWorkspace(true)} />
      ) : (
        <PublicGroupPanel backendUrl={backendUrl} />
      )}
    </section>
  );
}
