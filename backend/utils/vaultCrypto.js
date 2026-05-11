import crypto from "crypto";

const AUTH_DERIVATION_LENGTH = 64;

export const deriveVaultAuthVerifier = (password, salt, iterations) => {
  const derived = crypto.pbkdf2Sync(
    password,
    Buffer.from(salt, "base64"),
    Number(iterations),
    AUTH_DERIVATION_LENGTH,
    "sha256"
  );

  return derived.subarray(32).toString("base64");
};

export const createVaultSalt = () => crypto.randomBytes(16).toString("base64");
