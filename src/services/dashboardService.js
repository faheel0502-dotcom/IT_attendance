import api from '../lib/api'

export async function getDashboardStats() {
  const { data } = await api.get('/dashboard/stats')
  return data
}

export async function getAttendanceTrend() {
  const { data } = await api.get('/dashboard/trend')
  return data
}

export async function getLowAttendanceStudents() {
  const { data } = await api.get('/dashboard/low-attendance')
  return data
}

export async function getTodaySchedule() {
  const { data } = await api.get('/dashboard/today-schedule')
  return data
}
