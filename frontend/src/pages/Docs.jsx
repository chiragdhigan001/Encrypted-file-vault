import { motion } from "framer-motion";
import {
  Lock,
  Shield,
  Share2,
  Key,
  HardDrive,
  Users,
  FileText,
  BookOpen,
  ArrowRight,
  CheckCircle2,
  Server,
  Download,
  Upload
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import "./docs.css";

const sections = [
  {
    id: "overview",
    icon: BookOpen,
    title: "What is Secure Vault?",
    content: (
      <>
        <p>Secure Vault is a <strong>client-side encrypted file storage</strong> platform. Files are encrypted in your browser before they ever reach the server — meaning even we cannot read your data.</p>
        <p>Built with AES-256-GCM and PBKDF2 key derivation, it provides military-grade protection for sensitive documents, images, and any other files you need to store securely.</p>
      </>
    )
  },
  {
    id: "getting-started",
    icon: ArrowRight,
    title: "Getting Started",
    content: (
      <>
        <ol>
          <li><strong>Create an account</strong> — Register with your email and a strong password, or sign in with Google.</li>
          <li><strong>Verify your email</strong> — Check your inbox for a 6-digit OTP to activate your account.</li>
          <li><strong>Set your vault password</strong> — This is separate from your login. It derives your local encryption key.</li>
          <li><strong>Upload files</strong> — Files are encrypted in-browser before upload. Only encrypted blobs reach the server.</li>
          <li><strong>Share securely</strong> — Create share copies with optional passwords, expiry dates, and one-time access.</li>
        </ol>
      </>
    )
  },
  {
    id: "encryption",
    icon: Lock,
    title: "Encryption Architecture",
    content: (
      <>
        <p>Secure Vault uses a <strong>per-file envelope encryption</strong> scheme:</p>
        <ul>
          <li><strong>Vault Key</strong> — Derived from your vault password using PBKDF2 (210,000 iterations, SHA-256). Never sent to the server — only a verifier is stored.</li>
          <li><strong>Data Encryption Key (DEK)</strong> — A random 256-bit AES-GCM key generated for each file. Encrypts the file contents.</li>
          <li><strong>Wrapped DEK</strong> — The DEK is encrypted ("wrapped") with your Vault Key and stored alongside the file. The server never sees the raw key.</li>
          <li><strong>Integrity Hash</strong> — A SHA-256 hash of the plaintext is stored and verified on download to detect tampering.</li>
        </ul>
        <div className="docs-note">
          <Shield size={18} />
          <span>This means the server can store and serve your encrypted files without ever having access to the decrypted content (zero-knowledge architecture).</span>
        </div>
      </>
    )
  },
  {
    id: "files",
    icon: FileText,
    title: "File Management",
    content: (
      <>
        <h4>Uploading</h4>
        <p>Drag and drop or browse to select files. They are encrypted locally with AES-256-GCM before the encrypted blob is uploaded. You can organize files into folders (Documents, Personal, Security, Work, Other).</p>
        <h4>Versioning</h4>
        <p>Uploading a file with the same name creates a new version. Previous versions are preserved and can be viewed or restored from the version history.</p>
        <h4>Download & Preview</h4>
        <p>Files are decrypted in your browser on download. Supported preview types include images, PDFs, and text files.</p>
        <h4>Trash</h4>
        <p>Deleted files are moved to trash with a 30-day retention period. You can restore or permanently purge them.</p>
      </>
    )
  },
  {
    id: "sharing",
    icon: Share2,
    title: "Sharing",
    content: (
      <>
        <p>Sharing creates a <strong>separate encrypted copy</strong> of your file — the original vault file is never modified or exposed.</p>
        <ul>
          <li><strong>Direct Share</strong> — Share with specific users by searching their name.</li>
          <li><strong>Public Share</strong> — Visible to all authenticated users.</li>
          <li><strong>Group Share</strong> — Share with all members of a group you own or admin.</li>
          <li><strong>Password Protection</strong> — Optionally require a separate password to access the share.</li>
          <li><strong>Expiry & One-Time Access</strong> — Set an expiration in hours or limit to a single download.</li>
        </ul>
        <p>Each share has its own conversation thread for discussing the shared file.</p>
      </>
    )
  },
  {
    id: "groups",
    icon: Users,
    title: "Groups",
    content: (
      <>
        <p>Groups allow teams to collaborate in a shared workspace:</p>
        <ul>
          <li><strong>Create</strong> — Name your group and add members. An invite link is generated automatically.</li>
          <li><strong>Roles</strong> — Owner, Admins (can manage members and share files), and Members.</li>
          <li><strong>Group Chat</strong> — Every group has a dedicated chat room.</li>
          <li><strong>Leave / Delete</strong> — Members can leave; owners can delete the group entirely.</li>
        </ul>
      </>
    )
  },
  {
    id: "security",
    icon: Shield,
    title: "Security Features",
    content: (
      <>
        <ul>
          <li><strong>Multi-Factor Authentication (MFA)</strong> — TOTP-based 2FA via any authenticator app. Recovery codes are provided on setup.</li>
          <li><strong>Session Management</strong> — View and revoke active sessions from the Security Center.</li>
          <li><strong>Audit Logs</strong> — All actions (login, upload, share, delete) are logged and visible in the Security Center.</li>
          <li><strong>Role-Based Access Control</strong> — Four roles: User, Admin, Auditor, and Team Owner with granular permissions.</li>
          <li><strong>Rate Limiting</strong> — API endpoints are rate-limited to prevent abuse.</li>
        </ul>
      </>
    )
  },
  {
    id: "storage",
    icon: HardDrive,
    title: "Storage Plans",
    content: (
      <>
        <p>Storage is tiered by plan. All plans include the same encryption and security features — only the storage limit differs.</p>
        <div className="docs-plans">
          <div className="docs-plan">
            <strong>Free</strong>
            <span>1 GB</span>
          </div>
          <div className="docs-plan">
            <strong>Basic</strong>
            <span>$10/mo — 10 GB</span>
          </div>
          <div className="docs-plan">
            <strong>Pro</strong>
            <span>$100/mo — 100 GB</span>
          </div>
        </div>
        <p>Storage usage is tracked in real-time. Upgrade any time from the vault dashboard.</p>
      </>
    )
  }
];

export default function Docs() {
  const navigate = useNavigate();

  const scrollToSection = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  return (
    <div className="docs-page">
      <motion.header
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.6 }}
        className="docs-header"
      >
        <div className="docs-header-inner">
          <div className="docs-brand" onClick={() => navigate("/")}>
            <Lock size={24} />
            <span>Secure Vault</span>
          </div>
          <nav className="docs-nav-links">
            <a href="/">Home</a>
            <a href="/#features">Features</a>
            <a href="/#pricing">Pricing</a>
          </nav>
        </div>
      </motion.header>

      <div className="docs-layout">
        <aside className="docs-sidebar">
          <h3>Documentation</h3>
          <ul>
            {sections.map((section) => (
              <li key={section.id}>
                <a
                  href={`#${section.id}`}
                  onClick={(e) => { e.preventDefault(); scrollToSection(section.id); }}
                >
                  <section.icon size={16} />
                  {section.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>

        <main className="docs-content">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <motion.section
                key={section.id}
                id={section.id}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.5 }}
                className="docs-section"
              >
                <div className="docs-section-head">
                  <Icon size={22} />
                  <h2>{section.title}</h2>
                </div>
                <div className="docs-section-body">
                  {section.content}
                </div>
              </motion.section>
            );
          })}

          <div className="docs-footer-cta">
            <p>Ready to start securing your files?</p>
            <button onClick={() => navigate("/login")}>
              Get Started Now
              <ArrowRight size={18} />
            </button>
          </div>
        </main>
      </div>
    </div>
  );
}
