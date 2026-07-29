import api from '../lib/api'

export async function fetchStudentsForCourse(courseId) {
  const { data } = await api.get(`/students/course/${courseId}`)
  return data
}

export async function fetchAllStudents(batchName) {
  const { data } = await api.get('/students', { params: batchName ? { batch: batchName } : {} })
  return data
}

export async function addStudentToSection({ rollNumber, name, email, batch }) {
  const { data } = await api.post('/students/section', { rollNumber, name, email, batch })
  return data
}

export async function bulkImportToSection(batch, studentsArray) {
  const { data } = await api.post('/students/section/bulk', { batch, students: studentsArray })
  return data
}

export async function deleteStudent(id) {
  await api.delete(`/students/${id}`)
}

export async function bulkDeleteStudents(ids) {
  const { data } = await api.post('/students/bulk-delete', { ids })
  return data
}

export async function addStudentToCourse(courseId, { rollNumber, name, email, batch }) {
  const { data } = await api.post(`/students/course/${courseId}`, { rollNumber, name, email, batch })
  return data
}

export async function removeStudentFromCourse(courseId, studentId) {
  await api.delete(`/students/course/${courseId}/${studentId}`)
}

export async function enrollDefaultStudents(courseId, className) {
  const { data } = await api.post(`/students/course/${courseId}/enroll-all`, { className })
  return data.count
}

export async function enrollSelectedStudents(courseId, studentIds) {
  if (!studentIds || studentIds.length === 0) return 0
  const { data } = await api.post(`/students/course/${courseId}/enroll-selected`, { studentIds })
  return data.count
}

export async function bulkImportStudents(courseId, studentsArray) {
  const { data } = await api.post(`/students/course/${courseId}/bulk`, {
    students: studentsArray.map((s) => ({
      rollNumber: s.rollNumber,
      name: s.name,
      email: s.email || null,
      batch: s.batch || null,
    })),
  })
  return data
}
