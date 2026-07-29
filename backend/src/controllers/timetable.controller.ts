import { Response } from 'express'
import { prisma } from '../lib/prisma'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

// GET /api/timetable?courseId=
export async function getTimetable(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { courseId } = req.query as Record<string, string>

    const entries = await prisma.timetable.findMany({
      where: { courseId },
      orderBy: [{ dayOfWeek: 'asc' }, { hour: 'asc' }],
    })

    res.json(entries)
  } catch {
    res.status(500).json({ error: 'Unable to load timetable. Please try again.' })
  }
}

// POST /api/timetable
export async function addTimetableEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { courseId, dayOfWeek, hour, duration = 1 } = req.body

    if (!courseId || !dayOfWeek || !hour) {
      res.status(400).json({ error: 'courseId, dayOfWeek, and hour are required.' })
      return
    }

    // Verify faculty owns course
    const course = await prisma.course.findFirst({
      where: { id: courseId, facultyId: req.faculty!.id },
    })
    if (!course) {
      res.status(404).json({ error: 'Course not found.' })
      return
    }

    const start = parseInt(String(hour), 10)
    const dur = Math.max(1, parseInt(String(duration), 10))
    const day = parseInt(String(dayOfWeek), 10)

    const hoursToInsert: number[] = []
    for (let i = 0; i < dur; i++) {
      if (start + i <= 8) {
        hoursToInsert.push(start + i)
      }
    }

    const existing = await prisma.timetable.findMany({
      where: {
        courseId,
        dayOfWeek: day,
        hour: { in: hoursToInsert },
      },
    })

    if (existing.length > 0) {
      res.status(409).json({ error: `One or more slots in this block (Hour ${existing.map((e) => e.hour).join(', ')}) are already added.` })
      return
    }

    await prisma.timetable.createMany({
      data: hoursToInsert.map((h) => ({
        courseId,
        dayOfWeek: day,
        hour: h,
      })),
      skipDuplicates: true,
    })

    const entries = await prisma.timetable.findMany({
      where: { courseId, dayOfWeek: day, hour: { in: hoursToInsert } },
    })

    res.status(201).json(entries)
  } catch (err: any) {
    if (err.code === 'P2002') {
      res.status(409).json({ error: 'This slot is already in the timetable.' })
      return
    }
    res.status(500).json({ error: 'Unable to add timetable entry. Please try again.' })
  }
}

// DELETE /api/timetable/:id
export async function deleteTimetableEntry(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = String(req.params.id)
    await prisma.timetable.delete({ where: { id } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Unable to delete timetable entry. Please try again.' })
  }
}

// DELETE /api/timetable/bulk  (body: { ids: string[] })
export async function deleteTimetableEntries(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const ids: string[] = Array.isArray(req.body.ids) ? req.body.ids.map(String) : []
    if (!ids.length) {
      res.status(400).json({ error: 'ids array is required.' })
      return
    }
    await prisma.timetable.deleteMany({ where: { id: { in: ids } } })
    res.json({ success: true, deleted: ids.length })
  } catch {
    res.status(500).json({ error: 'Unable to delete timetable entries. Please try again.' })
  }
}
