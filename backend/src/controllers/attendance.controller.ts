import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

// GET /api/attendance/check?courseId=&date=&hour=
export async function checkAttendanceExists(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.query.courseId || '')
    const date = String(req.query.date || '')
    const hour = parseInt(String(req.query.hour || '0'), 10)

    const record = await prisma.attendance.findUnique({
      where: {
        courseId_date_hour: {
          courseId,
          date: new Date(date),
          hour,
        },
      },
      select: { id: true },
    })

    res.json({ exists: !!record, id: record?.id || null })
  } catch {
    res.status(500).json({ error: 'Unable to validate attendance. Please try again.' })
  }
}

// POST /api/attendance
export async function saveAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.body.courseId || '')
    const date = String(req.body.date || '')
    const isHoliday: boolean = Boolean(req.body.isHoliday)
    const holidayReason: string | null = req.body.holidayReason ? String(req.body.holidayReason) : null
    const studentStatuses: Array<{ studentId: string; status: string }> = req.body.studentStatuses || []

    const hoursList: number[] = Array.isArray(req.body.hours) && req.body.hours.length > 0
      ? req.body.hours.map(Number)
      : [parseInt(String(req.body.hour || '0'), 10)]

    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    const createdRecords: any[] = []

    for (const h of hoursList) {
      const attendance = await prisma.attendance.create({
        data: {
          courseId,
          date: new Date(date),
          hour: h,
          isHoliday,
          holidayReason,
        },
      })

      if (!isHoliday && studentStatuses.length > 0) {
        await prisma.attendanceDetail.createMany({
          data: studentStatuses.map((s) => ({
            attendanceId: attendance.id,
            studentId: String(s.studentId),
            status: String(s.status),
          })),
        })
      }
      createdRecords.push(attendance)
    }

    res.status(201).json(createdRecords)
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
      res.status(409).json({ error: 'Attendance for one or more of these hours is already marked.' })
      return
    }
    res.status(500).json({ error: 'Unable to save attendance. Please try again.' })
  }
}

// Helper to format attendance record for frontend compatibility
function formatAttendanceRecord(record: any) {
  if (!record) return null
  const formattedCourse = record.course
    ? {
        ...record.course,
        course_code: record.course.courseCode,
        course_name: record.course.courseName,
      }
    : undefined

  return {
    ...record,
    course_id: record.courseId,
    is_holiday: record.isHoliday,
    holiday_reason: record.holidayReason,
    courses: formattedCourse,
    course: formattedCourse,
    attendance_details: record.attendanceDetails || [],
    attendanceDetails: record.attendanceDetails || [],
  }
}

// Helper to format attendance detail row for frontend compatibility
function formatAttendanceDetailRow(d: any, latestEdit?: any) {
  if (!d) return null
  const formattedStudent = d.student
    ? {
        ...d.student,
        roll_number: d.student.rollNumber,
      }
    : undefined

  return {
    ...d,
    student: formattedStudent,
    students: formattedStudent,
    latest_edit_reason: latestEdit?.reason || null,
    edited_at: latestEdit?.editedAt || null,
  }
}

// GET /api/attendance/history?courseId=
export async function getAttendanceHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.query.courseId || '')

    const history = await prisma.attendance.findMany({
      where: { courseId },
      orderBy: [{ date: 'desc' }, { hour: 'desc' }],
      include: {
        course: { select: { courseName: true, courseCode: true } },
        attendanceDetails: { select: { id: true, status: true } },
      },
    })

    res.json(history.map(formatAttendanceRecord))
  } catch {
    res.status(500).json({ error: 'Unable to load attendance history. Please try again.' })
  }
}

// GET /api/attendance/all
export async function getAllHistory(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const history = await prisma.attendance.findMany({
      where: {
        course: { facultyId: req.faculty!.id },
      },
      orderBy: [{ date: 'desc' }, { hour: 'desc' }],
      take: 100,
      include: {
        course: { select: { courseName: true, courseCode: true, facultyId: true } },
        attendanceDetails: { select: { id: true, status: true } },
      },
    })

    res.json(history.map(formatAttendanceRecord))
  } catch {
    res.status(500).json({ error: 'Unable to load history. Please try again.' })
  }
}

// GET /api/attendance/:id
export async function getSessionDetails(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id)

    const details = await prisma.attendanceDetail.findMany({
      where: { attendanceId: id },
      orderBy: { student: { rollNumber: 'asc' } },
      include: {
        student: { select: { id: true, rollNumber: true, name: true, email: true } },
      },
    })

    const edits = await prisma.attendanceEdit.findMany({
      where: { attendanceId: id },
      orderBy: { editedAt: 'desc' },
      select: { studentId: true, reason: true, editedAt: true },
    })

    const detailsWithEdits = details.map((d) => {
      const latestEdit = edits.find((e) => e.studentId === d.studentId)
      return formatAttendanceDetailRow(d, latestEdit)
    })

    res.json(detailsWithEdits)
  } catch {
    res.status(500).json({ error: 'Unable to load session details. Please try again.' })
  }
}

// PATCH /api/attendance/:id/detail
export async function editAttendanceDetail(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const attendanceId = String(req.params.id)
    const studentId = String(req.body.studentId || '')
    const oldStatus = String(req.body.oldStatus || '')
    const newStatus = String(req.body.newStatus || '')
    const reason = String(req.body.reason || '')

    if (!studentId || !oldStatus || !newStatus || !reason) {
      res.status(400).json({ error: 'studentId, oldStatus, newStatus, and reason are required.' })
      return
    }

    await prisma.attendanceDetail.update({
      where: { attendanceId_studentId: { attendanceId, studentId } },
      data: { status: newStatus },
    })

    await prisma.attendanceEdit.create({
      data: { attendanceId, studentId, previousStatus: oldStatus, newStatus, reason },
    })

    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Unable to update attendance. Please try again.' })
  }
}

// GET /api/attendance/report?courseId=&startDate=&endDate=
export async function getReportData(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.query.courseId || '')
    const startDate = String(req.query.startDate || '')
    const endDate = String(req.query.endDate || '')

    const data = await prisma.attendance.findMany({
      where: {
        courseId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
      },
      orderBy: [{ date: 'asc' }, { hour: 'asc' }],
      include: {
        attendanceDetails: {
          include: {
            student: { select: { id: true, rollNumber: true, name: true } },
          },
        },
      },
    })

    const formattedData = data.map((record) => {
      const formattedRec = formatAttendanceRecord(record)
      if (record.attendanceDetails) {
        const details = record.attendanceDetails.map((d) => formatAttendanceDetailRow(d))
        formattedRec.attendance_details = details
        formattedRec.attendanceDetails = details
      }
      return formattedRec
    })

    res.json(formattedData)
  } catch {
    res.status(500).json({ error: 'Unable to fetch report data. Please try again.' })
  }
}

// GET /api/attendance/student?courseId=&studentId=
export async function getStudentAttendance(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const courseId = String(req.query.courseId || '')
    const studentId = String(req.query.studentId || '')

    const data = await prisma.attendanceDetail.findMany({
      where: {
        studentId,
        attendance: { courseId },
      },
      orderBy: [{ attendance: { date: 'desc' } }, { attendance: { hour: 'desc' } }],
      include: {
        attendance: { select: { id: true, date: true, hour: true, courseId: true } },
      },
    })

    res.json(data)
  } catch {
    res.status(500).json({ error: 'Unable to load student attendance history.' })
  }
}
