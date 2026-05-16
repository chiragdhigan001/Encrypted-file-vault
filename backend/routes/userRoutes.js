import express from 'express'
import userAuth from '../middleware/userAuth.js'
import { getUserData, searchUsers, upgradePlan, processPayment } from '../controllers/userController.js'

const userRouter = express.Router()

userRouter.get('/data', userAuth, getUserData)
userRouter.get('/search', userAuth, searchUsers)
userRouter.post('/upgrade-plan', userAuth, upgradePlan)
userRouter.post('/process-payment', userAuth, processPayment)

export default userRouter
