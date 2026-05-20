import express from "express";
import cors from "cors";
import "dotenv/config.js";
import cookieParser from "cookie-parser";
import vaultRouter from "./routes/vaultRouter.js";

import connectDb from "./config/db.js";
import authRouter from "./routes/authRoutes.js"
import userRouter from "./routes/userRoutes.js";
import shareRouter from "./routes/shareRoutes.js";
import requestContext from "./middleware/requestContext.js";
import securityRouter from "./routes/securityRoutes.js";
import rateLimit from "./middleware/rateLimit.js";
import logger from "./utils/logger.js";

const app = express();
const port = process.env.PORT || 4000;
app.set("trust proxy", 1); // fixed
// DEBUG
console.log("GOOGLE CLIENT ID:", process.env.GOOGLE_CLIENT_ID);
connectDb();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174',"https://encrypted-file-vault.vercel.app"] //fixed
app.use(cors({origin: allowedOrigins,credentials: true}));
app.disable("x-powered-by");
app.use(requestContext);
app.use(express.json({ limit: "10mb" }));
app.use(cookieParser());


//API Routes
app.get("/", (req,res) => {
    res.send("API is running...");
})
app.get("/health", (req,res) => {
    res.json({ success: true, status: "ok", uptime: process.uptime(), environment: process.env.NODE_ENV || "development" });
})
app.use("/api/auth", rateLimit({ keyPrefix: "auth", limit: 40, windowMs: 15 * 60 * 1000 }));
app.use("/api/vault", rateLimit({ keyPrefix: "vault", limit: 200, windowMs: 15 * 60 * 1000 }));
app.use("/api/share", rateLimit({ keyPrefix: "share", limit: 180, windowMs: 15 * 60 * 1000 }));
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/vault", vaultRouter)
app.use("/api/share", shareRouter)
app.use("/api/security", securityRouter)

app.listen(port, () => logger.info(`Server running on port ${port}`, { port }));
