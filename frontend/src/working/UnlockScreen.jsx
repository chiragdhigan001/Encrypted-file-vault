import { Lock, Shield, Loader2 } from "lucide-react";
import "./unlockScreen.css";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext"; 
import { toast } from "react-toastify";

const UnlockScreen = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const navigate = useNavigate();
  const { backendUrl } = useContext(AppContext);

  const handleAction = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isNewUser ? "/api/vault/set-password" : "/api/vault/unlock";

    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backendUrl + endpoint, { vaultPassword: password });

      if (data.success) {
        toast.success(data.message);
        navigate("/vault");
      } else {
        // If the backend says not initialized, we switch to "Set Password" mode
        if (data.message.includes("not initialized")) {
          setIsNewUser(true);
          setError("Vault not found. Set a new master password.");
        } else {
          setError(data.message);
        }
      }
    } catch (err) {
      toast.error("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unlock-container">
      <div className="vault-card">
        <div className="vault-header">
          <Shield className={`Shield-icon ${loading ? 'spinning' : ''}`} />
          <h1 className="vault-title">{isNewUser ? "Initialize Vault" : "Encrypted Vault"}</h1>
          <p className="vault-subtitle">
            {isNewUser ? "Choose a master key to secure your files" : "Enter your master password to unlock"}
          </p>
        </div>

        <form className="unlock-form" onSubmit={handleAction}>
          <div className="input-grp">
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                className="vault-input"
                placeholder={isNewUser ? "Set master password" : "Enter password"}
                value={password}
                disabled={loading}
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
            {error && <p className="error-text">{error}</p>}
          </div>
          
          <button type="submit" className="unlock-button" disabled={loading}>
            {loading ? <Loader2 className="animate-spin" /> : (isNewUser ? "Initialize" : "Unlock Vault")}
          </button>
        </form>

        <div className="encryption-notice">
          <p className="notice-text">AES-256 Military Grade Encryption</p>
        </div>
      </div>
    </div>
  );
};

export default UnlockScreen;