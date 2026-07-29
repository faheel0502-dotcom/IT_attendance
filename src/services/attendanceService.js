import api from '../lib/api'

export async function checkAttendanceExists(courseId, date, hour) {
  const { data } = await api.get('/attendance/check', { params: { courseId, date, hour } })
  return data.exists ? data : null
}

export async function saveAttendance(courseId, date, hour, studentStatuses, isHoliday = false, holidayReason = null, hours = null) {
  const payload = { courseId, date, studentStatuses, isHoliday, holidayReason }
  if (hours && Array.isArray(hours) && hours.length > 1) {
    payload.hours = hours
  } else {
    payload.hour = hour
  }
  const { data } = await api.post('/attendance', payload)
  return data
}

export async function fetchAttendanceHistory(courseId) {
  const { data } = await api.get('/attendance/history', { params: { courseId } })
  return data
}

export async function fetchAllHistory() {
  const { data } = await api.get('/attendance/all')
  return data
}

export async function fetchSessionDetails(attendanceId) {
  const { data } = await api.get(`/attendance/${attendanceId}`)
  return data
}

export async function editAttendanceDetail(attendanceId, studentId, oldStatus, newStatus, reason) {
  await api.patch(`/attendance/${attendanceId}/detail`, {
    studentId, oldStatus, newStatus, reason,
  })
}

export async function getReportData(courseId, startDate, endDate) {
  const { data } = await api.get('/attendance/report', { params: { courseId, startDate, endDate } })
  return data
}

export async function fetchStudentAttendance(courseId, studentId) {
  const { data } = await api.get('/attendance/student', { params: { courseId, studentId } })
  return data
}
