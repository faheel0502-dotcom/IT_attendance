import { Router } from 'express'
import {
  checkAttendanceExists,
  saveAttendance,
  getAttendanceHistory,
  getAllHistory,
  getSessionDetails,
  editAttendanceDetail,
  getReportData,
  getStudentAttendance,
} from '../controllers/attendance.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/check', checkAttendanceExists)
router.get('/all', getAllHistory)
router.get('/history', getAttendanceHistory)
router.get('/report', getReportData)
router.get('/student', getStudentAttendance)
router.get('/:id', getSessionDetails)
router.post('/', saveAttendance)
router.patch('/:id/detail', editAttendanceDetail)

export default router
