import { buildFingerprint } from "../utils/authSession.js";

const requestContext = (req, res, next) => {
  req.fingerprint = buildFingerprint(req);
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  next();
};

export default requestContext;
