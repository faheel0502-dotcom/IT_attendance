import { Router } from 'express'
import { getTimetable, addTimetableEntry, deleteTimetableEntry, deleteTimetableEntries } from '../controllers/timetable.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/', getTimetable)
router.post('/', addTimetableEntry)
router.delete('/bulk', deleteTimetableEntries)  // MUST come before /:id
router.delete('/:id', deleteTimetableEntry)

export default router
