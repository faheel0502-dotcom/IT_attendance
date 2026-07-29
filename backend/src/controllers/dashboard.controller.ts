import { Response } from 'express'
import { subDays, format } from 'date-fns'
import { prisma } from '../lib/prisma'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

const MIN_ATTENDANCE_PERCENTAGE = 75

// GET /api/dashboard/stats
export async function getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const facultyId = req.faculty!.id

    const totalCourses = await prisma.course.count({ where: { facultyId } })

    // Unique students across all faculty's courses
    const studentLinks = await prisma.courseStudent.findMany({
      where: { course: { facultyId } },
      select: { studentId: true },
    })
    const uniqueStudents = new Set(studentLinks.map((r) => r.studentId)).size

    res.json({ totalCourses, totalStudents: uniqueStudents })
  } catch {
    res.status(500).json({ error: 'Unable to load dashboard stats.' })
  }
}

// GET /api/dashboard/trend
export async function getAttendanceTrend(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const facultyId = req.faculty!.id
    const days = 7
    const startDate = subDays(new Date(), days - 1)

    const sessions = await prisma.attendance.findMany({
      where: {
        course: { facultyId },
        date: { gte: startDate },
      },
      include: { attendanceDetails: { select: { status: true } } },
    })

    // Build 7-day map
    const trendMap: Record<string, { date: string; label: string; present: number; absent: number }> = {}
    for (let i = 0; i < days; i++) {
      const d = format(subDays(new Date(), days - 1 - i), 'yyyy-MM-dd')
      trendMap[d] = { date: d, label: format(new Date(d + 'T00:00:00'), 'EEE'), present: 0, absent: 0 }
    }

    sessions.forEach((session) => {
      const d = format(session.date, 'yyyy-MM-dd')
      if (!trendMap[d]) return
      session.attendanceDetails.forEach((det) => {
        if (det.status === 'Present') trendMap[d].present++
        else trendMap[d].absent++
      })
    })

    res.json(Object.values(trendMap))
  } catch {
    res.status(500).json({ error: 'Unable to load attendance trend.' })
  }
}

// GET /api/dashboard/low-attendance
export async function getLowAttendanceStudents(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const facultyId = req.faculty!.id

    const details = await prisma.attendanceDetail.findMany({
      where: { attendance: { course: { facultyId } } },
      include: {
        student: { select: { id: true, name: true, rollNumber: true } },
        attendance: {
          select: {
            courseId: true,
            course: { select: { courseName: true, courseCode: true } },
          },
        },
      },
    })

    const map: Record<string, { studentId: string; name: string; rollNumber: string; courseCode: string; courseName: string; present: number; total: number }> = {}

    details.forEach((row) => {
      const k = `${row.studentId}::${row.attendance.courseId}`
      if (!map[k]) {
        map[k] = {
          studentId: row.studentId,
          name: row.student.name,
          rollNumber: row.student.rollNumber,
          courseCode: row.attendance.course.courseCode,
          courseName: row.attendance.course.courseName,
          present: 0,
          total: 0,
        }
      }
      map[k].total++
      if (row.status === 'Present') map[k].present++
    })

    const result = Object.values(map)
      .map((r) => ({ ...r, percentage: r.total > 0 ? Math.round((r.present / r.total) * 100) : 0 }))
      .filter((r) => r.percentage < MIN_ATTENDANCE_PERCENTAGE)
      .sort((a, b) => a.percentage - b.percentage)

    res.json(result)
  } catch {
    res.status(500).json({ error: 'Unable to load low attendance list.' })
  }
}

// GET /api/dashboard/today-schedule
export async function getTodaySchedule(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const facultyId = req.faculty!.id
    const jsDay = new Date().getDay()
    const dayOfWeek = jsDay === 0 ? 7 : jsDay

    const entries = await prisma.timetable.findMany({
      where: { course: { facultyId }, dayOfWeek },
      orderBy: { hour: 'asc' },
      include: {
        course: { select: { courseName: true, courseCode: true, facultyId: true } },
      },
    })

    res.json(entries)
  } catch {
    res.status(500).json({ error: 'Unable to load today\'s schedule.' })
  }
}
