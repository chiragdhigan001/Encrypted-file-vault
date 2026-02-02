import { Lock } from "lucide-react";

const VaultDashBoard = () => {
  return (
    <div className='vault-layout'>
        {/* Header */}
        <header className='vault-header'>
            <div className="header-container">
                <div className="header-brand">
                    <Lock className="lock-icon" />
                </div>
                <div className="brand-text">
                    <h1>Encrypted Vault</h1>
                    <span className="stats-text">
                        {myFiles.length} files • {sharedWithMeFiles.length} shared
                    </span>
                </div>
            </div>
            <button className="btn-lock" onClick={onLock}>
                Lock Vault
                
            </button>
        </header>
        </div>
  )
}

export default VaultDashBoard