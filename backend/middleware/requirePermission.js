import userModel from "../models/userModel.js";
import { hasPermission } from "../utils/rbac.js";

const requirePermission = (permission) => async (req, res, next) => {
  try {
    const user = await userModel.findById(req.user.id).select("role");

    if (!user || !hasPermission(user, permission)) {
      return res.status(403).json({ success: false, message: "Insufficient permissions" });
    }

    req.authUser = user;
    return next();
  } catch (error) {
    return res.status(500).json({ success: false, message: error.message });
  }
};

export default requirePermission;
