import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

// Helper to normalize course properties for frontend compatibility (both snake_case and camelCase)
function formatCourse(course: any) {
  if (!course) return null
  return {
    ...course,
    course_code: course.courseCode,
    course_name: course.courseName,
    class_name: course.className,
    course_students: course._count ? [{ count: course._count.courseStudents }] : undefined,
  }
}

// GET /api/courses
export async function getCourses(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courses = await prisma.course.findMany({
      where: { facultyId: req.faculty!.id },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { courseStudents: true } },
      },
    })

    res.json(courses.map(formatCourse))
  } catch (err) {
    console.error('[getCourses Error]:', err)
    res.status(500).json({ error: 'Unable to load courses. Please refresh and try again.' })
  }
}

// GET /api/courses/:id
export async function getCourseById(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id)

    const course = await prisma.course.findFirst({
      where: { id, facultyId: req.faculty!.id },
      include: {
        _count: { select: { courseStudents: true } },
      },
    })

    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    res.json(formatCourse(course))
  } catch (err) {
    console.error('[getCourseById Error]:', err)
    res.status(500).json({ error: 'Course not found.' })
  }
}

// POST /api/courses
export async function createCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseCode = String(req.body.courseCode || '')
    const courseName = String(req.body.courseName || '')
    const semester = req.body.semester ? String(req.body.semester) : undefined
    const className = req.body.className ? String(req.body.className) : undefined
    const enrollmentType = String(req.body.enrollmentType || 'default')

    if (!courseCode || !courseName) {
      res.status(400).json({ error: 'Course code and name are required.' })
      return
    }

    const course = await prisma.course.create({
      data: {
        facultyId: req.faculty!.id,
        courseCode,
        courseName,
        semester,
        className,
        enrollmentType,
      },
    })

    res.status(201).json(formatCourse(course))
  } catch (err: unknown) {
    console.error('[createCourse Error]:', err)
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
      res.status(409).json({ error: 'A course with this code already exists.' })
      return
    }
    res.status(500).json({ error: 'Unable to create course. Please try again.' })
  }
}

// DELETE /api/courses/:id
export async function deleteCourse(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id)

    const course = await prisma.course.findFirst({
      where: { id, facultyId: req.faculty!.id },
    })

    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    await prisma.course.delete({ where: { id } })
    res.json({ success: true })
  } catch (err) {
    console.error('[deleteCourse Error]:', err)
    res.status(500).json({ error: 'Unable to delete course. Please try again.' })
  }
}
