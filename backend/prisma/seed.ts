/**
 * Seed script — creates faculty accounts and cleans up demo student lists
 * Run: npm run db:seed
 */
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const FACULTY_LIST = [
  { name: 'Dr. Ramya', email: 'ramya@faculty.com' },
  { name: 'Mr. Wajid', email: 'wajid@faculty.com' },
  { name: 'Dr. Rajendran', email: 'rajendran@faculty.com' },
  { name: 'Dr. Subashini', email: 'subashini@faculty.com' },
  { name: 'Ms. Sonya', email: 'sonya@faculty.com' },
  { name: 'Dr. Sakthi', email: 'sakthi@faculty.com' },
  { name: 'Dr. Sangeetha', email: 'sangeetha@faculty.com' },
  { name: 'Mr. Gnanasekaran', email: 'gnanasekaran@faculty.com' },
  { name: 'Dr. Latchoumy', email: 'latchoumy@faculty.com' },
  { name: 'Mr. Nallarasu', email: 'nallarasu@faculty.com' },
  { name: 'Ms. Nabeena', email: 'nabeena@faculty.com' },
  { name: 'Dr. Kavitha', email: 'kavitha@faculty.com' },
  { name: 'Mr. Kabeer', email: 'kabeer@faculty.com' },
  { name: 'Default Faculty', email: 'faculty@college.edu' },
]

async function main() {
  console.log('🌱 Seeding database with faculty accounts...')

  // 1. Create Faculty Accounts
  const hashedPassword = await bcrypt.hash('faculty123', 12)

  for (const fac of FACULTY_LIST) {
    const faculty = await prisma.faculty.upsert({
      where: { email: fac.email },
      update: {},
      create: {
        name: fac.name,
        email: fac.email,
        password: hashedPassword,
        department: 'Information Technology',
      },
    })
    console.log(`✅ Seeded Faculty: ${faculty.name} (${faculty.email})`)
  }

  // 2. Remove demo students from database if present
  const deleted = await prisma.student.deleteMany({
    where: {
      OR: [
        { email: { endsWith: '@student.college.edu' } },
        { rollNumber: { startsWith: '21IT' } },
        { rollNumber: { startsWith: '22ITA' } },
        { rollNumber: { startsWith: '22ITB' } },
        { rollNumber: { startsWith: '23ITA' } },
        { rollNumber: { startsWith: '23ITB' } },
        { rollNumber: { startsWith: '24ITA' } },
        { rollNumber: { startsWith: '24ITB' } },
      ],
    },
  })

  console.log(`🧹 Cleaned up ${deleted.count} demo student records. Roster is ready for manual/Excel entry!`)
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
