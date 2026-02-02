import { Lock, Shield } from "lucide-react";
import "./unlockScreen.css";
import { useState } from "react";

const UnlockScreen = () => {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleUnlock = (e) => {
    e.preventDefault();
    if (password.length < 4) {
      setError("Password must be at least 4 characters long");
      return;
    }
  };

  return (
    <div className="unlock-container">
      <div className="vault-card">
        <div className="vault-header">
          <Shield className="Shield-icon" />
          <h1 className="vault-title">Encrypted Vault</h1>
          <p className="vault-subtitle">Enter your password to unlock</p>
        </div>

        <form className="unlock-form" onSubmit={handleUnlock}>
          <div className="input-grp">
            <div className="input-wrapper">
              <Lock className="input-icon" />
              <input
                type="password"
                className="vault-input"
                placeholder="Enter password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
              />
            </div>
            {error && <p className="error-text"> {error}</p>}
          </div>
          <button type="submit" className="unlock-button">
            Unlock Vault
          </button>
        </form>

        <div className="encryption-notice">
          <p className="notice-text">
            All files are encrypted with AES-256 encryption
          </p>
        </div>
      </div>
    </div>
  );
};

export default UnlockScreen;
