import { Router } from 'express'
import { getDashboardStats, getAttendanceTrend, getLowAttendanceStudents, getTodaySchedule } from '../controllers/dashboard.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/stats', getDashboardStats)
router.get('/trend', getAttendanceTrend)
router.get('/low-attendance', getLowAttendanceStudents)
router.get('/today-schedule', getTodaySchedule)

export default router
