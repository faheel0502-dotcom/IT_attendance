import { useState, useEffect, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { format, isSunday, isAfter, startOfDay, parseISO, getDay } from 'date-fns'
import { ClipboardCheck, ChevronRight, Loader2, Users, CheckCircle2, List, MousePointerClick, Zap, Calendar } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { useCourses } from '../hooks/useCourses'
import { useStudents } from '../hooks/useStudents'
import { useHolidays } from '../hooks/useHolidays'
import { useTimetable } from '../hooks/useTimetable'
import { useCheckAttendance, useSaveAttendance } from '../hooks/useAttendance'
import { StudentAttendanceRow } from '../components/attendance/StudentAttendanceRow'
import { QuickEntryMode } from '../components/attendance/QuickEntryMode'
import { InteractiveMode } from '../components/attendance/InteractiveMode'
import { UnfilledPopup } from '../components/attendance/UnfilledPopup'
import { HolidayPopup } from '../components/attendance/HolidayPopup'
import { Button } from '../components/ui/Button'
import { Label } from '../components/ui/Label'
import { LoadingSpinner } from '../components/ui/LoadingSpinner'
import { EmptyState } from '../components/ui/EmptyState'

const selectionSchema = z.object({
  courseId: z.string().min(1, 'Select a course'),
  date: z.string().min(1, 'Select a date'),
  hour: z.string().min(1, 'Select an hour'),
})

const TODAY = format(new Date(), 'yyyy-MM-dd')

export default function AttendancePage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const initialCourseId = searchParams.get('courseId') || ''
  const [step, setStep] = useState('select') // 'select' | 'mark'
  const [selection, setSelection] = useState(null)
  const [statuses, setStatuses] = useState({})
  const [labBatch, setLabBatch] = useState('all') // 'all' | 'batch1' | 'batch2'
  
  // viewMode: 'list' | 'quick' | 'interactive'
  const [viewMode, setViewMode] = useState(() => localStorage.getItem('attendanceViewMode') || 'list')
  const [isUnfilledPopupOpen, setIsUnfilledPopupOpen] = useState(false)
  const [isHolidayPopupOpen, setIsHolidayPopupOpen] = useState(false)

  const { data: courses } = useCourses()
  const { data: holidays } = useHolidays()
  const saveAttendance = useSaveAttendance()

  const { register, handleSubmit, watch, formState: { errors }, setValue } = useForm({
    resolver: zodResolver(selectionSchema),
    defaultValues: { courseId: initialCourseId, date: TODAY, hour: '' },
  })

  const watchCourseId = watch('courseId')
  const watchDate = watch('date')
  const watchHour = watch('hour')

  const { data: timetable } = useTimetable(watchCourseId)

  // Compute available hours for the selected date
  const availableHours = useMemo(() => {
    if (!timetable || !watchDate) return []
    const parsedDate = parseISO(watchDate)
    const dayOfWeek = getDay(parsedDate)
    if (dayOfWeek === 0) return []
    return timetable
      .filter(t => t.dayOfWeek === dayOfWeek)
      .map(t => t.hour)
      .sort((a, b) => a - b)
  }, [timetable, watchDate])

  // Group consecutive hours into lab blocks for the hour selector
  const slotGroups = useMemo(() => {
    if (!availableHours.length) return []
    const groups = []
    let i = 0
    while (i < availableHours.length) {
      const group = [availableHours[i]]
      while (i + 1 < availableHours.length && availableHours[i + 1] === availableHours[i] + 1) {
        i++
        group.push(availableHours[i])
      }
      groups.push(group)
      i++
    }
    return groups
  }, [availableHours])

  // Auto-select first slot group when available
  useEffect(() => {
    if (slotGroups.length > 0) {
      const firstHour = slotGroups[0][0]
      if (!watchHour || !availableHours.includes(Number(watchHour))) {
        setValue('hour', firstHour.toString())
      }
    } else if (availableHours.length === 0) {
      setValue('hour', '')
    }
  }, [slotGroups, availableHours, setValue, watchHour])

  // Save viewMode preference
  useEffect(() => {
    localStorage.setItem('attendanceViewMode', viewMode)
  }, [viewMode])

  const { data: existingRecord } = useCheckAttendance(
    watchCourseId || null,
    watchDate || null,
    watchHour ? Number(watchHour) : null
  )

  const { data: students, isLoading: studentsLoading } = useStudents(selection?.courseId)

  // Split students positionally by sorted roll number order:
  // Batch 1 = first 35 students, Batch 2 = students 36 onwards
  const BATCH_SIZE = 35
  const batchStudents = useMemo(() => {
    if (!students) return []
    if (!selection?.isLabBlock || labBatch === 'all') return students
    if (labBatch === 'batch1') return students.slice(0, BATCH_SIZE)
    if (labBatch === 'batch2') return students.slice(BATCH_SIZE)
    return students
  }, [students, selection, labBatch])


  const validateDate = (date) => {
    if (!date) return null
    const parsed = parseISO(date)
    if (isAfter(startOfDay(parsed), startOfDay(new Date()))) return 'Cannot mark attendance for a future date.'
    if (isSunday(parsed)) return 'Cannot mark attendance on Sunday.'
    const isHoliday = holidays?.some((h) => h.date === date)
    if (isHoliday) return 'This date is a holiday. No attendance can be marked.'
    return null
  }

  const onSelectionSubmit = (data) => {
    const dateError = validateDate(data.date)
    if (dateError) { toast.error(dateError); return }
    if (existingRecord) { toast.error('Attendance for this hour is already marked.'); return }
    if (availableHours.length === 0) { toast.error('No classes scheduled for this day.'); return }

    // Find which group the selected starting hour belongs to
    const selectedHourNum = Number(data.hour)
    const matchedGroup = slotGroups.find((g) => g[0] === selectedHourNum) || [selectedHourNum]

    const course = courses?.find((c) => c.id === data.courseId)
    setSelection({
      ...data,
      courseName: course?.course_name,
      hour: matchedGroup[0],
      hours: matchedGroup,
      isLabBlock: matchedGroup.length > 1,
    })
    setStep('mark')
    setStatuses({})
    setLabBatch('all') // reset batch when starting new session
  }

  const handleToggle = (studentId) => {
    setStatuses((prev) => ({
      ...prev,
      [studentId]: prev[studentId] === 'Present' ? 'Absent' : 'Present',
    }))
  }

  const handleSaveClick = () => {
    if (!batchStudents || batchStudents.length === 0) return
    const unfilled = batchStudents.filter(s => !statuses[s.id])
    
    if (unfilled.length > 0) {
      setIsUnfilledPopupOpen(true)
      return
    }

    handleConfirmSave()
  }

  const handleConfirmSave = async () => {
    const studentStatuses = batchStudents.map((s) => ({
      studentId: s.id,
      status: statuses[s.id],
    }))
    try {
      await saveAttendance.mutateAsync({
        courseId: selection.courseId,
        date: selection.date,
        hour: selection.hour,
        hours: selection.hours,
        studentStatuses,
      })
      const batchLabel = selection.isLabBlock && labBatch !== 'all'
        ? ` (${labBatch === 'batch1' ? 'Batch 1' : 'Batch 2'})` : ''
      const msg = selection.isLabBlock
        ? `Lab attendance saved for Hours ${selection.hours[0]}–${selection.hours[selection.hours.length - 1]}${batchLabel}!`
        : 'Attendance saved successfully!'
      toast.success(msg)
      navigate('/history')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleHolidayConfirm = async (reason) => {
    try {
      setIsHolidayPopupOpen(false)
      await saveAttendance.mutateAsync({
        courseId: selection.courseId,
        date: selection.date,
        hour: selection.hour,
        hours: selection.hours,
        studentStatuses: [],
        isHoliday: true,
        holidayReason: reason
      })
      toast.success('Session marked as holiday successfully!')
      navigate('/history')
    } catch (err) {
      toast.error(err.message)
    }
  }

  const presentCount = Object.values(statuses).filter((s) => s === 'Present').length
  const absentCount = Object.values(statuses).filter((s) => s === 'Absent').length
  const unfilledCount = batchStudents ? batchStudents.length - (presentCount + absentCount) : 0

  if (step === 'select') {
    return (
      <div className="max-w-lg">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-slate-900">Take Attendance</h1>
          <p className="text-sm text-slate-500 mt-0.5">Select course, date, and hour to begin</p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-5">
          <form onSubmit={handleSubmit(onSelectionSubmit)} className="space-y-5">
            {/* Course */}
            <div className="space-y-1.5">
              <Label htmlFor="courseId">Course *</Label>
              <select
                id="courseId"
                {...register('courseId')}
                className="block w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">Select a course...</option>
                {courses?.map((c) => (
                  <option key={c.id} value={c.id}>{c.course_code} — {c.course_name}</option>
                ))}
              </select>
              {errors.courseId && <p className="text-xs text-red-500">{errors.courseId.message}</p>}
            </div>

            {/* Date */}
            <div className="space-y-1.5">
              <Label htmlFor="date">Date *</Label>
              <input
                id="date"
                type="date"
                max={TODAY}
                {...register('date')}
                className="block w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {errors.date && <p className="text-xs text-red-500">{errors.date.message}</p>}
            </div>

            {/* Hour / Lab Block */}
            <div className="space-y-1.5">
              <Label htmlFor="hour">Session *</Label>
              {watchCourseId && availableHours.length === 0 ? (
                <div className="text-sm text-slate-500 bg-slate-50 p-3 rounded-lg border border-slate-100">
                  No classes scheduled for this course on this date.
                </div>
              ) : (
                <select
                  id="hour"
                  {...register('hour')}
                  disabled={!watchCourseId}
                  className="block w-full border border-slate-200 rounded-lg px-3 py-2.5 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {!watchCourseId && <option value="">Select a course first</option>}
                  {slotGroups.map((group) => {
                    const isLab = group.length > 1
                    const label = isLab
                      ? `🧪 Hours ${group[0]}–${group[group.length - 1]} (${group.length}-Hr Lab Session)`
                      : `Hour ${group[0]}`
                    return <option key={group[0]} value={group[0]}>{label}</option>
                  })}
                </select>
              )}
              {errors.hour && <p className="text-xs text-red-500">{errors.hour.message}</p>}
            </div>

            {/* Already marked warning */}
            {existingRecord && (
              <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
                ⚠️ Attendance for this course, date, and hour is already marked.
              </div>
            )}

            <Button type="submit" className="w-full" disabled={watchCourseId && availableHours.length === 0}>
              Proceed to Mark Attendance
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </form>
        </div>
      </div>
    )
  }

  // Mark step
  return (
    <div className="max-w-2xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900">{selection.courseName}</h1>
          <p className="text-sm text-slate-500">
            {format(parseISO(selection.date), 'EEEE, dd MMM yyyy')} ·{' '}
            {selection.isLabBlock
              ? `🧪 Hours ${selection.hours[0]}–${selection.hours[selection.hours.length - 1]} (${selection.hours.length}-Hr Lab Session)`
              : `Hour ${selection.hour}`}
          </p>
        </div>
        <button
          onClick={() => setStep('select')}
          className="text-xs text-slate-400 hover:text-slate-600 underline mt-1"
        >
          Change
        </button>
      </div>

      {/* Stats Bar */}
      <div className="flex gap-2 sm:gap-3 mb-4">
        <div className="flex-1 bg-green-50 border border-green-100 rounded-xl px-2 sm:px-4 py-2.5 text-center">
          <p className="text-base sm:text-lg font-bold text-green-700">{presentCount}</p>
          <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-green-600">Present</p>
        </div>
        <div className="flex-1 bg-red-50 border border-red-100 rounded-xl px-2 sm:px-4 py-2.5 text-center">
          <p className="text-base sm:text-lg font-bold text-red-600">{absentCount}</p>
          <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-red-500">Absent</p>
        </div>
        <div className="flex-1 bg-amber-50 border border-amber-100 rounded-xl px-2 sm:px-4 py-2.5 text-center">
          <p className="text-base sm:text-lg font-bold text-amber-700">{unfilledCount}</p>
          <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-amber-600">Unmarked</p>
        </div>
        <div className="flex-1 bg-slate-50 border border-slate-200 rounded-xl px-2 sm:px-4 py-2.5 text-center">
          <p className="text-base sm:text-lg font-bold text-slate-700">{batchStudents?.length ?? 0}</p>
          <p className="text-[10px] sm:text-xs uppercase tracking-wider font-semibold text-slate-500">Total</p>
        </div>
      </div>

      {/* Lab Batch Selector — shown only for lab sessions */}
      {selection.isLabBlock && students && (
        <div className="mb-5">
          <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">🧪 Lab Batch</p>
          <div className="flex gap-2">
            {[
              {
                key: 'batch1',
                label: 'Batch 1',
                sublabel: students.length > 0
                  ? `${students[0]?.rollNumber || students[0]?.roll_number} – ${students[Math.min(BATCH_SIZE, students.length) - 1]?.rollNumber || students[Math.min(BATCH_SIZE, students.length) - 1]?.roll_number}`
                  : `Students 1–${BATCH_SIZE}`,
              },
              {
                key: 'batch2',
                label: 'Batch 2',
                sublabel: students.length > BATCH_SIZE
                  ? `${students[BATCH_SIZE]?.rollNumber || students[BATCH_SIZE]?.roll_number} onwards`
                  : 'No students',
              },
              { key: 'all', label: 'All', sublabel: `${students.length} students` },
            ].map(({ key, label, sublabel }) => (
              <button
                key={key}
                onClick={() => { setLabBatch(key); setStatuses({}) }}
                className={`flex-1 py-2.5 px-3 rounded-xl border text-center transition-all ${
                  labBatch === key
                    ? 'bg-purple-600 border-purple-600 text-white shadow-sm'
                    : 'bg-white border-slate-200 text-slate-600 hover:border-purple-300 hover:text-purple-700'
                }`}
              >
                <p className="text-sm font-semibold">{label}</p>
                <p className={`text-[10px] leading-tight mt-0.5 ${labBatch === key ? 'text-purple-200' : 'text-slate-400'}`}>{sublabel}</p>
              </button>
            ))}
          </div>
          {labBatch !== 'all' && (
            <p className="text-xs text-purple-600 mt-2">
              {batchStudents.length} student{batchStudents.length !== 1 ? 's' : ''} in {labBatch === 'batch1' ? 'Batch 1' : 'Batch 2'}
            </p>
          )}
        </div>
      )}

      {/* View Mode Tabs */}
      <div className="flex bg-slate-100 p-1 rounded-xl mb-6">
        <button
          onClick={() => setViewMode('list')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
            viewMode === 'list' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <List className="w-4 h-4" /> <span className="hidden sm:inline">List View</span>
        </button>
        <button
          onClick={() => setViewMode('quick')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
            viewMode === 'quick' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <Zap className="w-4 h-4" /> <span className="hidden sm:inline">Quick Entry</span>
        </button>
        <button
          onClick={() => setViewMode('interactive')}
          className={clsx(
            "flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium rounded-lg transition-all",
            viewMode === 'interactive' ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
          )}
        >
          <MousePointerClick className="w-4 h-4" /> <span className="hidden sm:inline">One-by-One</span>
        </button>
      </div>

      {studentsLoading && <LoadingSpinner />}

      {!studentsLoading && (!batchStudents || batchStudents.length === 0) && (
        <EmptyState
          icon={Users}
          title={selection.isLabBlock && labBatch !== 'all' ? `No students in ${labBatch === 'batch1' ? 'Batch 1' : 'Batch 2'}` : 'No students enrolled'}
          description={selection.isLabBlock && labBatch !== 'all' ? 'Try selecting a different batch or All Students.' : 'Add students to this course before marking attendance.'}
        />
      )}

      {!studentsLoading && batchStudents && batchStudents.length > 0 && (
        <div className="pb-32">
          {viewMode === 'quick' && (
            <QuickEntryMode students={batchStudents} statuses={statuses} setStatuses={setStatuses} />
          )}

          {viewMode === 'interactive' && (
            <InteractiveMode students={batchStudents} statuses={statuses} setStatuses={setStatuses} />
          )}

          {viewMode === 'list' && (
            <>
              <p className="text-xs text-slate-400 mb-3">Tap a student to toggle Present ↔ Absent</p>
              <div className="space-y-2">
                {batchStudents.map((student) => (
                  <StudentAttendanceRow
                    key={student.id}
                    student={student}
                    status={statuses[student.id]}
                    onToggle={handleToggle}
                  />
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* Sticky Save Button */}
      {batchStudents && batchStudents.length > 0 && (
        <div className="fixed bottom-16 md:bottom-0 left-0 right-0 md:left-64 z-30 bg-white/95 backdrop-blur border-t border-slate-100 px-3 py-3 md:px-8 shadow-[0_-4px_20px_-10px_rgba(0,0,0,0.1)]">
          <div className="flex gap-2 sm:gap-3 max-w-2xl mx-auto">
            <Button
              variant="outline"
              className="px-3 sm:px-4 shrink-0 text-amber-700 border-amber-200 bg-amber-50 hover:bg-amber-100 hover:text-amber-800"
              onClick={() => setIsHolidayPopupOpen(true)}
              disabled={saveAttendance.isPending}
            >
              <Calendar className="w-4 h-4 mr-1.5 sm:mr-2" />
              <span className="text-sm font-semibold">Holiday</span>
            </Button>
            
            <Button
              className={clsx(
                "flex-1 transition-all duration-300 text-sm sm:text-base", 
                unfilledCount > 0 ? "bg-slate-300 hover:bg-slate-400 text-slate-700" : ""
              )}
              onClick={handleSaveClick}
              disabled={saveAttendance.isPending}
            >
              {saveAttendance.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving...</>
              ) : unfilledCount > 0 ? (
                <>Save ({unfilledCount} unmarked)</>
              ) : (
                <><CheckCircle2 className="w-4 h-4 mr-1.5 sm:mr-2" />Save ({students.length})</>
              )}
            </Button>
          </div>
        </div>
      )}

      <UnfilledPopup 
        isOpen={isUnfilledPopupOpen} 
        onClose={() => setIsUnfilledPopupOpen(false)} 
        unfilledStudents={batchStudents?.filter(s => !statuses[s.id]) || []} 
      />

      <HolidayPopup
        isOpen={isHolidayPopupOpen}
        onClose={() => setIsHolidayPopupOpen(false)}
        onConfirm={handleHolidayConfirm}
      />
    </div>
  )
}
