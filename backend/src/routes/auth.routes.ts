import { Router } from 'express'
import { login, getMe, register, changePassword } from '../controllers/auth.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.post('/login', login)
router.post('/register', register) // Admin use: create faculty accounts
router.get('/me', authenticate, getMe)
router.post('/change-password', authenticate, changePassword)

export default router

