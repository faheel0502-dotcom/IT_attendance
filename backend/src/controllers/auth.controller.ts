import { Request, Response } from 'express'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { prisma } from '../lib/prisma'
import { AuthenticatedRequest } from '../middleware/auth.middleware'

// POST /api/auth/login
export async function login(req: Request, res: Response): Promise<void> {
  try {
    const { email, password } = req.body

    if (!email || !password) {
      res.status(400).json({ error: 'Email and password are required.' })
      return
    }

    const faculty = await prisma.faculty.findUnique({ where: { email } })

    if (!faculty) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const isValid = await bcrypt.compare(password, faculty.password)
    if (!isValid) {
      res.status(401).json({ error: 'Invalid email or password.' })
      return
    }

    const token = jwt.sign(
      { id: faculty.id, email: faculty.email, name: faculty.name },
      process.env.JWT_SECRET as string,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      { expiresIn: (process.env.JWT_EXPIRES_IN || '7d') as any }
    )

    res.json({
      token,
      user: {
        id: faculty.id,
        name: faculty.name,
        email: faculty.email,
        department: faculty.department,
      },
    })
  } catch (err) {
    res.status(500).json({ error: 'Login failed. Please try again.' })
  }
}

// GET /api/auth/me
export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const faculty = await prisma.faculty.findUnique({
      where: { id: req.faculty!.id },
      select: { id: true, name: true, email: true, department: true, createdAt: true },
    })

    if (!faculty) {
      res.status(404).json({ error: 'Faculty not found.' })
      return
    }

    res.json({ user: faculty })
  } catch {
    res.status(500).json({ error: 'Unable to fetch profile.' })
  }
}

// POST /api/auth/register  (admin use — create faculty accounts)
export async function register(req: Request, res: Response): Promise<void> {
  try {
    const { name, email, password, department } = req.body

    if (!name || !email || !password) {
      res.status(400).json({ error: 'Name, email, and password are required.' })
      return
    }

    const existing = await prisma.faculty.findUnique({ where: { email } })
    if (existing) {
      res.status(409).json({ error: 'A faculty account with this email already exists.' })
      return
    }

    const hashed = await bcrypt.hash(password, 12)
    const faculty = await prisma.faculty.create({
      data: { name, email, password: hashed, department },
      select: { id: true, name: true, email: true, department: true, createdAt: true },
    })

    res.status(201).json({ user: faculty })
  } catch {
    res.status(500).json({ error: 'Registration failed. Please try again.' })
  }
}

// POST /api/auth/change-password
export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body

    if (!currentPassword || !newPassword) {
      res.status(400).json({ error: 'Current password and new password are required.' })
      return
    }

    if (newPassword.length < 6) {
      res.status(400).json({ error: 'New password must be at least 6 characters long.' })
      return
    }

    const faculty = await prisma.faculty.findUnique({ where: { id: req.faculty!.id } })
    if (!faculty) {
      res.status(404).json({ error: 'Faculty account not found.' })
      return
    }

    const isValid = await bcrypt.compare(currentPassword, faculty.password)
    if (!isValid) {
      res.status(400).json({ error: 'Incorrect current password.' })
      return
    }

    const hashed = await bcrypt.hash(newPassword, 12)
    await prisma.faculty.update({
      where: { id: faculty.id },
      data: { password: hashed },
    })

    res.json({ success: true, message: 'Password updated successfully.' })
  } catch (err) {
    console.error('[changePassword Error]:', err)
    res.status(500).json({ error: 'Unable to change password. Please try again.' })
  }
}
