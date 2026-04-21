import { Lock, Shield, Loader2, Sparkles, Layers3 } from "lucide-react";
import { motion } from "framer-motion";
import "./unlockScreen.css";
import { useState, useContext } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { AppContext } from "../context/AppContext";
import CryptoJS from "crypto-js";
import { toast } from "react-toastify";

const containerMotion = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08
    }
  }
};

const riseMotion = {
  hidden: { opacity: 0, y: 22 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.5,
      ease: "easeOut"
    }
  }
};

const UnlockScreen = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [isNewUser, setIsNewUser] = useState(false);

  const navigate = useNavigate();
  const { backendUrl, setMasterKey } = useContext(AppContext);

  const handleAction = async (event) => {
    event.preventDefault();
    setLoading(true);
    setError("");

    const endpoint = isNewUser ? "/api/vault/set-password" : "/api/vault/unlock";

    try {
      axios.defaults.withCredentials = true;
      const { data } = await axios.post(backendUrl + endpoint, {
        vaultPassword: password
      });

      if (data.success) {
        const derivedKey = CryptoJS.SHA256(password).toString();
        setMasterKey(derivedKey);
        toast.success(data.message);
        navigate("/vault");
      } else if (data.message.includes("not initialized")) {
        setIsNewUser(true);
        setError("Vault not found. Set a new master password.");
      } else {
        setError(data.message);
      }
    } catch (error_) {
      toast.error("Connection error. Try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="unlock-scene">
      <div className="unlock-orb unlock-orb-left" />
      <div className="unlock-orb unlock-orb-right" />
      <div className="unlock-grid" />

      <motion.div className="unlock-container" variants={containerMotion} initial="hidden" animate="show">
        <motion.div className="unlock-side-panel" variants={riseMotion}>
          <div className="side-badge">
            <Sparkles size={16} />
            Secure Access Layer
          </div>

          <h1 className="side-title">
            Enter the vault through a calm, protected gateway.
          </h1>

          <p className="side-copy">
            Your files stay encrypted at rest, and the vault key is derived only after a successful unlock. The interface now adds subtle motion and depth, but keeps the experience lightweight and focused.
          </p>

          <div className="side-feature-list">
            <div className="side-feature">
              <Shield size={18} />
              <span>Client-side key derivation before vault access</span>
            </div>
            <div className="side-feature">
              <Layers3 size={18} />
              <span>Soft layered 3D card effect with low visual weight</span>
            </div>
            <div className="side-feature">
              <Lock size={18} />
              <span>Separate initialization flow for first-time vault setup</span>
            </div>
          </div>
        </motion.div>

        <motion.div className="vault-card-shell" variants={riseMotion}>
          <div className="vault-card-depth vault-card-depth-back" />
          <div className="vault-card-depth vault-card-depth-mid" />

          <motion.div
            className="vault-card"
            whileHover={{ rotateX: -4, rotateY: 5, y: -4 }}
            transition={{ type: "spring", stiffness: 180, damping: 18 }}
          >
            <div className="vault-card-glow" />

            <motion.div className="vault-header" variants={riseMotion}>
              <motion.div
                className="vault-icon-wrap"
                animate={{ rotate: loading ? 180 : 0, scale: loading ? 1.04 : 1 }}
                transition={{ duration: 0.6, ease: "easeInOut" }}
              >
                <Shield className={`shield-icon ${loading ? "spinning" : ""}`} />
              </motion.div>

              <h1 className="vault-title">
                {isNewUser ? "Initialize Vault" : "Encrypted Vault"}
              </h1>
              <p className="vault-subtitle">
                {isNewUser
                  ? "Create a master key to start protecting your private files."
                  : "Enter your vault password to unlock secure storage."}
              </p>
            </motion.div>

            <motion.form className="unlock-form" onSubmit={handleAction} variants={riseMotion}>
              <div className="input-group">
                <label className="field-label">
                  {isNewUser ? "New master password" : "Vault password"}
                </label>
                <div className="input-wrapper">
                  <Lock className="input-icon" />
                  <input
                    type="password"
                    className="vault-input"
                    placeholder={isNewUser ? "Set master password" : "Enter password"}
                    value={password}
                    disabled={loading}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                </div>
                {error && <p className="error-text">{error}</p>}
              </div>

              <button type="submit" className="unlock-button" disabled={loading}>
                {loading ? (
                  <>
                    <Loader2 className="button-spinner" />
                    Working...
                  </>
                ) : isNewUser ? (
                  "Initialize Vault"
                ) : (
                  "Unlock Vault"
                )}
              </button>
            </motion.form>

            <motion.div className="encryption-notice" variants={riseMotion}>
              <p className="notice-label">Protection Standard</p>
              <p className="notice-text">AES-256 encryption with derived vault key access</p>
            </motion.div>
          </motion.div>
        </motion.div>
      </motion.div>
    </div>
  );
};

export default UnlockScreen;
