import express from "express";
import { setVaultPassword, passwordUnlockVault } from "../controllers/vaultController.js";
import userAuth from "../middleware/userAuth.js";

const vaultRouter = express.Router()

vaultRouter.post("/set-password", userAuth, setVaultPassword)
vaultRouter.post("/unlock", userAuth, passwordUnlockVault)

export default vaultRouter;