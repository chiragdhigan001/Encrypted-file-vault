import userModel from "../models/userModel.js";

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
                isAccountverified: user.isAccountVerified
            }
        })

    } catch (error) {
        return res.json({ success: false, message: error.message})
    }
    
}

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
