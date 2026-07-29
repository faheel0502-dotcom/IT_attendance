import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

// Helper to format student with both rollNumber and roll_number for frontend compatibility
function formatStudent(student: any) {
  if (!student) return null
  return {
    ...student,
    roll_number: student.rollNumber,
  }
}

// GET /api/students — all students or filtered by batch query ?batch=...
export async function getAllStudents(req: Request, res: Response): Promise<void> {
  try {
    const batchFilter = req.query.batch ? String(req.query.batch) : undefined

    const students = await prisma.student.findMany({
      where: batchFilter ? { batch: batchFilter } : undefined,
      select: { id: true, rollNumber: true, name: true, email: true, batch: true },
      orderBy: { rollNumber: 'asc' },
    })
    res.json(students.map(formatStudent))
  } catch (err: unknown) {
    console.error('[getAllStudents Error]:', err)
    res.status(500).json({ error: 'Unable to load student list. Please refresh and try again.' })
  }
}

// POST /api/students/section — Add student directly to a class section/batch
export async function addStudentToSection(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const rollNumber = String(_req.body.rollNumber || '').trim()
    const name = String(_req.body.name || '').trim()
    const email = _req.body.email ? String(_req.body.email).trim() : null
    const batch = String(_req.body.batch || '').trim()

    if (!rollNumber || !name || !batch) {
      res.status(400).json({ error: 'Roll number, name, and class section are required.' })
      return
    }

    const student = await prisma.student.upsert({
      where: { rollNumber },
      update: { name, email, batch },
      create: { rollNumber, name, email, batch },
    })

    res.status(201).json(formatStudent(student))
  } catch (err: unknown) {
    console.error('[addStudentToSection Error]:', err)
    res.status(500).json({ error: 'Unable to add student to class section.' })
  }
}

// POST /api/students/section/bulk — Bulk import students into a class section
export async function bulkImportToSection(_req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const batch = String(_req.body.batch || '').trim()
    const students: Array<{ rollNumber: string; name: string; email?: string }> = _req.body.students

    if (!batch || !Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: 'Class section name and non-empty students array are required.' })
      return
    }

    const validStudents = students
      .map((s) => ({
        rollNumber: String(s.rollNumber || '').trim(),
        name: String(s.name || '').trim(),
        email: s.email ? String(s.email).trim() : null,
        batch,
      }))
      .filter((s) => s.rollNumber && s.name)

    if (validStudents.length > 0) {
      await prisma.student.createMany({
        data: validStudents,
        skipDuplicates: true,
      })
    }

    res.status(201).json({ count: validStudents.length })
  } catch (err: unknown) {
    console.error('[bulkImportToSection Error]:', err)
    res.status(500).json({ error: 'Unable to bulk import students into class section.' })
  }
}

// DELETE /api/students/:id — Delete student from master list
export async function deleteStudent(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id)
    await prisma.student.delete({ where: { id } })
    res.json({ success: true })
  } catch (err: unknown) {
    console.error('[deleteStudent Error]:', err)
    res.status(500).json({ error: 'Unable to delete student.' })
  }
}

// POST /api/students/bulk-delete — Bulk delete selected students
export async function bulkDeleteStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids.map(String) : []
    if (ids.length === 0) {
      res.status(400).json({ error: 'No student IDs provided for deletion.' })
      return
    }

    const result = await prisma.student.deleteMany({
      where: { id: { in: ids } },
    })

    res.json({ count: result.count })
  } catch (err: unknown) {
    console.error('[bulkDeleteStudents Error]:', err)
    res.status(500).json({ error: 'Unable to delete selected students.' })
  }
}

// GET /api/students/course/:courseId
export async function getStudentsForCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.params.courseId)

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    const enrollments = await prisma.courseStudent.findMany({
      where: { courseId },
      include: {
        student: {
          select: { id: true, rollNumber: true, name: true, email: true, batch: true, createdAt: true },
        },
      },
    })

    // Sort by roll number using natural alphanumeric order (handles RRNs like 22BD1A1201)
    const sorted = enrollments
      .map((e) => e.student)
      .filter(Boolean)
      .sort((a, b) =>
        (a!.rollNumber || '').localeCompare(b!.rollNumber || '', undefined, { numeric: true, sensitivity: 'base' })
      )

    res.json(sorted.map(formatStudent))
  } catch (err: unknown) {
    console.error('[getStudentsForCourse Error]:', err)
    res.status(500).json({ error: 'Unable to load students. Please refresh and try again.' })
  }
}

// POST /api/students/course/:courseId — add single student to course
export async function addStudentToCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.params.courseId)
    const rollNumber = String(req.body.rollNumber || '').trim()
    const name = String(req.body.name || '').trim()
    const email = req.body.email ? String(req.body.email).trim() : null
    const batch = req.body.batch ? String(req.body.batch).trim() : null

    if (!rollNumber || !name) {
      res.status(400).json({ error: 'Roll number and name are required.' })
      return
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    const student = await prisma.student.upsert({
      where: { rollNumber },
      update: { name, email, batch },
      create: { rollNumber, name, email, batch },
    })

    await prisma.courseStudent.upsert({
      where: { courseId_studentId: { courseId, studentId: student.id } },
      update: {},
      create: { courseId, studentId: student.id },
    })

    res.status(201).json(formatStudent(student))
  } catch (err: unknown) {
    console.error('[addStudentToCourse Error]:', err)
    res.status(500).json({ error: 'Unable to save student. Please try again.' })
  }
}

// DELETE /api/students/course/:courseId/:studentId
export async function removeStudentFromCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.params.courseId)
    const studentId = String(req.params.studentId)

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    await prisma.courseStudent.delete({
      where: { courseId_studentId: { courseId, studentId } },
    })

    res.json({ success: true })
  } catch (err: unknown) {
    console.error('[removeStudentFromCourse Error]:', err)
    res.status(500).json({ error: 'Unable to remove student. Please try again.' })
  }
}

// POST /api/students/course/:courseId/bulk — Excel import for a course
export async function bulkImportStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.params.courseId)
    const students: Array<{ rollNumber: string; name: string; email?: string; batch?: string }> = req.body.students

    if (!Array.isArray(students) || students.length === 0) {
      res.status(400).json({ error: 'Students array is required.' })
      return
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    const validStudents = students
      .map((s) => ({
        rollNumber: String(s.rollNumber || '').trim(),
        name: String(s.name || '').trim(),
        email: s.email ? String(s.email).trim() : null,
        batch: s.batch ? String(s.batch).trim() : null,
      }))
      .filter((s) => s.rollNumber && s.name)

    if (validStudents.length > 0) {
      await prisma.student.createMany({
        data: validStudents,
        skipDuplicates: true,
      })

      const allStudents = await prisma.student.findMany({
        where: { rollNumber: { in: validStudents.map((s) => s.rollNumber) } },
        select: { id: true },
      })

      await prisma.courseStudent.createMany({
        data: allStudents.map((s) => ({ courseId, studentId: s.id })),
        skipDuplicates: true,
      })
    }

    res.status(201).json({ count: validStudents.length })
  } catch (err: unknown) {
    console.error('[bulkImportStudents Error]:', err)
    res.status(500).json({ error: 'Unable to import students. Please try again.' })
  }
}

// POST /api/students/course/:courseId/enroll-all
export async function enrollDefaultStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.params.courseId)
    const className = req.body.className ? String(req.body.className).trim() : undefined

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    const targetClass = className || course.className

    const targetStudents = await prisma.student.findMany({
      where: targetClass ? { batch: targetClass } : undefined,
      select: { id: true },
    })

    if (targetStudents.length > 0) {
      await prisma.courseStudent.createMany({
        data: targetStudents.map((s) => ({ courseId, studentId: s.id })),
        skipDuplicates: true,
      })
    }

    res.json({ count: targetStudents.length })
  } catch (err: unknown) {
    console.error('[enrollDefaultStudents Error]:', err)
    res.status(500).json({ error: 'Unable to enroll default students. Please try again.' })
  }
}

// POST /api/students/course/:courseId/enroll-selected
export async function enrollSelectedStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.params.courseId)
    const studentIds: string[] = Array.isArray(req.body.studentIds) ? req.body.studentIds.map(String) : []

    if (studentIds.length === 0) {
      res.status(400).json({ error: 'studentIds array is required.' })
      return
    }

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    await prisma.courseStudent.createMany({
      data: studentIds.map((studentId) => ({ courseId, studentId })),
      skipDuplicates: true,
    })

    res.json({ count: studentIds.length })
  } catch (err: unknown) {
    console.error('[enrollSelectedStudents Error]:', err)
    res.status(500).json({ error: 'Unable to enroll selected students. Please try again.' })
  }
}
