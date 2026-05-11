const buckets = new Map();

const rateLimit = ({ keyPrefix, limit, windowMs }) => (req, res, next) => {
  const key = `${keyPrefix}:${req.ip || "unknown"}`;
  const now = Date.now();
  const bucket = buckets.get(key) || { count: 0, resetAt: now + windowMs };

  if (bucket.resetAt < now) {
    bucket.count = 0;
    bucket.resetAt = now + windowMs;
  }

  bucket.count += 1;
  buckets.set(key, bucket);

  if (bucket.count > limit) {
    return res.status(429).json({
      success: false,
      message: "Too many requests. Please slow down and try again shortly."
    });
  }

  return next();
};

export default rateLimit;
