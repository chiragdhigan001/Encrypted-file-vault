# AI-Powered Zero-Knowledge Secure Document Vault

An enterprise-oriented MERN application for secure document storage, client-side encryption, controlled sharing, collaboration, and security governance.

This project started as `Encrypt File Vault` and has been upgraded toward a SaaS-style secure document platform with:
- browser-side file encryption
- zero-knowledge-style vault key flow
- encrypted file storage
- file sharing with access controls
- group collaboration
- session-aware authentication
- MFA support
- audit logging
- soft delete and version history
- local privacy-preserving document intelligence

## Features

### Core Vault
- User registration and login
- Vault password setup and unlock flow
- Browser-side file encryption before upload
- AES-256-GCM encryption for new vault uploads
- Integrity verification for uploaded files
- Encrypted storage on disk
- Local decryption for preview and download
- Secure preview for text, image, and PDF files

### Security
- Access token + refresh token session flow
- Session rotation and session persistence
- Session/device listing
- Session revocation
- MFA setup with authenticator apps
- Recovery codes
- Google login scaffold
- Audit logging for major actions
- Role-based permissions foundation
- Request security headers
- Basic API rate limiting
- Health check endpoint

### File Lifecycle
- Soft delete / trash
- Restore from trash
- Permanent purge
- Version history
- Restore previous version
- Retention window metadata

### Sharing and Collaboration
- Direct file sharing by searching users
- Optional share password separate from vault password
- Public file sharing
- Group-based file sharing
- Group creation and join by invite token/link
- Group roles: owner, admin, member
- Group leave / delete controls
- Public chat and share conversations
- Share expiry support
- One-time access support
- Share revoke metadata
- Download/access history on shares

### AI-Assisted Metadata
- Local document classification at upload time
- Sensitive-content tagging heuristics
- Category tagging
- Local summary generation for text-based files
- Search enhanced by AI metadata and extracted preview text

## Tech Stack

### Frontend
- React
- Vite
- Axios
- Framer Motion
- React Router
- React Toastify
- Web Crypto API

### Backend
- Node.js
- Express
- MongoDB
- Mongoose
- JWT
- Multer
- Nodemailer
- Otplib
- Google Auth Library

## Project Structure

```text
encrypt-file/
  backend/
    config/
    controllers/
    infra/
      storage/
    middleware/
    models/
    routes/
    utils/
    index.js
  frontend/
    src/
      context/
      pages/
      working/
      App.jsx


Important Modules
Backend
backend/controllers/authControllers.js
backend/controllers/vaultController.js
backend/controllers/shareController.js
backend/controllers/securityController.js
backend/middleware/userAuth.js
backend/middleware/requirePermission.js
backend/middleware/rateLimit.js
backend/models/filemodel.js
backend/models/fileShareModel.js
backend/models/sessionModel.js
backend/models/auditLogModel.js
Frontend
frontend/src/working/UnlockScreen.jsx
frontend/src/working/UploadModal.jsx
frontend/src/working/VaultDashBoard.jsx
frontend/src/working/FileShareModal.jsx
frontend/src/working/SecurityCenterPanel.jsx
frontend/src/working/TrashPanel.jsx
frontend/src/working/VersionHistoryModal.jsx
frontend/src/working/vaultCrypto.js
frontend/src/working/aiAssist.js
How It Works
Vault Encryption Flow
User signs in.
User initializes or unlocks the vault.
Vault secrets are derived in the browser.
Each uploaded file gets its own DEK.
File content is encrypted in the browser with AES-256-GCM.
The DEK is wrapped before upload.
The backend stores only encrypted file content plus encryption metadata.
Files are decrypted locally when previewed or downloaded.
Sharing Flow
A vault file is decrypted locally.
A separate encrypted share copy is generated.
The share can be direct, public, or group-based.
Optional share password can protect the shared copy.
Shares can carry expiry or one-time-access rules.
Recipients access the encrypted share through the sharing workspace.
Setup
Prerequisites
Node.js 18+
MongoDB
npm
Backend Setup
cd backend
npm install
npm start
Frontend Setup
cd frontend
npm install
npm run dev
