import { useState } from 'react'
import { Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { useRemoveStudent } from '../../hooks/useStudents'
import { Badge } from '../ui/Badge'
import { StudentAttendanceModal } from './StudentAttendanceModal'

export function StudentList({ students, courseId }) {
  const removeStudent = useRemoveStudent(courseId)
  const [selectedStudent, setSelectedStudent] = useState(null)

  const handleRemove = async (e, student) => {
    e.stopPropagation()
    try {
      await removeStudent.mutateAsync(student.id)
      toast.success(`${student.name} removed.`)
    } catch (err) {
      toast.error(err.message || 'Failed to remove student.')
    }
  }

  if (!students || students.length === 0) return null

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-slate-100">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-100">
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">#</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Roll No.</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide">Name</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden sm:table-cell">Email</th>
              <th className="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wide hidden md:table-cell">Batch</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-50">
            {students.map((student, idx) => {
              const rollNo = student.rollNumber || student.roll_number || '—'
              return (
                <tr
                  key={student.id}
                  onClick={() => setSelectedStudent(student)}
                  className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                >
                  <td className="px-4 py-3 text-xs text-slate-400 font-medium">{idx + 1}</td>
                  <td className="px-4 py-3">
                    <Badge variant="blue">{rollNo}</Badge>
                  </td>
                  <td className="px-4 py-3 font-medium text-slate-800">{student.name}</td>
                  <td className="px-4 py-3 text-slate-500 hidden sm:table-cell">{student.email || '—'}</td>
                  <td className="px-4 py-3 text-slate-500 hidden md:table-cell">{student.batch || '—'}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={(e) => handleRemove(e, student)}
                      disabled={removeStudent.isPending}
                      className="p-1.5 rounded-lg text-slate-300 hover:text-red-500 hover:bg-red-50 opacity-0 group-hover:opacity-100 transition-all"
                      aria-label={`Remove ${student.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      <StudentAttendanceModal
        isOpen={!!selectedStudent}
        onClose={() => setSelectedStudent(null)}
        student={selectedStudent}
        courseId={courseId}
      />
    </>
  )
}
