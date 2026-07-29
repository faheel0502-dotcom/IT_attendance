import api from '../lib/api'

export async function fetchTimetable(courseId) {
  const { data } = await api.get('/timetable', { params: { courseId } })
  return data
}

export async function addTimetableEntry({ courseId, dayOfWeek, hour, duration = 1 }) {
  const { data } = await api.post('/timetable', { courseId, dayOfWeek, hour, duration })
  return data
}

export async function deleteTimetableEntry(id) {
  await api.delete(`/timetable/${id}`)
}

export async function deleteTimetableEntries(ids) {
  await api.delete('/timetable/bulk', { data: { ids } })
}
