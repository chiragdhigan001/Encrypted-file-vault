<div align="center">
  <h1>🔒 Secure Vault</h1>
  <p><strong>Zero-Knowledge, Client-Side Encrypted File Storage Platform</strong></p>
  <p>
    <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React 19">
    <img src="https://img.shields.io/badge/Express-5-000000?logo=express" alt="Express 5">
    <img src="https://img.shields.io/badge/MongoDB-Mongoose-47A248?logo=mongodb" alt="MongoDB">
    <img src="https://img.shields.io/badge/AES--256--GCM-Encryption-00C853" alt="AES-256-GCM">
    <img src="https://img.shields.io/badge/license-MIT-blue" alt="License">
  </p>
</div>

---

## Overview

Secure Vault is a full-stack, **zero-knowledge file storage platform**. Files are encrypted in your browser **before** they reach the server — the backend never sees plaintext content or encryption keys. Built with a MERN stack (Express 5, MongoDB, React 19, Node.js) and the Web Crypto API.

> "Zero-knowledge" means even if the server is compromised, attackers cannot read your files — they only hold encrypted blobs and wrapped cryptographic material.

---

## Screenshots

> *Screenshots coming soon. To add your own: capture the landing page, vault dashboard, upload modal, share workspace, and security center, then place them in a `screenshots/` folder and link below.*

```
📁 screenshots/
├── home-dark.png          ← Home/landing page
├── vault-dashboard.png    ← Vault file listing
├── upload-modal.png       ← Upload with encryption badge
├── share-modal.png        ← Direct/public/group sharing
├── security-center.png    ← MFA, sessions, audit logs
└── pricing.png            ← Tiered storage plans
```

---

## Features

### 🔐 Client-Side Encryption
- **AES-256-GCM** per-file Data Encryption Keys (DEK)
- **PBKDF2-SHA-256** (210,000 iterations) vault key derivation
- **Envelope encryption**: DEK wrapped with vault key, stored server-side
- **SHA-256 integrity hash** verification on download
- Local decryption for preview and download — plaintext never touches the server

### 📁 File Management
- Drag-and-drop upload with folder organization (Documents, Personal, Security, Work, Other)
- File versioning — multiple versions preserved, restore any previous version
- In-browser preview for images, PDFs, and text files
- Soft delete with 30-day trash retention
- Permanent purge or restore from trash

### 🔗 Secure Sharing
- **Direct share** — share with specific users by name search
- **Public share** — visible to all authenticated users
- **Group share** — share with all group members
- Optional **share password** (separate from vault password)
- **Expiry** (hours-based) and **one-time access** controls
- Per-share conversation threads
- Revoke shares with access tracking

### 👥 Group Collaboration
- Create groups with auto-generated invite links
- Role-based: Owner, Admin (manage members & files), Member
- Group-level file sharing and dedicated group chat

### 🛡️ Security & Compliance
- **Multi-Factor Authentication** (TOTP via authenticator apps) with recovery codes
- **Session management** — list, rotate, and revoke active sessions
- **Audit logging** — all actions (login, upload, share, delete) logged
- **Role-Based Access Control** — User, Admin, Auditor, Team Owner
- Rate-limited API endpoints
- CORS-secured, `x-powered-by` disabled

### 💾 Storage Plans
| Plan | Price | Limit |
|------|-------|-------|
| Free | $0 | 1 GB |
| Basic | $10/mo | 10 GB |
| Pro | $100/mo | 100 GB |

- Real-time usage bar in vault dashboard
- Upgrade via pricing modal; paid plans go through checkout flow

---

## Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                    BROWSER (React 19)                    │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Vault Key   │    │  Web Crypto  │                   │
│  │  (PBKDF2)    │───▶│  AES-GCM     │──▶ encrypted blob │
│  └──────────────┘    └──────────────┘                   │
│         │                                                │
│         ▼                                                │
│  ┌──────────────┐                                        │
│  │  Encrypted   │─── POST /api/vault/upload ──────────▶  │
│  │  Blob + DEK  │    (wrapped DEK, IVs, hash)           │
│  └──────────────┘                                        │
└─────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────┐
│                   SERVER (Express 5)                     │
│                                                         │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Auth Guard  │───▶│   Multer     │──▶ uploads/       │
│  │  (JWT)       │    └──────────────┘   (encrypted)     │
│  └──────────────┘                                       │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  MongoDB     │◀───│  Controllers │                   │
│  │  (Mongoose)  │    └──────────────┘                   │
│  └──────────────┘                                       │
│  ┌──────────────┐    ┌──────────────┐                   │
│  │  Rate Limit  │    │  Audit Log   │                   │
│  └──────────────┘    └──────────────┘                   │
└─────────────────────────────────────────────────────────┘
```

### Key Cryptographic Flow

1. **Vault Setup** — User creates a vault password. Browser derives a 64-byte secret via PBKDF2 (210k iterations). First 32 bytes = **vault key** (stays in browser). Last 32 bytes = **auth verifier** (sent to server for storage).

2. **File Upload** — A random 256-bit **Data Encryption Key (DEK)** is generated per file. The file is encrypted with AES-256-GCM using the DEK + random IV. The DEK is then **wrapped** (encrypted) with the vault key + separate IV. Only the encrypted blob and wrapped DEK are uploaded.

3. **File Download** — The server returns the encrypted blob + wrapped DEK. The browser unwraps the DEK using the vault key, then decrypts the file. SHA-256 integrity hash is verified against the plaintext.

---

## Tech Stack

### Frontend
| Technology | Purpose |
|------------|---------|
| React 19 | UI framework |
| Vite (rolldown-vite) | Build tool |
| React Router DOM v7 | Client routing |
| Axios | HTTP client |
| Framer Motion | Animations |
| Lucide React | Icons |
| React Toastify | Notifications |
| Web Crypto API | Client-side encryption |
| CryptoJS (legacy) | Fallback hashing |

### Backend
| Technology | Purpose |
|------------|---------|
| Express 5 | Web framework |
| Mongoose 9 | MongoDB ODM |
| JSON Web Token | Auth tokens (access + refresh) |
| bcryptjs | Password hashing |
| Multer | File upload handling |
| Nodemailer | Email (OTP, alerts) |
| otplib | TOTP (MFA) |
| Google Auth Library | Google OAuth verification |

### Infrastructure
| Component | Tech |
|-----------|------|
| Database | MongoDB (Atlas) |
| Auth | JWT + session rotation |
| File storage | Local filesystem (`uploads/`) |
| Rate limiting | In-memory |
| Logging | Custom structured logger |

---

## Project Structure

```
encrypt-file/
├── backend/
│   ├── config/
│   │   ├── db.js              # MongoDB connection
│   │   └── nodemailer.js      # Email transport
│   ├── controllers/
│   │   ├── authControllers.js # Register, login, verify, reset
│   │   ├── vaultController.js # File CRUD, upload, trash, versions
│   │   ├── shareController.js # Shares, groups, messages
│   │   ├── securityController.js # MFA, sessions, audit, admin
│   │   └── userController.js  # Profile, search, payment/plans
│   ├── middleware/
│   │   ├── userAuth.js        # JWT + refresh token auth
│   │   ├── multer.js          # File upload config
│   │   ├── rateLimit.js       # Rate limiting
│   │   ├── requestContext.js  # Request-scoped context
│   │   ├── requirePermission.js # RBAC enforcement
│   │   └── shareUpload.js     # Share-specific upload
│   ├── models/
│   │   ├── userModel.js
│   │   ├── filemodel.js
│   │   ├── fileShareModel.js
│   │   ├── sessionModel.js
│   │   ├── groupModel.js
│   │   ├── chatMessageModel.js
│   │   ├── auditLogModel.js
│   │   └── unlockVaultModel.js
│   ├── routes/
│   │   ├── authRoutes.js      # POST /api/auth/*
│   │   ├── vaultRouter.js     # GET/POST /api/vault/*
│   │   ├── shareRoutes.js     # GET/POST /api/share/*
│   │   ├── securityRoutes.js  # GET/POST /api/security/*
│   │   └── userRoutes.js      # GET/POST /api/user/*
│   ├── utils/
│   │   ├── vaultCrypto.js     # Server-side PBKDF2 verifier
│   │   ├── storagePlans.js    # Plan definitions & helpers
│   │   ├── auditLog.js        # Audit log helper
│   │   ├── authSession.js     # Session issue/rotate/resolve
│   │   ├── rbac.js            # Role/permission definitions
│   │   └── logger.js          # Structured logger
│   ├── infra/storage/
│   │   └── localStorage.js    # Disk storage adapter
│   ├── uploads/               # Encrypted file storage
│   ├── index.js               # Server entry point
│   └── package.json
│
├── frontend/
│   ├── src/
│   │   ├── main.jsx           # React entry point
│   │   ├── App.jsx            # Router configuration
│   │   ├── context/
│   │   │   └── AppContext.jsx # Global state (auth, vault)
│   │   ├── components/
│   │   │   └── HomeStyles.jsx # Styled components
│   │   ├── pages/
│   │   │   ├── Home.jsx       # Landing page
│   │   │   ├── Docs.jsx       # Documentation page
│   │   │   ├── Login.jsx      # Login / Register
│   │   │   ├── EmailVerify.jsx# Email OTP verification
│   │   │   ├── ResetPassword.jsx # Password reset
│   │   │   ├── Logout.jsx     # Logout handler
│   │   │   └── Footer.jsx     # Site footer
│   │   └── working/           # All workspace components
│   │       ├── vaultCrypto.js # Core client encryption
│   │       ├── shareCrypto.js # Share crypto operations
│   │       ├── VaultDashBoard.jsx # Main vault UI
│   │       ├── UnlockScreen.jsx   # Vault unlock
│   │       ├── UploadModal.jsx    # Upload with encryption
│   │       ├── FileList.jsx       # File listing
│   │       ├── FileShareModal.jsx # Share creation
│   │       ├── ShareModal.jsx     # Share management
│   │       ├── ShareWorkspace.jsx # Shared files workspace
│   │       ├── SharedInbox.jsx    # Inbox of received shares
│   │       ├── SecurityCenterPanel.jsx # MFA, sessions, audit
│   │       ├── TrashPanel.jsx     # Trash management
│   │       ├── VersionHistoryModal.jsx # Version browsing
│   │       ├── GroupWorkspacePanel.jsx  # Group collaboration
│   │       ├── ShareChatPanel.jsx  # Per-share chat
│   │       ├── PublicShareBoard.jsx # Public share board
│   │       ├── PublicGroupPanel.jsx # Public groups/messages
│   │       ├── CreateGroupModal.jsx # Group creation
│   │       ├── PricingModal.jsx    # Plan selection
│   │       ├── CheckoutModal.jsx   # Payment checkout
│   │       └── *.css files        # Styles per component
│   ├── index.html
│   ├── vite.config.js
│   └── package.json
│
├── README.md
└── .gitignore
```

---

## Setup

### Prerequisites
- **Node.js** 18+
- **MongoDB** (local or Atlas)
- **npm**

### 1. Clone & Install

```bash
git https://github.com/chiragdhigan001/Encrypted-file-vault.git
cd Encrypted-file-vault
```

### 2. Backend Setup

```bash
cd backend
npm install

# Create backend/.env (see Environment Variables below)
npm start
```

Server starts at `http://localhost:8000`.

### 3. Frontend Setup

```bash
cd frontend
npm install

# Create frontend/.env (see Environment Variables below)
npm run dev
```

App runs at `http://localhost:5173`.

### Environment Variables

**`backend/.env`**
```env
PORT=8000
MONGO_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret
NODE_ENV=development
SMTP_USER=your_smtp_user
SMTP_KEY=your_smtp_key
SENDER_EMAIL=sender@example.com
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
```

**`frontend/.env`**
```env
VITE_BACKEND_URL=http://localhost:8000
VITE_GOOGLE_CLIENT_ID=your_google_client_id
VITE_GOOGLE_CLIENT_SECRET=your_google_client_secret
```

---

## API Overview

| Group | Prefix | Endpoints |
|-------|--------|-----------|
| Auth | `/api/auth` | `register`, `login`, `logout`, `verify-account`, `reset-password` |
| Vault | `/api/vault` | `upload`, `files`, `trash`, `download`, `delete`, `restore`, `purge`, `versions`, `storage-info` |
| Share | `/api/share` | `create`, `revoke`, `inbox`, `groups`, `messages`, `public` |
| User | `/api/user` | `data`, `search`, `upgrade-plan`, `process-payment` |
| Security | `/api/security` | `mfa/setup`, `mfa/enable`, `sessions`, `audit`, `admin/users` |

Full details in each router file under `backend/routes/`.

---

## Security Considerations

- **⚠️ `.env` files**: These currently contain live credentials and are partially gitignored (the frontend `.env` is missed due to `.gitignore` typo). Rotate secrets and fix `.gitignore` before public deployment.
- **Rate limiting**: In-memory — resets on server restart. Use a persistent store (Redis) for production.
- **File storage**: Local disk only (`uploads/`). Cloud storage adapters (S3, GCS) are not yet implemented.
- **No TTL indexes** on sessions or audit logs — consider adding them for production.
- **Client-side encryption** depends on the Web Crypto API. The legacy CryptoJS fallback is less secure.

---

## License

MIT

---


Built with ❤️ using the MERN stack & Web Crypto API

