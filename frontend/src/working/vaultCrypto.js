import CryptoJS from "crypto-js";
import { decryptCipherTextToBlob } from "./shareCrypto";

const PBKDF2_ITERATIONS = 210000;
const DERIVED_BITS_LENGTH = 64;
const textEncoder = new TextEncoder();

const toBase64 = (bufferLike) => {
  const bytes = bufferLike instanceof Uint8Array ? bufferLike : new Uint8Array(bufferLike);
  let binary = "";

  for (let index = 0; index < bytes.length; index += 1) {
    binary += String.fromCharCode(bytes[index]);
  }

  return btoa(binary);
};

const fromBase64 = (value) => {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }

  return bytes;
};

const importVaultKey = async (vaultKeyBase64) =>
  window.crypto.subtle.importKey(
    "raw",
    fromBase64(vaultKeyBase64),
    "AES-GCM",
    false,
    ["encrypt", "decrypt"]
  );

const deriveBytesFromPassword = async (password, saltBase64, iterations = PBKDF2_ITERATIONS) => {
  const passwordKey = await window.crypto.subtle.importKey(
    "raw",
    textEncoder.encode(password),
    "PBKDF2",
    false,
    ["deriveBits"]
  );

  const derivedBits = await window.crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt: fromBase64(saltBase64),
      iterations
    },
    passwordKey,
    DERIVED_BITS_LENGTH * 8
  );

  return new Uint8Array(derivedBits);
};

export const deriveLegacyVaultKey = (password) => CryptoJS.SHA256(password).toString();

export const deriveVaultSecrets = async (password, saltBase64, iterations = PBKDF2_ITERATIONS) => {
  const derivedBytes = await deriveBytesFromPassword(password, saltBase64, iterations);
  const vaultKey = derivedBytes.slice(0, 32);
  const authVerifier = derivedBytes.slice(32);

  return {
    vaultKey: toBase64(vaultKey),
    authVerifier: toBase64(authVerifier)
  };
};

export const createVaultSetupPayload = async (password) => {
  const vaultSalt = toBase64(window.crypto.getRandomValues(new Uint8Array(16)));
  const vaultIterations = PBKDF2_ITERATIONS;
  const derived = await deriveVaultSecrets(password, vaultSalt, vaultIterations);

  return {
    vaultSalt,
    vaultIterations,
    ...derived
  };
};

export const encryptFileForVault = async (file, vaultKeyBase64) => {
  const plainBuffer = await file.arrayBuffer();
  const fileIv = window.crypto.getRandomValues(new Uint8Array(12));
  const wrapIv = window.crypto.getRandomValues(new Uint8Array(12));
  const integrityHashBuffer = await window.crypto.subtle.digest("SHA-256", plainBuffer);
  const vaultKey = await importVaultKey(vaultKeyBase64);
  const dataEncryptionKey = await window.crypto.subtle.generateKey(
    { name: "AES-GCM", length: 256 },
    true,
    ["encrypt", "decrypt"]
  );
  const encryptedBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: fileIv },
    dataEncryptionKey,
    plainBuffer
  );
  const rawDek = await window.crypto.subtle.exportKey("raw", dataEncryptionKey);
  const wrappedDekBuffer = await window.crypto.subtle.encrypt(
    { name: "AES-GCM", iv: wrapIv },
    vaultKey,
    rawDek
  );

  return {
    encryptedBlob: new Blob([encryptedBuffer], { type: "application/octet-stream" }),
    metadata: {
      encryptionVersion: "zk-v1",
      encryptedDek: toBase64(wrappedDekBuffer),
      fileIv: toBase64(fileIv),
      wrapIv: toBase64(wrapIv),
      integrityHash: toBase64(integrityHashBuffer),
      originalName: file.name,
      originalType: file.type || "application/octet-stream",
      sizeBytes: file.size
    }
  };
};

export const decryptVaultFileBlob = async (encryptedBuffer, fileMeta, vaultSession) => {
  if (fileMeta.encryptionVersion === "zk-v1" && fileMeta.encryptedDek && fileMeta.fileIv && fileMeta.wrapIv) {
    if (!vaultSession?.vaultKey) {
      throw new Error("Vault key expired. Please unlock the vault again.");
    }

    const vaultKey = await importVaultKey(vaultSession.vaultKey);
    const rawDek = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(fileMeta.wrapIv) },
      vaultKey,
      fromBase64(fileMeta.encryptedDek)
    );
    const dataEncryptionKey = await window.crypto.subtle.importKey(
      "raw",
      rawDek,
      "AES-GCM",
      false,
      ["decrypt"]
    );
    const plainBuffer = await window.crypto.subtle.decrypt(
      { name: "AES-GCM", iv: fromBase64(fileMeta.fileIv) },
      dataEncryptionKey,
      encryptedBuffer
    );

    if (fileMeta.integrityHash) {
      const integrityHashBuffer = await window.crypto.subtle.digest("SHA-256", plainBuffer);
      if (toBase64(integrityHashBuffer) !== fileMeta.integrityHash) {
        throw new Error("File integrity verification failed. The encrypted blob may have been tampered with.");
      }
    }

    return new Blob([plainBuffer], { type: fileMeta.type || "application/octet-stream" });
  }

  if (!vaultSession?.legacyKey) {
    throw new Error("Legacy vault key expired. Please unlock the vault again.");
  }

  const cipherText = new TextDecoder().decode(encryptedBuffer);
  return decryptCipherTextToBlob(cipherText, vaultSession.legacyKey, fileMeta.type);
};
