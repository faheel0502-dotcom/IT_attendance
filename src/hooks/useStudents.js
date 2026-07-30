import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import {
  fetchStudentsForCourse,
  fetchAllStudents,
  addStudentToCourse,
  removeStudentFromCourse,
  bulkImportStudents,
  enrollDefaultStudents,
  enrollSelectedStudents,
  assignBatches,
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
    // No staleTime — always refetch after invalidation so newly imported students appear immediately
    staleTime: 0,
  })
}

export function useAddStudentToSection(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentData) => addStudentToSection({ ...studentData, batch: batchName }),
    onSuccess: () => {
      // Use refetchQueries to immediately trigger a fresh fetch (not just mark stale)
      queryClient.refetchQueries({ queryKey: ['all-students', batchName], exact: true })
      queryClient.invalidateQueries({ queryKey: ['all-students'], exact: false })
    },
  })
}

export function useBulkImportToSection(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentsArray) => bulkImportToSection(batchName, studentsArray),
    onSuccess: () => {
      // Force immediate refetch so imported students appear right away
      queryClient.refetchQueries({ queryKey: ['all-students', batchName], exact: true })
      queryClient.invalidateQueries({ queryKey: ['all-students'], exact: false })
    },
  })
}

export function useDeleteStudent(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentId) => deleteStudent(studentId),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['all-students', batchName], exact: true })
      queryClient.invalidateQueries({ queryKey: ['all-students'], exact: false })
    },
  })
}

export function useBulkDeleteStudents(batchName) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (studentIds) => bulkDeleteStudents(studentIds),
    onSuccess: () => {
      queryClient.refetchQueries({ queryKey: ['all-students', batchName], exact: true })
      queryClient.invalidateQueries({ queryKey: ['all-students'], exact: false })
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

export function useAssignBatches(courseId) {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (batch1StudentIds) => assignBatches(courseId, batch1StudentIds),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['students', courseId] })
    },
  })
}
