import { Router } from 'express'
import { getHolidays, addHoliday, deleteHoliday } from '../controllers/holidays.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/', getHolidays)
router.post('/', addHoliday)
router.delete('/:id', deleteHoliday)

export default router
