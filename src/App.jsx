// App.jsx
import React, { useEffect, useRef, useState } from "react";
import {
  Lock,
  Unlock,
  LogOut,
  AlertTriangle,
  Database,
  Folder,
  FolderOpen,
  FolderPlus,
  Plus,
  HardDrive,
  ShieldCheck,
  X,
  Loader2,
  Download,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";
import "./App.css";

/*
  Single-file React app for Encrypted File Vault.
  Drop this at src/App.jsx and App.css at src/App.css.
  Ensure lucide-react is installed: npm i lucide-react
*/

export default function App() {
  // App state
  const [appView, setAppView] = useState("loading"); // 'loading' | 'setup' | 'locked' | 'vault'
  const [error, setError] = useState("");
  const [vaultMetadata, setVaultMetadata] = useState(null);
  const [masterKey, setMasterKey] = useState(null);
  const [foldersCache, setFoldersCache] = useState([]);
  const [images, setImages] = useState([]);
  const [currentFolderId, setCurrentFolderId] = useState(null);
  const [itemCount, setItemCount] = useState(0);

  // refs
  const fileInputRef = useRef(null);
  const modalRef = useRef(null);
  const modalImageRef = useRef(null);
  const modalLoaderRef = useRef(null);
  const dbRef = useRef(null);
  const currentModalBlobUrl = useRef(null);

  // constants
  const DB_NAME = "ZeroKnowledgeVaultDB";
  const DB_VERSION = 1;
  const PBKDF2_ITERATIONS = 100000;
  const ENC_ALGO = { name: "AES-GCM", length: 256 };
  const HASH_ALGO = "SHA-256";

  // ---------- Utility functions ----------
  const arrayBufferToBase64 = (buffer) => {
    const bytes = new Uint8Array(buffer);
    let binary = "";
    for (let i = 0; i < bytes.byteLength; i++) binary += String.fromCharCode(bytes[i]);
    return window.btoa(binary);
  };
  const base64ToArrayBuffer = (base64) => {
    const binary_string = window.atob(base64);
    const len = binary_string.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
    return bytes.buffer;
  };

  // ---------- Crypto helpers ----------
  async function deriveKey(password, saltBase64) {
    const textEncoder = new TextEncoder();
    const passwordKey = await window.crypto.subtle.importKey(
      "raw",
      textEncoder.encode(password),
      { name: "PBKDF2" },
      false,
      ["deriveKey"]
    );
    return window.crypto.subtle.deriveKey(
      {
        name: "PBKDF2",
        salt: base64ToArrayBuffer(saltBase64),
        iterations: PBKDF2_ITERATIONS,
        hash: HASH_ALGO,
      },
      passwordKey,
      ENC_ALGO,
      false,
      ["encrypt", "decrypt"]
    );
  }

  async function encryptData(key, dataBuffer) {
    const iv = window.crypto.getRandomValues(new Uint8Array(12));
    const encryptedBuffer = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, dataBuffer);
    return { encryptedData: arrayBufferToBase64(encryptedBuffer), iv: arrayBufferToBase64(iv.buffer) };
  }

  async function decryptData(key, encryptedBase64, ivBase64) {
    return window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(ivBase64)) },
      key,
      base64ToArrayBuffer(encryptedBase64)
    );
  }

  async function decryptToBlob(key, encryptedBase64, ivBase64, mimeType) {
    const buffer = await decryptData(key, encryptedBase64, ivBase64);
    return new Blob([buffer], { type: mimeType });
  }

  async function encryptString(key, text) {
    return encryptData(key, new TextEncoder().encode(text));
  }
  async function decryptString(key, encryptedBase64, ivBase64) {
    const buffer = await decryptData(key, encryptedBase64, ivBase64);
    return new TextDecoder().decode(buffer);
  }

  // ---------- IndexedDB with wait-for-ready ----------
  function initDB() {
    return new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = (event) => {
        const db = event.target.result;
        if (!db.objectStoreNames.contains("metadata")) db.createObjectStore("metadata", { keyPath: "id" });
        if (!db.objectStoreNames.contains("folders")) db.createObjectStore("folders", { keyPath: "id" });
        if (!db.objectStoreNames.contains("images")) {
          const img = db.createObjectStore("images", { keyPath: "id" });
          img.createIndex("folderId", "folderId", { unique: false });
          img.createIndex("createdAt", "createdAt", { unique: false });
        }
      };
      request.onsuccess = (event) => {
        dbRef.current = event.target.result;
        resolve(dbRef.current);
      };
      request.onerror = (event) => reject(event.target.error);
    });
  }

  function waitForDB() {
    if (dbRef.current) return Promise.resolve();
    return new Promise((resolve) => {
      const check = setInterval(() => {
        if (dbRef.current) {
          clearInterval(check);
          resolve();
        }
      }, 50);
    });
  }

  function dbGet(storeName, id) {
    return new Promise(async (resolve, reject) => {
      await waitForDB();
      const tx = dbRef.current.transaction([storeName], "readonly");
      const req = tx.objectStore(storeName).get(id);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  function dbPut(storeName, data) {
    return new Promise(async (resolve, reject) => {
      await waitForDB();
      const tx = dbRef.current.transaction([storeName], "readwrite");
      const req = tx.objectStore(storeName).put(data);
      tx.oncomplete = () => resolve(req.result);
      tx.onerror = () => reject(tx.error);
    });
  }
  function dbDelete(storeName, id) {
    return new Promise(async (resolve, reject) => {
      await waitForDB();
      const tx = dbRef.current.transaction([storeName], "readwrite");
      tx.objectStore(storeName).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }
  function dbGetAll(storeName) {
    return new Promise(async (resolve, reject) => {
      await waitForDB();
      const tx = dbRef.current.transaction([storeName], "readonly");
      const req = tx.objectStore(storeName).getAll();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(tx.error);
    });
  }

  // ---------- Init & check vault ----------
  async function checkVaultStatus() {
    try {
      const meta = await dbGet("metadata", "vault_master");
      if (meta) {
        setVaultMetadata(meta);
        setAppView("locked");
      } else {
        setAppView("setup");
      }
    } catch (err) {
      console.error(err);
      setError("Could not access local storage.");
      setAppView("setup");
    }
  }

  useEffect(() => {
    (async () => {
      setAppView("loading");
      await initDB();
      await checkVaultStatus();
    })();
    // eslint-disable-next-line
  }, []);

  // ---------- Setup / Unlock ----------
  async function handleCreateVault(password) {
    setError("");
    if (!password || password.length < 8) return setError("Password must be at least 8 characters.");
    try {
      const salt = crypto.getRandomValues(new Uint8Array(16));
      const saltBase64 = arrayBufferToBase64(salt.buffer);
      const key = await deriveKey(password, saltBase64);
      const { encryptedData, iv } = await encryptString(key, "VALID");
      const metaDataToSave = { id: "vault_master", salt: saltBase64, validator: encryptedData, validatorIv: iv, createdAt: Date.now() };
      await dbPut("metadata", metaDataToSave);
      setVaultMetadata(metaDataToSave);
      unlockVault(key);
    } catch (e) {
      console.error(e);
      setError("Failed to create local vault.");
    }
  }

  async function handleUnlock(password) {
    setError("");
    if (!password) return setError("Enter password");
    try {
      const key = await deriveKey(password, vaultMetadata.salt);
      const validation = await decryptString(key, vaultMetadata.validator, vaultMetadata.validatorIv);
      if (validation === "VALID") unlockVault(key);
      else throw new Error("Invalid");
    } catch (e) {
      console.error(e);
      setError("Incorrect password.");
    }
  }

  function unlockVault(key) {
    setMasterKey(key);
    setAppView("vault");
    refreshVaultView(key, currentFolderId);
  }

  function lockVault() {
    setMasterKey(null);
    setCurrentFolderId(null);
    setAppView("locked");
    setImages([]);
    setFoldersCache([]);
    if (currentModalBlobUrl.current) {
      URL.revokeObjectURL(currentModalBlobUrl.current);
      currentModalBlobUrl.current = null;
    }
  }

  // ---------- Refresh view ----------
  async function refreshVaultView(key = null, folderId = null) {
    const k = key || masterKey;
    if (!k) return;
    await loadFolders(k);
    await loadImagesForCurrentFolder(k, folderId);
  }

  async function loadFolders(key) {
    try {
      const raw = await dbGetAll("folders");
      raw.sort((a, b) => a.createdAt - b.createdAt);
      const cache = [];
      for (const f of raw) {
        try {
          const name = await decryptString(key, f.encryptedName, f.iv);
          cache.push({ ...f, name });
        } catch (e) {
          cache.push({ ...f, name: "??? (Error)" });
        }
      }
      setFoldersCache(cache);
    } catch (e) {
      console.error(e);
    }
  }

  async function loadImagesForCurrentFolder(key, folderId = null) {
    try {
      const allImgs = await dbGetAll("images");
      const filtered = allImgs.filter((img) => img.folderId === folderId);
      filtered.sort((a, b) => b.createdAt - a.createdAt);
      setItemCount(filtered.length);
      const thumbnailPromises = filtered.map(async (img) => {
        try {
          const blob = await decryptToBlob(key, img.encryptedData, img.iv, img.mimeType);
          const url = URL.createObjectURL(blob);
          return { ...img, _thumbUrl: url };
        } catch (e) {
          return { ...img, _thumbUrl: null };
        }
      });
      const populated = await Promise.all(thumbnailPromises);
      setImages(populated);
    } catch (e) {
      console.error(e);
    }
  }

  // ---------- Folder operations ----------
  async function createFolder(name) {
    if (!masterKey) return setError("Unlock first");
    try {
      const { encryptedData, iv } = await encryptString(masterKey, name);
      const newFolder = { id: crypto.randomUUID(), encryptedName: encryptedData, iv, createdAt: Date.now() };
      await dbPut("folders", newFolder);
      await refreshVaultView(masterKey, currentFolderId);
    } catch (e) {
      console.error(e);
      setError("Could not create local folder.");
    }
  }

  async function deleteFolder(folder) {
    if (!confirm(`Delete folder "${folder.name}"? Items will move to Home.`)) return;
    const allImgs = await dbGetAll("images");
    const itemsInFolder = allImgs.filter((img) => img.folderId === folder.id);
    for (const img of itemsInFolder) {
      img.folderId = null;
      await dbPut("images", img);
    }
    await dbDelete("folders", folder.id);
    let newFolderId = currentFolderId;
    if (currentFolderId === folder.id) {
      newFolderId = null;
      setCurrentFolderId(null);
    }
    await refreshVaultView(masterKey, newFolderId);
  }

  // ---------- File upload ----------
  async function handleFileChange(file) {
    setError("");
    if (!file) return;
    if (file.size > 200 * 1024 * 1024) return setError("File too large (Max 200MB).");
    try {
      const arrayBuffer = await file.arrayBuffer();
      const { encryptedData, iv } = await encryptData(masterKey, arrayBuffer);
      const newImage = {
        id: crypto.randomUUID(),
        name: file.name,
        mimeType: file.type || "application/octet-stream",
        encryptedData,
        iv,
        size: file.size,
        createdAt: Date.now(),
        folderId: currentFolderId,
      };
      await dbPut("images", newImage);
      await refreshVaultView(masterKey, currentFolderId);
    } catch (e) {
      console.error(e);
      setError("Failed to save to local vault.");
    }
  }

  // ---------- Modal logic ----------
  async function openImageModal(imgData) {
    const modal = modalRef.current;
    const imgEl = modalImageRef.current;
    const loader = modalLoaderRef.current;
    if (!modal || !imgEl || !loader) return;

    imgEl.classList.add("hidden");
    imgEl.src = "";
    loader.classList.remove("hidden");
    modal.style.display = "flex";

    try {
      const blob = await decryptToBlob(masterKey, imgData.encryptedData, imgData.iv, imgData.mimeType);
      const url = URL.createObjectURL(blob);
      currentModalBlobUrl.current = url;
      imgEl.onload = () => {
        loader.classList.add("hidden");
        imgEl.classList.remove("hidden");
      };
      imgEl.src = url;
      modal.querySelector("#modal-filename").textContent = imgData.name;
      modal.querySelector("#modal-btn-delete").onclick = async () => {
        if (!confirm(`Are you sure you want to permanently delete "${imgData.name}"?`)) return;
        await dbDelete("images", imgData.id);
        closeImageModal();
        await refreshVaultView(masterKey, currentFolderId);
      };
      modal.querySelector("#modal-btn-download").onclick = () => {
        if (!currentModalBlobUrl.current) return;
        const a = document.createElement("a");
        a.href = currentModalBlobUrl.current;
        a.download = imgData.name;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      };
    } catch (e) {
      console.error(e);
      loader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg><p>Decryption Failed.</p>`;
      modal.querySelector("#modal-filename").textContent = "Error loading file";
    }
  }

  function closeImageModal() {
    const modal = modalRef.current;
    if (!modal) return;
    modal.style.display = "none";
    if (currentModalBlobUrl.current) {
      URL.revokeObjectURL(currentModalBlobUrl.current);
      currentModalBlobUrl.current = null;
    }
  }

  // Cleanup object URLs
  useEffect(() => {
    return () => {
      images.forEach((img) => {
        if (img._thumbUrl) URL.revokeObjectURL(img._thumbUrl);
      });
      if (currentModalBlobUrl.current) URL.revokeObjectURL(currentModalBlobUrl.current);
    };
  }, [images]);

  // ---------- Render helpers ----------
  function renderFolderList() {
    return (
      <>
        <button
          className={`folder-btn ${currentFolderId === null ? "active" : ""}`}
          onClick={() => {
            setCurrentFolderId(null);
            refreshVaultView(masterKey, null);
          }}
        >
          <FolderOpen className="icon" /> Home
        </button>

        {foldersCache.map((folder) => (
          <div key={folder.id} className="folder-row">
            <button
              className={`folder-btn flex-1 ${currentFolderId === folder.id ? "active" : ""}`}
              onClick={() => {
                setCurrentFolderId(folder.id);
                refreshVaultView(masterKey, folder.id);
              }}
            >
              <Folder className="icon" />
              <span className="folder-name">{folder.name}</span>
            </button>
            <button
              className="folder-del"
              onClick={(e) => {
                e.stopPropagation();
                deleteFolder(folder);
              }}
            >
              <Trash2 className="icon" />
            </button>
          </div>
        ))}
      </>
    );
  }

  function renderImageGrid() {
    if (!images || images.length === 0) return null;
    return images.map((img) => (
      <div
        key={img.id}
        className="grid-item"
        onClick={() => openImageModal(img)}
        role="button"
        tabIndex={0}
      >
        <div className="thumb-area">
          {!img._thumbUrl ? <Lock className="thumb-lock" /> : <img src={img._thumbUrl} alt={img.name} className="thumb-img" />}
        </div>
        <div className="thumb-footer">
          <p title={img.name} className="thumb-name">{img.name}</p>
        </div>
      </div>
    ));
  }

  // ---------- JSX ----------
  return (
    <div className="app-root">
      <header className="app-header">
        <div className="header-left">
          <div className={`logo ${appView === "vault" ? "unlocked" : ""}`}>{appView === "vault" ? <Unlock /> : <Lock />}</div>
          <div>
            <h1 className="title">Local Vault</h1>
            <p className="subtitle">Offline Storage</p>
          </div>
        </div>
        <button className={`btn btn-ghost ${appView !== "vault" ? "hidden" : ""}`} onClick={lockVault}>
          <LogOut /> <span className="btn-text">Lock Vault</span>
        </button>
      </header>

      <main className="app-main">
        <section className="content">
          {error && (
            <div className="alert">
              <AlertTriangle /> <span>{error}</span>
            </div>
          )}

          {appView === "loading" && (
            <div className="loading">
              <Database className="big-icon" /> <p>Opening local secure storage...</p>
            </div>
          )}

          {appView === "setup" && (
            <div className="center-card">
              <div className="card glass">
                <h2>Initialize Local Vault</h2>
                <p className="muted">Data is encrypted and stored <strong>only in this browser</strong>.</p>
                <p className="warning">Clearing browser data will delete your vault. Forgetting the password means total data loss.</p>
                <SetupForm onSubmit={handleCreateVault} />
              </div>
            </div>
          )}

          {appView === "locked" && (
            <div className="center-card">
              <div className="card glass text-center">
                <div className="lock-badge"><Lock /></div>
                <h2>Vault Locked</h2>
                <UnlockForm onSubmit={handleUnlock} />
              </div>
            </div>
          )}

          {appView === "vault" && (
            <div className="vault-layout">
              <aside className="sidebar">
                <h3 className="sidebar-title"><Folder /> Folders</h3>
                <div className="folder-list">{renderFolderList()}</div>
                <NewFolderForm createFolder={createFolder} />
              </aside>

              <div className="vault-main">
                <div className="vault-toolbar">
                  <div>
                    <h3 className="current-folder">
                      {currentFolderId ? <FolderOpen /> : <Folder />}{" "}
                      {currentFolderId ? (foldersCache.find((f) => f.id === currentFolderId)?.name || "Unknown") : "Home"}
                    </h3>
                    <p className="muted">{itemCount} encrypted item(s)</p>
                  </div>

                  <div className="toolbar-actions">
                    <input ref={fileInputRef} type="file" id="file-upload" className="hidden" accept="image/*" onChange={(e) => handleFileChange(e.target.files[0])} />
                    <label htmlFor="file-upload" className="btn btn-primary" onClick={() => fileInputRef.current && fileInputRef.current.click()}>
                      <Plus /> Add Image
                    </label>
                  </div>
                </div>

                <div className="grid-area">
                  {images.length === 0 ? (
                    <div className="empty">
                      <HardDrive className="empty-icon" />
                      <p className="muted">Local folder is empty</p>
                    </div>
                  ) : (
                    <div className="grid">{renderImageGrid()}</div>
                  )}
                </div>
              </div>
            </div>
          )}
        </section>
      </main>

      <footer className="app-footer">
        <div>
          <ShieldCheck /> <span>100% Local Storage (IndexedDB) • AES-GCM 256-bit Encrypted</span>
        </div>
      </footer>

      {/* Modal */}
      <div ref={modalRef} id="image-modal" className="modal" onClick={() => closeImageModal()}>
        <div className="modal-content" onClick={(e) => e.stopPropagation()}>
          <button className="modal-close" onClick={() => closeImageModal()}><X /></button>
          <div className="modal-body">
            <div ref={modalLoaderRef} id="modal-loader" className="modal-loader">
              <Loader2 className="spinner" />
              <p>Decrypting image...</p>
            </div>
            <img ref={modalImageRef} id="modal-image" alt="Decrypted" className="modal-img hidden" />
          </div>

          <div className="modal-footer">
            <h3 id="modal-filename" className="modal-filename"></h3>
            <div className="modal-actions">
              <button id="modal-btn-download" className="btn btn-primary"><Download /> Download</button>
              <button id="modal-btn-delete" className="btn btn-danger"><Trash2 /> Delete</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Helper Components ---------------- */

function SetupForm({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  return (
    <form className="setup-form" onSubmit={(e) => { e.preventDefault(); onSubmit(password); }}>
      <label className="label">Set Master Password</label>
      <div className="input-wrap">
        <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 8 characters" minLength={8} required />
        <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)}>{show ? <EyeOff /> : <Eye />}</button>
      </div>
      <button type="submit" className="btn btn-primary full">Create Local Vault</button>
    </form>
  );
}

function UnlockForm({ onSubmit }) {
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  return (
    <form className="setup-form" onSubmit={(e) => { e.preventDefault(); onSubmit(password); }}>
      <label className="label">Master Password</label>
      <div className="input-wrap">
        <input type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Enter password" required />
        <button type="button" className="icon-btn" onClick={() => setShow((s) => !s)}>{show ? <EyeOff /> : <Eye />}</button>
      </div>
      <button type="submit" className="btn btn-primary full">Unlock Vault</button>
    </form>
  );
}

function NewFolderForm({ createFolder }) {
  const [name, setName] = useState("");
  const [busy, setBusy] = useState(false);
  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setBusy(true);
    try {
      await createFolder(name.trim());
      setName("");
    } catch (err) {
      console.error(err);
    } finally {
      setBusy(false);
    }
  };
  return (
    <form className="new-folder" onSubmit={submit}>
      <input className="folder-input" placeholder="New folder name" value={name} onChange={(e) => setName(e.target.value)} disabled={busy} />
      <button className={`btn ${busy ? "btn-disabled" : "btn-ghost"}`} type="submit" disabled={busy}>
        {busy ? <Loader2 className="small-spin" /> : <FolderPlus />}
      </button>
    </form>
  );
}
// import { useEffect, useRef, useState } from "react";

// import {
//   Lock,
//   Unlock,
//   LogOut,
//   AlertTriangle,
//   Database,
//   Folder,
//   FolderOpen,
//   FolderPlus,
//   Plus,
//   HardDrive,
//   ShieldCheck,
//   X,
//   Loader2,
//   Download,
//   Trash2,
//   Eye,
//   EyeOff,
// } from "lucide-react";

// export default function App() {
//   // App state
//   const [appView, setAppView] = useState("loading"); // 'loading' | 'setup' | 'locked' | 'vault'
//   const [error, setError] = useState("");
//   const [vaultMetadata, setVaultMetadata] = useState(null);
//   const [masterKey, setMasterKey] = useState(null);
//   const [foldersCache, setFoldersCache] = useState([]);
//   const [images, setImages] = useState([]);
//   const [currentFolderId, setCurrentFolderId] = useState(null);
//   const [itemCount, setItemCount] = useState(0);

//   // refs for DOM elements that require direct manipulation (modal + file input)
//   const fileInputRef = useRef(null);
//   const modalRef = useRef(null);
//   const modalImageRef = useRef(null);
//   const modalLoaderRef = useRef(null);

//   // Internal DB and constants
//   const dbRef = useRef(null);
//   const currentModalBlobUrl = useRef(null);

//   const DB_NAME = "ZeroKnowledgeVaultDB";
//   const DB_VERSION = 1;
//   const PBKDF2_ITERATIONS = 100000;
//   const ENC_ALGO = { name: "AES-GCM", length: 256 };
//   const HASH_ALGO = "SHA-256";

//   // ---------- Utility functions (arrayBuffer <-> base64) ----------
//   const arrayBufferToBase64 = (buffer) => {
//     let binary = "";
//     const bytes = new Uint8Array(buffer);
//     for (let i = 0; i < bytes.byteLength; i++)
//       binary += String.fromCharCode(bytes[i]);
//     return window.btoa(binary);
//   };
//   const base64ToArrayBuffer = (base64) => {
//     const binary_string = window.atob(base64);
//     const len = binary_string.length;
//     const bytes = new Uint8Array(len);
//     for (let i = 0; i < len; i++) bytes[i] = binary_string.charCodeAt(i);
//     return bytes.buffer;
//   };

//   // ---------- Crypto helpers ----------
//   async function deriveKey(password, saltBase64) {
//     const textEncoder = new TextEncoder();
//     const passwordKey = await window.crypto.subtle.importKey(
//       "raw",
//       textEncoder.encode(password),
//       { name: "PBKDF2" },
//       false,
//       ["deriveKey"]
//     );
//     return window.crypto.subtle.deriveKey(
//       {
//         name: "PBKDF2",
//         salt: base64ToArrayBuffer(saltBase64),
//         iterations: PBKDF2_ITERATIONS,
//         hash: HASH_ALGO,
//       },
//       passwordKey,
//       ENC_ALGO,
//       false,
//       ["encrypt", "decrypt"]
//     );
//   }

//   async function encryptData(key, dataBuffer) {
//     const iv = window.crypto.getRandomValues(new Uint8Array(12));
//     const encryptedBuffer = await window.crypto.subtle.encrypt(
//       { name: "AES-GCM", iv },
//       key,
//       dataBuffer
//     );
//     return {
//       encryptedData: arrayBufferToBase64(encryptedBuffer),
//       iv: arrayBufferToBase64(iv.buffer),
//     };
//   }

//   async function decryptData(key, encryptedBase64, ivBase64) {
//     return window.crypto.subtle.decrypt(
//       { name: "AES-GCM", iv: new Uint8Array(base64ToArrayBuffer(ivBase64)) },
//       key,
//       base64ToArrayBuffer(encryptedBase64)
//     );
//   }

//   async function decryptToBlob(key, encryptedBase64, ivBase64, mimeType) {
//     const buffer = await decryptData(key, encryptedBase64, ivBase64);
//     return new Blob([buffer], { type: mimeType });
//   }

//   async function encryptString(key, text) {
//     return encryptData(key, new TextEncoder().encode(text));
//   }

//   async function decryptString(key, encryptedBase64, ivBase64) {
//     const buffer = await decryptData(key, encryptedBase64, ivBase64);
//     return new TextDecoder().decode(buffer);
//   }

//   // ---------- IndexedDB helpers ----------
//   function initDB() {
//     return new Promise((resolve, reject) => {
//       const request = indexedDB.open(DB_NAME, DB_VERSION);
//       request.onerror = (event) => {
//         reject(event.target.error);
//       };
//       request.onupgradeneeded = (event) => {
//         const db = event.target.result;
//         if (!db.objectStoreNames.contains("metadata"))
//           db.createObjectStore("metadata", { keyPath: "id" });
//         if (!db.objectStoreNames.contains("folders"))
//           db.createObjectStore("folders", { keyPath: "id" });
//         if (!db.objectStoreNames.contains("images")) {
//           const imgStore = db.createObjectStore("images", { keyPath: "id" });
//           imgStore.createIndex("folderId", "folderId", { unique: false });
//           imgStore.createIndex("createdAt", "createdAt", { unique: false });
//         }
//       };
//       request.onsuccess = (event) => {
//         dbRef.current = event.target.result;
//         resolve(dbRef.current);
//       };
//     });
//   }

//   function dbGet(storeName, id) {
//     return new Promise((resolve, reject) => {
//       const tx = dbRef.current.transaction([storeName], "readonly");
//       const req = tx.objectStore(storeName).get(id);
//       req.onsuccess = () => resolve(req.result);
//       req.onerror = () => reject(req.error);
//     });
//   }

//   function dbPut(storeName, data) {
//     return new Promise((resolve, reject) => {
//       const tx = dbRef.current.transaction([storeName], "readwrite");
//       const req = tx.objectStore(storeName).put(data);
//       tx.oncomplete = () => resolve(req.result);
//       tx.onerror = () => reject(tx.error);
//     });
//   }

//   function dbDelete(storeName, id) {
//     return new Promise((resolve, reject) => {
//       const tx = dbRef.current.transaction([storeName], "readwrite");
//       tx.objectStore(storeName).delete(id);
//       tx.oncomplete = () => resolve();
//       tx.onerror = () => reject(tx.error);
//     });
//   }

//   function dbGetAll(storeName) {
//     return new Promise((resolve, reject) => {
//       const tx = dbRef.current.transaction([storeName], "readonly");
//       const store = tx.objectStore(storeName);
//       const req = store.getAll();
//       req.onsuccess = () => resolve(req.result);
//       req.onerror = () => reject(tx.error);
//     });
//   }

//   // ---------- App initialization & vault status ----------
//   async function checkVaultStatus() {
//     try {
//       const meta = await dbGet("metadata", "vault_master");
//       if (meta) {
//         setVaultMetadata(meta);
//         setAppView("locked");
//       } else {
//         setAppView("setup");
//       }
//       // **REMOVED** window.lucide call
//     } catch (err) {
//       setError("Could not access local storage.");
//       setAppView("setup");
//     }
//   }

//   useEffect(() => {
//     (async () => {
//       setAppView("loading");
//       await initDB();
//       await checkVaultStatus();
//     })();
//     // eslint-disable-next-line react-hooks/exhaustive-deps
//   }, []);

//   // ---------- Setup / unlock handlers ----------
//   async function handleCreateVault(password) {
//     if (!password || password.length < 8)
//       return setError("Password must be at least 8 characters.");
//     try {
//       const salt = window.crypto.getRandomValues(new Uint8Array(16));
//       const saltBase64 = arrayBufferToBase64(salt.buffer);
//       const key = await deriveKey(password, saltBase64);
//       const { encryptedData, iv } = await encryptString(key, "VALID");
//       const metaDataToSave = {
//         id: "vault_master",
//         salt: saltBase64,
//         validator: encryptedData,
//         validatorIv: iv,
//         createdAt: Date.now(),
//       };
//       await dbPut("metadata", metaDataToSave);
//       setVaultMetadata(metaDataToSave);
//       unlockVault(key);
//     } catch (e) {
//       console.error(e);
//       setError("Failed to create local vault.");
//     }
//   }

//   async function handleUnlock(password) {
//     if (!password) return setError("Enter password");
//     try {
//       const key = await deriveKey(password, vaultMetadata.salt);
//       const validation = await decryptString(
//         key,
//         vaultMetadata.validator,
//         vaultMetadata.validatorIv
//       );
//       if (validation === "VALID") {
//         unlockVault(key);
//       } else throw new Error("Invalid");
//     } catch (e) {
//       console.error(e);
//       setError("Incorrect password.");
//     }
//   }

//   function unlockVault(key) {
//     setMasterKey(key);
//     setAppView("vault");
//     // On initial unlock, currentFolderId is null, which is correct
//     refreshVaultView(key, currentFolderId);
//   }

//   function lockVault() {
//     setMasterKey(null);
//     setCurrentFolderId(null);
//     setAppView("locked");
//     // clear caches
//     setImages([]);
//     setFoldersCache([]);
//     if (currentModalBlobUrl.current) {
//       URL.revokeObjectURL(currentModalBlobUrl.current);
//       currentModalBlobUrl.current = null;
//     }
//   }

//   // ---------- Load / refresh ----------
//   async function refreshVaultView(key = null, folderId = null) {
//     const k = key || masterKey;
//     if (!k) return;
//     await loadFolders(k);
//     await loadImagesForCurrentFolder(k, folderId);
//   }

//   async function loadFolders(key) {
//     try {
//       const raw = await dbGetAll("folders");
//       raw.sort((a, b) => a.createdAt - b.createdAt);
//       const cache = [];
//       for (const f of raw) {
//         try {
//           const name = await decryptString(key, f.encryptedName, f.iv);
//           cache.push({ ...f, name });
//         } catch (e) {
//           cache.push({ ...f, name: "??? (Error)" });
//         }
//       }
//       setFoldersCache(cache);
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   async function loadImagesForCurrentFolder(key, folderId = null) {
//     try {
//       const allImgs = await dbGetAll("images");
//       const filtered = allImgs.filter((img) => img.folderId === folderId);
//       filtered.sort((a, b) => b.createdAt - a.createdAt);
//       setItemCount(filtered.length);
//       // for thumbnails, we will create objectURLs after decrypting
//       const thumbnailPromises = filtered.map(async (img) => {
//         try {
//           const blob = await decryptToBlob(
//             key,
//             img.encryptedData,
//             img.iv,
//             img.mimeType
//           );
//           const url = URL.createObjectURL(blob);
//           return { ...img, _thumbUrl: url };
//         } catch (e) {
//           return { ...img, _thumbUrl: null };
//         }
//       });
//       const populated = await Promise.all(thumbnailPromises);
//       setImages(populated);
//     } catch (e) {
//       console.error(e);
//     }
//   }

//   // ---------- Create folder ----------
//   async function createFolder(name) {
//     if (!masterKey) return setError("Unlock first");
//     try {
//       const { encryptedData, iv } = await encryptString(masterKey, name);
//       const newFolder = {
//         id: crypto.randomUUID(),
//         encryptedName: encryptedData,
//         iv,
//         createdAt: Date.now(),
//       };
//       await dbPut("folders", newFolder);
//       await refreshVaultView(masterKey, currentFolderId);
//     } catch (e) {
//       console.error(e);
//       setError("Could not create local folder.");
//     }
//   }

//   // ---------- File upload (encrypt & store) ----------
//   async function handleFileChange(file) {
//     if (!file) return;
//     if (file.size > 50 * 1024 * 1024)
//       return setError("File too large (Max 50MB for demo).");
//     try {
//       const arrayBuffer = await file.arrayBuffer();
//       const { encryptedData, iv } = await encryptData(masterKey, arrayBuffer);
//       const newImage = {
//         id: crypto.randomUUID(),
//         name: file.name,
//         mimeType: file.type,
//         encryptedData,
//         iv,
//         size: file.size,
//         createdAt: Date.now(),
//         folderId: currentFolderId,
//       };
//       await dbPut("images", newImage);
//       await refreshVaultView(masterKey, currentFolderId);
//     } catch (e) {
//       console.error(e);
//       setError("Failed to save to local vault.");
//     }
//   }

//   // ---------- Modal logic (open, close, delete, download) ----------
//   async function openImageModal(imgData) {
//     const modal = modalRef.current;
//     const imgEl = modalImageRef.current;
//     const loader = modalLoaderRef.current;
//     if (!modal || !imgEl || !loader) return;

//     imgEl.classList.add("hidden");
//     imgEl.src = "";
//     loader.classList.remove("hidden");

//     modal.style.display = "flex";

//     try {
//       const blob = await decryptToBlob(
//         masterKey,
//         imgData.encryptedData,
//         imgData.iv,
//         imgData.mimeType
//       );
//       const url = URL.createObjectURL(blob);
//       currentModalBlobUrl.current = url;
//       imgEl.onload = () => {
//         loader.classList.add("hidden");
//         imgEl.classList.remove("hidden");
//       };
//       imgEl.src = url;
//       // attach download via anchor
//       modal.querySelector("#modal-filename").textContent = imgData.name;
//       modal.querySelector("#modal-btn-delete").onclick = async () => {
//         if (
//           !confirm(
//             `Are you sure you want to permanently delete "${imgData.name}"? This cannot be undone.`
//           )
//         )
//           return;
//         await dbDelete("images", imgData.id);
//         closeImageModal();
//         await refreshVaultView(masterKey, currentFolderId);
//       };
//       modal.querySelector("#modal-btn-download").onclick = () => {
//         if (!currentModalBlobUrl.current) return;
//         const a = document.createElement("a");
//         a.href = currentModalBlobUrl.current;
//         a.download = imgData.name;
//         document.body.appendChild(a);
//         a.click();
//         document.body.removeChild(a);
//       };
//     } catch (e) {
//       console.error(e);
//       // **REPAIRED**: Need to render the icon manually if it's added via innerHTML
//       loader.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-rose-500"><path d="m21.73 18-8-14a2 2 0 0 0-3.46 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path></svg><p>Decryption Failed.</p>`;
//       modal.querySelector("#modal-filename").textContent = "Error loading file";
//     }
//     // **REMOVED** window.lucide call
//   }

//   function closeImageModal() {
//     const modal = modalRef.current;
//     if (!modal) return;
//     modal.style.display = "none";
//     if (currentModalBlobUrl.current) {
//       URL.revokeObjectURL(currentModalBlobUrl.current);
//       currentModalBlobUrl.current = null;
//     }
//   }

//   // ---------- Folder delete (move items to home) ----------
//   async function deleteFolder(folder) {
//     if (!confirm(`Delete folder "${folder.name}"? Items will move to Home.`))
//       return;
//     const allImgs = await dbGetAll("images");
//     const itemsInFolder = allImgs.filter((img) => img.folderId === folder.id);
//     for (const img of itemsInFolder) {
//       img.folderId = null;
//       await dbPut("images", img);
//     }
//     await dbDelete("folders", folder.id);

//     let newFolderId = currentFolderId;
//     if (currentFolderId === folder.id) {
//       newFolderId = null;
//       setCurrentFolderId(null);
//     }
//     await refreshVaultView(masterKey, newFolderId);
//   }

//   // ---------- UI helpers ----------
//   // **REMOVED** window.lucide useEffect

//   // Cleanup object URLs on unmount
//   useEffect(() => {
//     return () => {
//       images.forEach((img) => {
//         if (img._thumbUrl) URL.revokeObjectURL(img._thumbUrl);
//       });
//       if (currentModalBlobUrl.current)
//         URL.revokeObjectURL(currentModalBlobUrl.current);
//     };
//   }, [images]);

//   // ---------- Render helpers ----------
//   function renderFolderList() {
//     return (
//       <>
//         <button
//           className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors mb-1 ${
//             currentFolderId === null
//               ? "bg-indigo-600 text-white font-medium"
//               : "hover:bg-gray-700/50 text-gray-300"
//           }`}
//           onClick={() => {
//             const newFolderId = null;
//             setCurrentFolderId(newFolderId);
//             refreshVaultView(masterKey, newFolderId);
//           }}
//         >
//           {/* **REPLACED ICON** */}
//           <FolderOpen className="w-4 h-4" /> Home
//         </button>

//         {foldersCache.map((folder) => (
//           <div key={folder.id} className="group flex items-center gap-1 mb-1">
//             <button
//               className={`flex-1 flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-left truncate ${
//                 currentFolderId === folder.id
//                   ? "bg-indigo-600 text-white font-medium"
//                   : "hover:bg-gray-700/50 text-gray-300"
//               }`}
//               onClick={() => {
//                 const newFolderId = folder.id;
//                 setCurrentFolderId(newFolderId);
//                 refreshVaultView(masterKey, newFolderId);
//               }}
//             >
//               {/* **REPLACED ICON** */}
//               <Folder className="w-4 h-4 flex-none" />
//               <span className="truncate">{folder.name}</span>
//             </button>
//             <button
//               className="p-2 text-gray-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"
//               onClick={(e) => {
//                 e.stopPropagation();
//                 deleteFolder(folder);
//               }}
//             >
//               {/* **REPLACED ICON** */}
//               <Trash2 className="w-4 h-4" />
//             </button>
//           </div>
//         ))}
//       </>
//     );
//   }

//   function renderImageGrid() {
//     if (!images || images.length === 0) return null;

//     return images.map((img) => (
//       <div
//         key={img.id}
//         className="group relative aspect-square bg-gray-950 rounded-xl overflow-hidden border border-gray-800 hover:border-indigo-500/50 transition-all shadow-lg cursor-pointer"
//         onClick={() => openImageModal(img)}
//       >
//         <div
//           className="absolute inset-0 flex flex-col items-center justify-center text-gray-500 gap-2"
//           id={`loader-${img.id}`}
//         >
//           {/* **REPLACED ICON** */}
//           {!img._thumbUrl ? (
//             <Lock className="animate-pulse text-indigo-400 w-6 h-6" />
//           ) : null}
//         </div>
//         {img._thumbUrl ? (
//           <img
//             id={`img-${img.id}`}
//             src={img._thumbUrl}
//             className="w-full h-full object-cover"
//             alt="Decrypted"
//           />
//         ) : null}
//         <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-2">
//           <div className="p-1">
//             <p className="text-xs text-gray-300 truncate font-medium">
//               {img.name}
//             </p>
//           </div>
//         </div>
//       </div>
//     ));
//   }

//   // ---------- JSX return (UI) ----------
//   return (
//     <div className="h-full text-gray-100 font-sans selection:bg-indigo-500/30 flex flex-col overflow-hidden bg-gray-900 min-h-screen">
//       <header className="flex-none flex justify-between items-center p-4 sm:px-6 lg:px-8 border-b border-gray-800 bg-gray-900 z-10">
//         <div className="flex items-center space-x-3">
//           <div
//             id="header-icon-container"
//             className={`p-2 rounded-xl transition-colors duration-300 ${
//               appView === "vault"
//                 ? "bg-emerald-500/20 text-emerald-400"
//                 : "bg-indigo-600 text-white"
//             }`}
//           >
//             {/* **REPLACED ICON (DYNAMIC)** */}
//             {appView === "vault" ? (
//               <Unlock id="header-icon" className="w-6 h-6" />
//             ) : (
//               <Lock id="header-icon" className="w-6 h-6" />
//             )}
//           </div>
//           <div>
//             <h1 className="text-xl sm:text-2xl font-bold tracking-tight">
//               Local Vault
//             </h1>
//             <p className="text-xs text-gray-500 font-mono">Offline Storage</p>
//           </div>
//         </div>
//         <button
//           onClick={() => lockVault()}
//           id="btn-lock"
//           className={`flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 transition-colors text-sm font-medium ${
//             appView !== "vault" ? "hidden" : ""
//           }`}
//         >
//           {/* **REPLACED ICON** */}
//           <LogOut className="w-4 h-4" />{" "}
//           <span className="hidden sm:inline">Lock Vault</span>
//         </button>
//       </header>

//       <main className="flex-1 flex overflow-hidden relative">
//         <section className="flex-1 flex flex-col overflow-hidden p-4 sm:p-6 lg:p-8 max-w-7xl mx-auto w-full">
//           {error && (
//             <div className="mb-6 p-4 bg-red-500/10 border border-red-500/50 rounded-lg flex items-center gap-3 text-red-400">
//               {/* **REPLACED ICON** */}
//               <AlertTriangle className="w-5 h-5" />
//               <p>{error}</p>
//             </div>
//           )}

//           {/* Loading */}
//           {appView === "loading" && (
//             <div className="flex-1 flex items-center justify-center flex-col text-indigo-500/50">
//               {/* **REPLACED ICON** */}
//               <Database className="w-16 h-16 mb-4 animate-pulse" />
//               <p className="text-gray-400">Opening local secure storage...</p>
//             </div>
//           )}

//           {/* Setup */}
//           {appView === "setup" && (
//             <div className="m-auto w-full max-w-md">
//               <div className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl border border-gray-700">
//                 <h2 className="text-xl font-bold mb-2">Initialize Local Vault</h2>
//                 <p className="text-gray-400 mb-6 text-sm">
//                   Data is encrypted and stored{" "}
//                   <strong>only in this browser</strong>.<br />
//                   <span className="text-rose-400">
//                     Clearing browser data will delete your vault.
//                   </span>
//                   <br />
//                   <span className="text-rose-400">
//                     Forgetting this password means total data loss.
//                   </span>
//                 </p>
//                 <SetupForm onSubmit={handleCreateVault} />
//               </div>
//             </div>
//           )}

//           {/* Locked */}
//           {appView === "locked" && (
//             <div className="m-auto w-full max-w-md">
//               <div className="bg-gray-800/50 p-6 sm:p-8 rounded-2xl border border-gray-700 text-center">
//                 <div className="w-16 h-16 bg-gray-900 rounded-full flex items-center justify-center mx-auto mb-6 border border-gray-700">
//                   {/* **REPLACED ICON** */}
//                   <Lock className="text-indigo-400 w-8 h-8" />
//                 </div>
//                 <h2 className="text-xl font-bold mb-6">Vault Locked</h2>
//                 <UnlockForm onSubmit={handleUnlock} />
//               </div>
//             </div>
//           )}

//           {/* Vault */}
//           {appView === "vault" && (
//             <div className="flex-1 flex flex-col md:flex-row h-full gap-6 overflow-hidden">
//               <aside className="w-full md:w-64 flex-none bg-gray-800/30 rounded-2xl border border-white/5 p-4 flex flex-col overflow-hidden max-h-[300px] md:max-h-none">
//                 <h2 className="font-bold text-lg mb-4 px-2 flex items-center gap-2">
//                   {/* **REPLACED ICON** */}
//                   <Folder className="text-indigo-400 w-5 h-5" /> Folders
//                 </h2>
//                 <div
//                   id="folder-list"
//                   className="flex-1 overflow-y-auto space-y-1 mb-4"
//                 >
//                   {renderFolderList()}
//                 </div>
//                 <NewFolderForm createFolder={createFolder} />
//               </aside>

//               <div className="flex-1 flex flex-col overflow-hidden">
//                 <div className="flex flex-wrap gap-4 justify-between items-center mb-6 bg-gray-800/30 p-4 rounded-2xl border border-white/5 flex-none">
//                   <div>
//                     <h2
//                       id="current-folder-name"
//                       className="font-bold text-lg flex items-center gap-2"
//                     >
//                       {/* **REPLACED ICON (DYNAMIC)** */}
//                       {currentFolderId ? (
//                         <FolderOpen className="text-indigo-400 w-5 h-5 mr-2" />
//                       ) : (
//                         <Folder className="text-indigo-400 w-5 h-5 mr-2" />
//                       )}
//                       {currentFolderId
//                         ? foldersCache.find((f) => f.id === currentFolderId)
//                             ?.name || "Unknown"
//                         : "Home"}
//                     </h2>
//                     <p id="item-count" className="text-sm text-gray-400">
//                       {itemCount} encrypted item(s)
//                     </p>
//                   </div>
//                   <div>
//                     <input
//                       ref={fileInputRef}
//                       type="file"
//                       id="file-upload"
//                       className="hidden"
//                       accept="image/*"
//                       onChange={(e) => handleFileChange(e.target.files[0])}
//                     />
//                     <label
//                       htmlFor="file-upload"
//                       id="btn-upload"
//                       className="flex items-center gap-2 px-5 py-2.5 rounded-xl font-medium transition-all cursor-pointer bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20"
//                     >
//                       {/* **REPLACED ICON** */}
//                       <Plus className="w-5 h-5" />
//                       <span id="upload-text">Add Image</span>
//                     </label>
//                   </div>
//                 </div>

//                 <div
//                   id="vault-grid"
//                   className="flex-1 overflow-y-auto min-h-0 grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 pb-4 content-start"
//                 >
//                   {renderImageGrid()}
//                 </div>

//                 {images.length === 0 && (
//                   <div
//                     id="empty-state"
//                     className="h-full flex flex-col items-center justify-center text-center p-8 border-2 border-dashed border-gray-800 rounded-2xl"
//                   >
//                     {/* **REPLACED ICON** */}
//                     <HardDrive className="mx-auto text-gray-700 mb-4 w-12 h-12" />
//                     <p className="text-gray-500">Local folder is empty</p>
//                   </div>
//                 )}
//               </div>
//             </div>
//           )}
//         </section>
//       </main>

//       <footer className="flex-none py-4 border-t border-gray-800 text-center text-gray-500 text-sm bg-gray-900 z-10">
//         <div className="flex items-center justify-center gap-2 mb-1">
//           {/* **REPLACED ICON** */}
//           <ShieldCheck className="w-4 h-4 text-emerald-500" />
//           <span>
//             100% Local Storage (IndexedDB) • AES-GCM 256-bit Encrypted
//           </span>
//         </div>
//       </footer>

//       {/* Modal (hidden by default) */}
//       <div
//         ref={modalRef}
//         id="image-modal"
//         className="fixed inset-0 bg-black/90 z-50"
//         style={{
//           display: "none",
//           alignItems: "center",
//           justifyContent: "center",
//           padding: "1rem",
//         }}
//         onClick={() => closeImageModal()}
//       >
//         <div
//           className="relative max-w-6xl w-full h-full flex flex-col items-center justify-center"
//           onClick={(e) => e.stopPropagation()}
//         >
//           <button
//             id="modal-close"
//             className="absolute top-4 right-4 z-10 p-3 rounded-full bg-white/20 hover:bg-white/40 text-white transition-colors backdrop-blur-sm"
//             onClick={() => closeImageModal()}
//           >
//             {/* **REPLACED ICON** */}
//             <X className="w-6 h-6" />
//           </button>
//           <div className="relative w-full flex items-center justify-center max-h-[85%]">
//             <div
//               ref={modalLoaderRef}
//               id="modal-loader"
//               className="flex flex-col items-center justify-center text-gray-500 gap-2 p-8 bg-gray-900/50 rounded-xl"
//             >
//               {/* **REPLACED ICON** */}
//               <Loader2 className="animate-spin text-indigo-400 w-8 h-8" />
//               <p>Decrypting image...</p>
//             </div>
//             <img
//               ref={modalImageRef}
//               id="modal-image"
//               src={null}
//               alt="Decrypted Vault Image"
//               className="max-w-full max-h-full object-contain rounded-lg shadow-2xl hidden"
//             />
//           </div>

//           <div
//             id="modal-footer"
//             className="flex-none mt-6 p-4 rounded-xl backdrop-blur-md flex flex-col sm:flex-row justify-between items-center w-full max-w-4xl"
//           >
//             <h3
//               id="modal-filename"
//               className="text-lg font-semibold truncate text-gray-100 mb-2 sm:mb-0"
//             ></h3>
//             <div className="flex gap-4">
//               <button
//                 id="modal-btn-download"
//                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 transition-colors text-white font-medium text-sm"
//               >
//                 {/* **REPLACED ICON** */}
//                 <Download className="w-4 h-4" /> Download
//               </button>
//               <button
//                 id="modal-btn-delete"
//                 className="flex items-center gap-2 px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-700 transition-colors text-white font-medium text-sm"
//               >
//                 {/* **REPLACED ICON** */}
//                 <Trash2 className="w-4 h-4" /> Delete
//               </button>
//             </div>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }

// // ---------- Small child components used above ----------
// function SetupForm({ onSubmit }) {
//   const [password, setPassword] = useState("");
//   const [showPass, setShowPass] = useState(false);
//   return (
//     <form
//       onSubmit={(e) => {
//         e.preventDefault();
//         onSubmit(password);
//       }}
//     >
//       <div className="mb-6 relative">
//         <label className="block text-sm font-medium text-gray-400 mb-2">
//           Set Master Password
//         </label>
//         <div className="relative">
//           <input
//             type={showPass ? "text" : "password"}
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//             minLength={8}
//             placeholder="••••••••••••"
//             className="w-full p-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
//           />
//           <button
//             type="button"
//             className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
//             onClick={() => setShowPass(!showPass)}
//           >
//             {/* **REPLACED ICON (DYNAMIC)** */}
//             {showPass ? (
//               <EyeOff className="w-5 h-5" />
//             ) : (
//               <Eye className="w-5 h-5" />
//             )}
//           </button>
//         </div>
//       </div>
//       <button
//         type="submit"
//         id="btn-setup-submit"
//         className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
//       >
//         <span>Create Local Vault</span>
//       </button>
//     </form>
//   );
// }

// function UnlockForm({ onSubmit }) {
//   const [password, setPassword] = useState("");
//   const [showPass, setShowPass] = useState(false);
//   return (
//     <form
//       onSubmit={(e) => {
//         e.preventDefault();
//         onSubmit(password);
//       }}
//     >
//       <div className="mb-6 text-left relative">
//         <label className="block text-sm font-medium text-gray-400 mb-2">
//           Master Password
//         </label>
//         <div className="relative">
//           <input
//             type={showPass ? "text" : "password"}
//             value={password}
//             onChange={(e) => setPassword(e.target.value)}
//             required
//             placeholder="••••••••••••"
//             className="w-full p-3 pr-12 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
//           />
//           <button
//             type="button"
//             className="absolute right-3 top-3 text-gray-500 hover:text-gray-300"
//             onClick={() => setShowPass(!showPass)}
//           >
//             {/* **REPLACED ICON (DYNAMIC)** */}
//             {showPass ? (
//               <EyeOff className="w-5 h-5" />
//             ) : (
//               <Eye className="w-5 h-5" />
//             )}
//           </button>
//         </div>
//       </div>
//       <button
//         type="submit"
//         id="btn-unlock-submit"
//         className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 rounded-lg font-medium transition-colors flex justify-center items-center gap-2"
//       >
//         <span>Unlock Vault</span>
//       </button>
//     </form>
//   );
// }

// function NewFolderForm({ createFolder }) {
//   const [name, setName] = useState("");
//   const [isCreating, setIsCreating] = useState(false);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     if (!name.trim()) return;
//     setIsCreating(true);
//     try {
//       await createFolder(name.trim());
//       setName("");
//     } catch (e) {
//       console.error("Error creating folder:", e);
//     } finally {
//       setIsCreating(false);
//     }
//   };

//   return (
//     <form
//       onSubmit={handleSubmit}
//       className="flex gap-2 p-2 bg-gray-800 rounded-xl flex-none"
//     >
//       <input
//         type="text"
//         placeholder="New Folder Name"
//         value={name}
//         onChange={(e) => setName(e.target.value)}
//         className="flex-1 px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 outline-none transition-all text-sm"
//         disabled={isCreating}
//       />
//       <button
//         type="submit"
//         className={`p-2 rounded-lg transition-colors text-white ${
//           isCreating
//             ? "bg-indigo-700/50 cursor-not-allowed"
//             : "bg-indigo-600 hover:bg-indigo-500"
//         }`}
//         disabled={!name.trim() || isCreating}
//       >
//         {isCreating ? (
//           <Loader2 className="w-5 h-5 animate-spin" />
//         ) : (
//           <FolderPlus className="w-5 h-5" />
//         )}
//       </button>
//     </form>
//   );
// }