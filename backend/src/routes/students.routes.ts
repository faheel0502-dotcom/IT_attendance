import { Router } from 'express'
import {
  getAllStudents,
  getStudentsForCourse,
  addStudentToCourse,
  removeStudentFromCourse,
  bulkImportStudents,
  enrollDefaultStudents,
  enrollSelectedStudents,
  addStudentToSection,
  bulkImportToSection,
  deleteStudent,
  bulkDeleteStudents,
} from '../controllers/students.controller'
import { authenticate } from '../middleware/auth.middleware'

const router = Router()

router.use(authenticate)

// Master student list & Section management
router.get('/', getAllStudents)
router.post('/section', addStudentToSection)
router.post('/section/bulk', bulkImportToSection)
router.post('/bulk-delete', bulkDeleteStudents)
router.delete('/:id', deleteStudent)

// Course-scoped student operations
router.get('/course/:courseId', getStudentsForCourse)
router.post('/course/:courseId', addStudentToCourse)
router.delete('/course/:courseId/:studentId', removeStudentFromCourse)
router.post('/course/:courseId/bulk', bulkImportStudents)
router.post('/course/:courseId/enroll-all', enrollDefaultStudents)
router.post('/course/:courseId/enroll-selected', enrollSelectedStudents)

export default router
