import express from 'express'
// import { register, login, logout, sendVerifyOTP, verifyEmail, isAuthenticated, resetPassword, sendResetPasswordOTP } from '../controllers/authControllers.js'
import {
  register,
  login,
  logout,
  sendVerifyOTP,
  verifyEmail,
  isAuthenticated,
  resetPassword,
  sendResetPasswordOTP,
  verifyResetOTP
} from '../controllers/authControllers.js'

import userAuth from '../middleware/userAuth.js'

const authrouter = express.Router()

authrouter.post('/register', register)
authrouter.post('/login', login)
authrouter.post('/logout', logout)
authrouter.post('/send-verify-otp', userAuth, sendVerifyOTP)
authrouter.post('/verify-account', userAuth, verifyEmail)
authrouter.get('/is-auth', userAuth, isAuthenticated)
authrouter.post('/send-reset-otp', sendResetPasswordOTP)
authrouter.post('/verify-reset-otp', verifyResetOTP)
authrouter.post('/reset-password', resetPassword)

export default authrouter