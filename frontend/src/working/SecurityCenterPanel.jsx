import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import {
  AlertTriangle,
  CheckCircle2,
  Copy,
  History,
  KeyRound,
  Loader2,
  Shield,
  Smartphone,
  Trash2
} from "lucide-react";
import { toast } from "react-toastify";
import "./securityCenterPanel.css";

const formatDate = (value) => {
  if (!value) return "Unknown";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(date);
};

export default function SecurityCenterPanel({ backendUrl, userData }) {
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [mfaSetup, setMfaSetup] = useState(null);
  const [mfaCode, setMfaCode] = useState("");
  const [disableCode, setDisableCode] = useState("");
  const [disableRecoveryCode, setDisableRecoveryCode] = useState("");
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [auditSnapshot, setAuditSnapshot] = useState([]);
  const [adminUsers, setAdminUsers] = useState([]);

  const refreshOverview = useCallback(async () => {
    setLoading(true);
    try {
      const [{ data: overviewData }, snapshotResponse, usersResponse] = await Promise.all([
        axios.get(`${backendUrl}/api/security/overview`),
        userData?.permissions?.includes("audit")
          ? axios.get(`${backendUrl}/api/security/audit/snapshot`)
          : Promise.resolve({ data: { success: true, stats: [] } }),
        userData?.permissions?.includes("manage_users")
          ? axios.get(`${backendUrl}/api/security/admin/users`)
          : Promise.resolve({ data: { success: true, users: [] } })
      ]);

      if (overviewData.success) {
        setOverview(overviewData.overview);
      } else {
        toast.error(overviewData.message || "Unable to load security overview.");
      }

      if (snapshotResponse.data?.success) {
        setAuditSnapshot(snapshotResponse.data.stats || []);
      }
      if (usersResponse.data?.success) {
        setAdminUsers(usersResponse.data.users || []);
      }
    } catch (error) {
      toast.error("Unable to load security overview.");
    } finally {
      setLoading(false);
    }
  }, [backendUrl, userData?.permissions]);

  useEffect(() => {
    refreshOverview();
  }, [refreshOverview]);

  const riskTone = useMemo(() => {
    const score = overview?.riskScore || 0;
    if (score >= 80) return "good";
    if (score >= 60) return "watch";
    return "risk";
  }, [overview?.riskScore]);

  const handleBeginMfa = async () => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/security/mfa/setup`);
      if (data.success) {
        setMfaSetup(data.setup);
      } else {
        toast.error(data.message || "Unable to start MFA setup.");
      }
    } catch (error) {
      toast.error("Unable to start MFA setup.");
    }
  };

  const handleEnableMfa = async () => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/security/mfa/enable`, {
        otp: mfaCode
      });
      if (data.success) {
        setRecoveryCodes(data.recoveryCodes || []);
        setMfaSetup(null);
        setMfaCode("");
        toast.success(data.message);
        refreshOverview();
      } else {
        toast.error(data.message || "Unable to enable MFA.");
      }
    } catch (error) {
      toast.error("Unable to enable MFA.");
    }
  };

  const handleDisableMfa = async () => {
    try {
      const { data } = await axios.post(`${backendUrl}/api/security/mfa/disable`, {
        otp: disableCode,
        recoveryCode: disableRecoveryCode
      });
      if (data.success) {
        setDisableCode("");
        setDisableRecoveryCode("");
        toast.success(data.message);
        refreshOverview();
      } else {
        toast.error(data.message || "Unable to disable MFA.");
      }
    } catch (error) {
      toast.error("Unable to disable MFA.");
    }
  };

  const handleRevokeSession = async (sessionId) => {
    try {
      const { data } = await axios.delete(`${backendUrl}/api/security/sessions/${sessionId}`);
      if (data.success) {
        toast.success(data.message);
        refreshOverview();
      } else {
        toast.error(data.message || "Unable to revoke session.");
      }
    } catch (error) {
      toast.error("Unable to revoke session.");
    }
  };

  const copyCode = async (value) => {
    try {
      await navigator.clipboard.writeText(value);
      toast.success("Copied");
    } catch (error) {
      toast.error("Unable to copy");
    }
  };

  const updateUserRole = async (userId, role) => {
    try {
      const { data } = await axios.patch(`${backendUrl}/api/security/admin/users/${userId}/role`, { role });
      if (data.success) {
        toast.success("User role updated.");
        refreshOverview();
      } else {
        toast.error(data.message || "Unable to update role.");
      }
    } catch (error) {
      toast.error("Unable to update role.");
    }
  };

  if (loading) {
    return (
      <div className="security-center-panel">
        <div className="security-empty">
          <Loader2 size={18} className="spin" />
          <span>Loading security center...</span>
        </div>
      </div>
    );
  }

  return (
    <section className="security-center-panel">
      <div className="security-hero">
        <div>
          <p className="security-eyebrow">Security Center</p>
          <h2>Sessions, MFA, audit activity, and account trust signals in one place</h2>
        </div>
        <div className={`security-score ${riskTone}`}>
          <Shield size={18} />
          <div>
            <strong>{overview?.riskScore || 0}/100</strong>
            <span>Security score</span>
          </div>
        </div>
      </div>

      <div className="security-grid">
        <article className="security-card-panel">
          <div className="security-card-head">
            <div>
              <p className="security-card-label">Protection</p>
              <h3>Account hardening</h3>
            </div>
            {overview?.isMfaEnabled ? <CheckCircle2 size={18} /> : <AlertTriangle size={18} />}
          </div>

          <div className="security-stat-list">
            <div>
              <span>MFA</span>
              <strong>{overview?.isMfaEnabled ? "Enabled" : "Not enabled"}</strong>
            </div>
            <div>
              <span>Google login</span>
              <strong>{overview?.isGoogleConnected ? "Connected" : "Not connected"}</strong>
            </div>
            <div>
              <span>Role</span>
              <strong>{overview?.role || "user"}</strong>
            </div>
          </div>

          {!overview?.isMfaEnabled ? (
            <div className="security-action-stack">
              <button className="primary-btn" onClick={handleBeginMfa}>
                <KeyRound size={16} />
                Enable MFA
              </button>

              {mfaSetup && (
                <div className="mfa-setup-card">
                  <img src={mfaSetup.qrCodeDataUrl} alt="MFA QR Code" />
                  <p>Scan this QR code in your authenticator app or use the secret below.</p>
                  <div className="secret-inline">
                    <code>{mfaSetup.secret}</code>
                    <button onClick={() => copyCode(mfaSetup.secret)}>
                      <Copy size={14} />
                    </button>
                  </div>
                  <input
                    className="security-input"
                    value={mfaCode}
                    onChange={(event) => setMfaCode(event.target.value)}
                    placeholder="Enter the 6-digit code"
                  />
                  <button className="primary-btn" onClick={handleEnableMfa}>
                    Confirm MFA
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="security-action-stack">
              <input
                className="security-input"
                value={disableCode}
                onChange={(event) => setDisableCode(event.target.value)}
                placeholder="Current authenticator code"
              />
              <input
                className="security-input"
                value={disableRecoveryCode}
                onChange={(event) => setDisableRecoveryCode(event.target.value)}
                placeholder="Or a recovery code"
              />
              <button className="danger-outline-btn" onClick={handleDisableMfa}>
                <Trash2 size={16} />
                Disable MFA
              </button>
            </div>
          )}

          {recoveryCodes.length > 0 && (
            <div className="recovery-card">
              <p>Backup recovery codes</p>
              {recoveryCodes.map((code) => (
                <button key={code} className="recovery-code" onClick={() => copyCode(code)}>
                  <span>{code}</span>
                  <Copy size={13} />
                </button>
              ))}
            </div>
          )}
        </article>

        <article className="security-card-panel">
          <div className="security-card-head">
            <div>
              <p className="security-card-label">Sessions</p>
              <h3>Active devices</h3>
            </div>
            <Smartphone size={18} />
          </div>

          <div className="session-list">
            {(overview?.sessions || []).map((session) => (
              <div key={session.id} className="session-item">
                <div>
                  <strong>{session.isCurrent ? "Current session" : "Signed-in device"}</strong>
                  <span>{session.ipAddress || "Unknown IP"} • {formatDate(session.lastSeenAt)}</span>
                  <small>{session.userAgent || "Unknown device"}</small>
                </div>
                {!session.isCurrent && (
                  <button className="ghost-btn" onClick={() => handleRevokeSession(session.id)}>
                    Revoke
                  </button>
                )}
              </div>
            ))}
          </div>
        </article>
      </div>

      <div className="security-grid">
        <article className="security-card-panel">
          <div className="security-card-head">
            <div>
              <p className="security-card-label">Audit</p>
              <h3>Recent account activity</h3>
            </div>
            <History size={18} />
          </div>
          <div className="audit-list">
            {(overview?.recentAuditLogs || []).map((log) => (
              <div key={log._id} className="audit-item">
                <div>
                  <strong>{log.action.replaceAll("_", " ")}</strong>
                  <span>{formatDate(log.createdAt)}</span>
                </div>
                <em className={log.status === "success" ? "success-chip" : "danger-chip"}>
                  {log.status}
                </em>
              </div>
            ))}
          </div>
        </article>

        {userData?.permissions?.includes("audit") && (
          <article className="security-card-panel">
            <div className="security-card-head">
              <div>
                <p className="security-card-label">Governance</p>
                <h3>Audit snapshot</h3>
              </div>
              <Shield size={18} />
            </div>

            <div className="audit-snapshot-list">
              {auditSnapshot.map((row) => (
                <div key={row._id} className="snapshot-item">
                  <strong>{row._id}</strong>
                  <span>{row.total} total • {row.failures} failures</span>
                </div>
              ))}
            </div>
          </article>
        )}
      </div>

      {userData?.permissions?.includes("manage_users") && (
        <article className="security-card-panel">
          <div className="security-card-head">
            <div>
              <p className="security-card-label">Administration</p>
              <h3>Role management</h3>
            </div>
            <Shield size={18} />
          </div>

          <div className="admin-user-list">
            {adminUsers.map((user) => (
              <div key={user.id} className="admin-user-row">
                <div>
                  <strong>{user.name}</strong>
                  <span>{user.email}</span>
                  <small>
                    {user.isMfaEnabled ? "MFA enabled" : "MFA off"} • {user.isGoogleConnected ? "Google linked" : "Google not linked"}
                  </small>
                </div>
                <select value={user.role} onChange={(event) => updateUserRole(user.id, event.target.value)}>
                  <option value="user">user</option>
                  <option value="admin">admin</option>
                  <option value="auditor">auditor</option>
                  <option value="team_owner">team_owner</option>
                </select>
              </div>
            ))}
          </div>
        </article>
      )}
    </section>
  );
}
