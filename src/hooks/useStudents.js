import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStudentsForCourse,
  fetchAllStudents,
  addStudentToCourse,
  removeStudentFromCourse,
  bulkImportStudents,
  enrollDefaultStudents,
  enrollSelectedStudents,
  addStudentToSection,
  bulkImportToSection,
  deleteStudent,
  bulkDeleteStudents,
} from '../services/studentsService'

export function useStudents(courseId) {
  return useQuery({
    queryKey: ['students', courseId],
    queryFn: () => fetchStudentsForCourse(courseId),
    enabled: !!courseId,
  })
}

export function useAllStudents(batchName) {
  return useQuery({
    queryKey: ['all-students', batchName],
    queryFn: () => fetchAllStudents(batchName),
    staleTime: 1000 * 60 * 10,
  })
}

export function useAddStudentToSection(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentData) => addStudentToSection({ ...studentData, batch: batchName }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-students', batchName] })
      queryClient.invalidateQueries({ queryKey: ['all-students'] })
    },
  })
}

export function useBulkImportToSection(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentsArray) => bulkImportToSection(batchName, studentsArray),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-students', batchName] })
      queryClient.invalidateQueries({ queryKey: ['all-students'] })
    },
  })
}

export function useDeleteStudent(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId) => deleteStudent(studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-students', batchName] })
      queryClient.invalidateQueries({ queryKey: ['all-students'] })
    },
  })
}

export function useBulkDeleteStudents(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentIds) => bulkDeleteStudents(studentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-students', batchName] })
      queryClient.invalidateQueries({ queryKey: ['all-students'] })
    },
  })
}

export function useAddStudent(courseId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentData) => addStudentToCourse(courseId, studentData),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

export function useRemoveStudent(courseId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId) => removeStudentFromCourse(courseId, studentId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

export function useBulkImportStudents(courseId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentsArray) => bulkImportStudents(courseId, studentsArray),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

export function useEnrollDefaultStudents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, className }) => enrollDefaultStudents(courseId, className),
    onSuccess: (_data, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['students', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}

export function useEnrollSelectedStudents() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: ({ courseId, studentIds }) => enrollSelectedStudents(courseId, studentIds),
    onSuccess: (_data, { courseId }) => {
      queryClient.invalidateQueries({ queryKey: ['students', courseId] })
      queryClient.invalidateQueries({ queryKey: ['courses'] })
    },
  })
}
