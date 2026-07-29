import api from '../lib/api'

export async function fetchCourses() {
  const { data } = await api.get('/courses')
  return data
}

export async function createCourse({ courseCode, courseName, semester, className, enrollmentType = 'default' }) {
  const { data } = await api.post('/courses', { courseCode, courseName, semester, className, enrollmentType })
  return data
}

export async function deleteCourse(courseId) {
  await api.delete(`/courses/${courseId}`)
}

export async function fetchCourseById(courseId) {
  const { data } = await api.get(`/courses/${courseId}`)
  return data
}
