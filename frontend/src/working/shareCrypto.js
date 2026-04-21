import CryptoJS from "crypto-js";

export const bytesFromWordArray = (wordArray) => {
  const { words, sigBytes } = wordArray;
  const result = new Uint8Array(sigBytes);

  for (let index = 0; index < sigBytes; index += 1) {
    result[index] = (words[index >>> 2] >>> (24 - (index % 4) * 8)) & 0xff;
  }

  return result;
};

export const decryptCipherTextToBlob = (cipherText, key, mimeType) => {
  const decrypted = CryptoJS.AES.decrypt(cipherText, key);

  if (!decrypted.sigBytes || decrypted.sigBytes <= 0) {
    throw new Error("Unable to decrypt this file with the provided key.");
  }

  return new Blob([bytesFromWordArray(decrypted)], {
    type: mimeType || "application/octet-stream"
  });
};

export const encryptBlobWithKey = async (blob, key) => {
  const buffer = await blob.arrayBuffer();
  const wordArray = CryptoJS.lib.WordArray.create(buffer);
  return CryptoJS.AES.encrypt(wordArray, key).toString();
};

export const createRandomShareKey = () => CryptoJS.lib.WordArray.random(16).toString();

export const getPreviewKind = (mimeType = "") => {
  if (mimeType.startsWith("image/")) return "image";
  if (
    mimeType.startsWith("text/") ||
    mimeType.includes("json") ||
    mimeType.includes("javascript") ||
    mimeType.includes("xml")
  ) {
    return "text";
  }
  if (mimeType === "application/pdf") return "pdf";
  return "binary";
};

export const openBlobDownload = (blob, fileName) => {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = fileName;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};
