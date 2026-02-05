import express from "express";
import cors from "cors";
import "dotenv/config.js";
import cookieParser from "cookie-parser";
import vaultRouter from "./routes/vaultRouter.js";

import connectDb from "./config/db.js";
import authRouter from "./routes/authRoutes.js"
import userRouter from "./routes/userRoutes.js";

const app = express();
const port = process.env.PORT || 4000;
connectDb();

const allowedOrigins = ['http://localhost:5173', 'http://localhost:5174']
app.use(cors({origin: allowedOrigins,credentials: true}));

app.use(express.json());
app.use(cookieParser());


//API Routes
app.get("/", (req,res) => {
    res.send("API is running...");
})
app.use("/api/auth", authRouter)
app.use("/api/user", userRouter)
app.use("/api/vault", vaultRouter)

app.listen(port, () => console.log(`Server running on port ${port}`));