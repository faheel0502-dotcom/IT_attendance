import { Request, Response } from 'express'
import { prisma } from '../lib/prisma'

// GET /api/holidays
export async function getHolidays(_req: Request, res: Response): Promise<void> {
  try {
    const holidays = await prisma.holiday.findMany({
      orderBy: { date: 'asc' },
    })
    res.json(holidays)
  } catch {
    res.status(500).json({ error: 'Unable to load holidays. Please try again.' })
  }
}

// POST /api/holidays
export async function addHoliday(_req: Request, res: Response): Promise<void> {
  try {
    const date = String(_req.body.date || '')
    const description = String(_req.body.description || '')

    if (!date || !description) {
      res.status(400).json({ error: 'Date and description are required.' })
      return
    }

    const holiday = await prisma.holiday.create({
      data: { date: new Date(date), description },
    })

    res.status(201).json(holiday)
  } catch (err: unknown) {
    if (typeof err === 'object' && err !== null && 'code' in err && (err as { code: string }).code === 'P2002') {
      res.status(409).json({ error: 'A holiday already exists for this date.' })
      return
    }
    res.status(500).json({ error: 'Unable to add holiday. Please try again.' })
  }
}

// DELETE /api/holidays/:id
export async function deleteHoliday(req: Request, res: Response): Promise<void> {
  try {
    const id = String(req.params.id)
    await prisma.holiday.delete({ where: { id } })
    res.json({ success: true })
  } catch {
    res.status(500).json({ error: 'Unable to delete holiday. Please try again.' })
  }
}
