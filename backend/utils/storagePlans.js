const GB = 1073741824;

export const STORAGE_PLANS = {
  free: {
    label: "Free",
    price: 0,
    storageBytes: 1 * GB,
    storageLabel: "1 GB"
  },
  basic: {
    label: "Basic",
    price: 10,
    storageBytes: 10 * GB,
    storageLabel: "10 GB"
  },
  pro: {
    label: "Pro",
    price: 100,
    storageBytes: 100 * GB,
    storageLabel: "100 GB"
  }
};

export const getPlanLimit = (plan) => {
  const config = STORAGE_PLANS[plan];
  return config ? config.storageBytes : STORAGE_PLANS.free.storageBytes;
};

export const getPlanInfo = (plan) =>
  STORAGE_PLANS[plan] || STORAGE_PLANS.free;

export const formatBytes = (bytes = 0) => {
  const n = Number(bytes) || 0;
  if (n >= GB) return `${(n / GB).toFixed(2)} GB`;
  if (n >= 1048576) return `${(n / 1048576).toFixed(2)} MB`;
  if (n >= 1024) return `${(n / 1024).toFixed(2)} KB`;
  return `${n} B`;
};
