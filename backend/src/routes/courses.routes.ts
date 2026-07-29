import { Router } from 'express'
import { getCourses, getCourseById, createCourse, deleteCourse } from '../controllers/courses.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

router.get('/', getCourses)
router.get('/:id', getCourseById)
router.post('/', createCourse)
router.delete('/:id', deleteCourse)

export default router
