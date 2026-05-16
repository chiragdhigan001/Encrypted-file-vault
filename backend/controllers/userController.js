import userModel from "../models/userModel.js";
import { getRolePermissions } from "../utils/rbac.js";
import { getPlanInfo } from "../utils/storagePlans.js";

export const getUserData = async (req,res) => {
    try {
        const userId = req.user.id
        const user = await userModel.findById(userId)

        if(!user) {
            return res.json({ success: false, message: ' User not found'})
        }
        return res.json({ success: true, 
            userData: {
                id: user._id,
                name: user.name,
                email: user.email,
                isAccountverified: user.isAccountVerified,
                role: user.role,
                permissions: getRolePermissions(user.role),
                isMfaEnabled: user.isMfaEnabled,
                isGoogleConnected: Boolean(user.googleId),
                lastLoginAt: user.lastLoginAt,
                storagePlan: user.storagePlan,
                storageUsedBytes: user.storageUsedBytes || 0
            }
        })

    } catch (error) {
        return res.json({ success: false, message: error.message})
    }
    
}

export const processPayment = async (req, res) => {
  try {
    const userId = req.user.id;
    const { plan, cardNumber, cardName, expiry, cvv } = req.body;

    if (!["basic", "pro"].includes(plan)) {
      return res.json({ success: false, message: "Invalid plan for payment." });
    }

    if (!cardNumber || !cardName || !expiry || !cvv) {
      return res.json({ success: false, message: "All card fields are required." });
    }

    const planInfo = getPlanInfo(plan);
    const price = planInfo.price;

    // Simulated payment processing — no real charge
    const user = await userModel.findByIdAndUpdate(
      userId,
      { storagePlan: plan },
      { new: true }
    ).select("storagePlan storageUsedBytes");

    return res.json({
      success: true,
      message: `Payment of $${price} processed. Upgraded to ${planInfo.label} (${planInfo.storageLabel}).`,
      storagePlan: user.storagePlan,
      storageUsedBytes: user.storageUsedBytes,
      storageLimitBytes: planInfo.storageBytes
    });
  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export const upgradePlan = async (req, res) => {
    try {
        const userId = req.user.id;
        const { plan } = req.body;

        if (!["free", "basic", "pro"].includes(plan)) {
            return res.json({ success: false, message: "Invalid plan. Choose free, basic ($10), or pro ($100)." });
        }

        const planInfo = getPlanInfo(plan);
        const user = await userModel.findByIdAndUpdate(
            userId,
            { storagePlan: plan },
            { new: true }
        ).select("storagePlan storageUsedBytes");

        return res.json({
            success: true,
            message: `Plan upgraded to ${planInfo.label} (${planInfo.storageLabel}).`,
            storagePlan: user.storagePlan,
            storageUsedBytes: user.storageUsedBytes,
            storageLimitBytes: planInfo.storageBytes
        });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
};

export const searchUsers = async (req, res) => {
    try {
        const userId = req.user.id;
        const query = String(req.query.query || "").trim();

        if (query.length < 2) {
            return res.json({ success: true, users: [] });
        }

        const users = await userModel
            .find({
                _id: { $ne: userId },
                name: { $regex: query, $options: "i" }
            })
            .select("_id name email")
            .limit(10);

        return res.json({ success: true, users });
    } catch (error) {
        return res.json({ success: false, message: error.message });
    }
}
