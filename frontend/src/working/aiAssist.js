const financialPatterns = [
  /\b\d{4}\s?\d{4}\s?\d{4}\s?\d{4}\b/g,
  /\b(?:account|acct)\s*(?:number|no\.?)?\s*[:#-]?\s*\d{6,18}\b/gi,
  /\bifsc\s*[:#-]?\s*[A-Z]{4}0[A-Z0-9]{6}\b/gi
];

const identityPatterns = [
  /\b\d{4}\s\d{4}\s\d{4}\b/g,
  /\b[A-Z]{5}[0-9]{4}[A-Z]\b/g,
  /\bpassport\b/gi,
  /\bdriver'?s?\s+license\b/gi
];

const secretPatterns = [
  /\bAKIA[0-9A-Z]{16}\b/g,
  /\bAIza[0-9A-Za-z\-_]{35}\b/g,
  /\b(?:password|passwd|secret|api[_-]?key|token)\b\s*[:=]\s*[^\s]+/gi
];

const detectFindings = (text) => {
  const findings = [];

  if (identityPatterns.some((pattern) => pattern.test(text))) findings.push("Personal");
  if (financialPatterns.some((pattern) => pattern.test(text))) findings.push("Financial");
  if (secretPatterns.some((pattern) => pattern.test(text))) findings.push("Confidential");
  if (/\bcontract|agreement|nda|terms\b/gi.test(text)) findings.push("Legal");

  return [...new Set(findings)];
};

const classifyCategory = (text, fileName) => {
  const corpus = `${fileName} ${text}`.toLowerCase();
  if (/\bresume|internship|certificate|id|passport|aadhaar|pan\b/.test(corpus)) return "Identity";
  if (/\bbank|invoice|salary|payment|finance|tax|statement\b/.test(corpus)) return "Finance";
  if (/\bcontract|agreement|policy|legal|nda\b/.test(corpus)) return "Legal";
  if (/\bemployee|offer|hr|leave\b/.test(corpus)) return "HR";
  if (/\bapi|backend|frontend|server|deploy|engineering|code\b/.test(corpus)) return "Engineering";
  return "Personal";
};

export const analyzeFileWithLocalAi = async (file) => {
  const result = {
    aiCategory: "",
    aiTags: [],
    aiSensitiveFindings: [],
    aiSummary: "",
    extractedTextPreview: ""
  };

  const probableText = file.type.startsWith("text/") || /\.(txt|md|json|csv|log)$/i.test(file.name);
  if (!probableText) {
    result.aiCategory = classifyCategory("", file.name);
    result.aiTags = [result.aiCategory];
    result.aiSummary = `Encrypted file named ${file.name} uploaded to the vault.`;
    return result;
  }

  try {
    const text = await file.text();
    const compact = text.replace(/\s+/g, " ").trim();
    const preview = compact.slice(0, 280);
    const findings = detectFindings(compact);
    const category = classifyCategory(compact, file.name);
    const tags = [...new Set([category, ...findings, compact.includes("confidential") ? "Sensitive" : null].filter(Boolean))];

    result.aiCategory = category;
    result.aiTags = tags;
    result.aiSensitiveFindings = findings;
    result.aiSummary = preview ? `${preview}${compact.length > 280 ? "..." : ""}` : `Encrypted text file ${file.name}.`;
    result.extractedTextPreview = compact.slice(0, 800);
    return result;
  } catch {
    result.aiCategory = classifyCategory("", file.name);
    result.aiTags = [result.aiCategory];
    result.aiSummary = `Encrypted file named ${file.name} uploaded to the vault.`;
    return result;
  }
};
