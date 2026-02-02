import jwt from "jsonwebtoken";

const userAuth = (req, res, next) => {
  const { token } = req.cookies;

  if (!token) {
    return res.json({ success: false, message: "Unauthorized Access" });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    if (!decoded?.id) {
      return res.json({ success: false, message: "Unauthorized Access" });
    }

    req.user = { id: decoded.id };

    next();

  } catch (error) {
    return res.json({ success: false, message: error.message });
  }
};

export default userAuth;
