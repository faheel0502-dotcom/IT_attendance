# Attendance Management System — Backend

Express.js + TypeScript + Prisma REST API for the Faculty Attendance Management System.

## Tech Stack

- **Runtime:** Node.js
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Prisma
- **Database:** PostgreSQL
- **Auth:** JWT (jsonwebtoken) + bcryptjs

---

## Getting Started

### 1. Install dependencies

```bash
cd backend
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in your `.env`:
```env
PORT=3000
NODE_ENV=development
DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/attendance_db?schema=public"
JWT_SECRET=your_super_secret_key_here
JWT_EXPIRES_IN=7d
CORS_ORIGIN=http://localhost:5173
```

> **PostgreSQL options:** [Neon.tech](https://neon.tech) (free tier), Railway, or local PostgreSQL

### 3. Set up the database

```bash
# Push schema to database
npm run db:push

# Or run migrations (recommended for production)
npm run db:migrate

# Seed initial faculty account
npm run db:seed
```

### 4. Run the dev server

```bash
npm run dev
```

Server starts at `http://localhost:3000`

---

## API Reference

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/login` | No | Login → returns JWT |
| GET | `/api/auth/me` | Yes | Get current faculty profile |
| POST | `/api/auth/register` | No | Create faculty account |

### Courses
| Method | Path | Description |
|---|---|---|
| GET | `/api/courses` | Get faculty's courses |
| POST | `/api/courses` | Create course |
| GET | `/api/courses/:id` | Get single course |
| DELETE | `/api/courses/:id` | Delete course |

### Students
| Method | Path | Description |
|---|---|---|
| GET | `/api/students` | All students (master list) |
| GET | `/api/students/course/:courseId` | Students enrolled in course |
| POST | `/api/students/course/:courseId` | Add student to course |
| DELETE | `/api/students/course/:courseId/:studentId` | Remove student |
| POST | `/api/students/course/:courseId/bulk` | Bulk import |
| POST | `/api/students/course/:courseId/enroll-all` | Enroll all students |
| POST | `/api/students/course/:courseId/enroll-selected` | Enroll selected |

### Attendance
| Method | Path | Description |
|---|---|---|
| GET | `/api/attendance/check` | Check if session exists |
| POST | `/api/attendance` | Save attendance session |
| GET | `/api/attendance/all` | All faculty history |
| GET | `/api/attendance/history?courseId=` | Course history |
| GET | `/api/attendance/report` | Report data (date range) |
| GET | `/api/attendance/student` | Student attendance |
| GET | `/api/attendance/:id` | Session details |
| PATCH | `/api/attendance/:id/detail` | Edit with audit |

### Dashboard
| Method | Path | Description |
|---|---|---|
| GET | `/api/dashboard/stats` | Total courses + students |
| GET | `/api/dashboard/trend` | 7-day attendance trend |
| GET | `/api/dashboard/low-attendance` | Students below 75% |
| GET | `/api/dashboard/today-schedule` | Today's timetable |

### Holidays & Timetable
| Method | Path | Description |
|---|---|---|
| GET/POST | `/api/holidays` | List / Add holiday |
| DELETE | `/api/holidays/:id` | Remove holiday |
| GET/POST | `/api/timetable` | List / Add entry |
| DELETE | `/api/timetable/:id` | Remove entry |

---

## Default Credentials (after seed)

```
Email:    faculty@college.edu
Password: faculty123
```

⚠️ **Change this password after first login!**

---

## Scripts

| Command | Description |
|---|---|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Compile TypeScript |
| `npm start` | Run compiled JS (production) |
| `npm run db:generate` | Regenerate Prisma client |
| `npm run db:migrate` | Run DB migrations |
| `npm run db:push` | Push schema without migration |
| `npm run db:studio` | Open Prisma Studio |
| `npm run db:seed` | Seed initial data |
