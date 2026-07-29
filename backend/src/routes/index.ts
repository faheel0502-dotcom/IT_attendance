import { Router } from 'express'
import authRoutes from './auth.routes'
import coursesRoutes from './courses.routes'
import studentsRoutes from './students.routes'
import attendanceRoutes from './attendance.routes'
import holidaysRoutes from './holidays.routes'
import timetableRoutes from './timetable.routes'
import dashboardRoutes from './dashboard.routes'

const router = Router()

router.use('/auth', authRoutes)
router.use('/courses', coursesRoutes)
router.use('/students', studentsRoutes)
router.use('/attendance', attendanceRoutes)
router.use('/holidays', holidaysRoutes)
router.use('/timetable', timetableRoutes)
router.use('/dashboard', dashboardRoutes)

export default router
