import { useState, useMemo } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Users, BookOpen, Search, Check, ChevronRight, ChevronLeft } from 'lucide-react'
import toast from 'react-hot-toast'
import clsx from 'clsx'
import { Modal } from '../ui/Modal'
import { Label } from '../ui/Label'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'
import { useCreateCourse } from '../../hooks/useCourses'
import { useAllStudents, useEnrollDefaultStudents, useEnrollSelectedStudents } from '../../hooks/useStudents'

const CLASS_OPTIONS = [
  'IT Final year',
  'IT 3rd year - section A',
  'IT 3rd year - section B',
  'IT 2nd year - section A',
  'IT 2nd year - section B',
  'IT 1st year - section A',
  'IT 1st year - section B',
]

const schema = z.object({
  courseCode: z.string().min(1, 'Course code is required').max(20),
  courseName: z.string().min(2, 'Course name is required').max(100),
  semester: z.string().optional(),
  className: z.string().min(1, 'Please select a class/section'),
})

export function AddCourseModal({ isOpen, onClose }) {
  const createCourse = useCreateCourse()
  const enrollDefault = useEnrollDefaultStudents()
  const enrollSelected = useEnrollSelectedStudents()

  const [step, setStep] = useState(1) // 1 = course info, 2 = student picker
  const [enrollmentType, setEnrollmentType] = useState('default') // default = Core, elective = Elective
  const [selectedIds, setSelectedIds] = useState(new Set())
  const [search, setSearch] = useState('')
  const [createdCourse, setCreatedCourse] = useState(null)
  const [selectedClassName, setSelectedClassName] = useState('')
  const [isEnrolling, setIsEnrolling] = useState(false)

  // Fetch only students belonging to the selected class section for Step 2
  const { data: classStudents = [], isLoading: studentsLoading } = useAllStudents(selectedClassName)

  const { register, handleSubmit, formState: { errors }, reset } = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      className: CLASS_OPTIONS[0],
    },
  })

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return classStudents.filter(
      (s) => s.name.toLowerCase().includes(q) || (s.rollNumber || s.roll_number || '').toLowerCase().includes(q)
    )
  }, [classStudents, search])

  const handleClose = () => {
    reset()
    setStep(1)
    setEnrollmentType('default')
    setSelectedIds(new Set())
    setSearch('')
    setCreatedCourse(null)
    setSelectedClassName('')
    onClose()
  }

  const toggleStudent = (id) => {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const toggleAll = () => {
    if (selectedIds.size === filteredStudents.length) {
      setSelectedIds(new Set())
    } else {
      setSelectedIds(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  // Step 1 submit: create the course record
  const onStep1Submit = async (data) => {
    try {
      setSelectedClassName(data.className)
      const course = await createCourse.mutateAsync({
        ...data,
        enrollmentType,
      })
      setCreatedCourse(course)

      if (enrollmentType === 'default') {
        // Core course -> Auto-enroll all students in the selected class/section
        const count = await enrollDefault.mutateAsync({ courseId: course.id, className: data.className })
        toast.success(`Course created! All ${count} students from ${data.className} enrolled.`)
        handleClose()
      } else {
        // Elective course -> Go to step 2 to select specific students from that section
        setStep(2)
      }
    } catch (err) {
      toast.error(err.message || 'Failed to create course.')
    }
  }

  // Step 2 submit: enroll selected students for elective course
  const onStep2Submit = async () => {
    if (selectedIds.size === 0) {
      toast.error('Please select at least one student.')
      return
    }
    setIsEnrolling(true)
    try {
      await enrollSelected.mutateAsync({
        courseId: createdCourse.id,
        studentIds: Array.from(selectedIds),
      })
      toast.success(`Elective course created! ${selectedIds.size} student${selectedIds.size !== 1 ? 's' : ''} enrolled.`)
      handleClose()
    } catch (err) {
      toast.error(err.message || 'Failed to enroll students.')
    } finally {
      setIsEnrolling(false)
    }
  }

  const isPendingStep1 = createCourse.isPending || enrollDefault.isPending
  const allFilteredSelected = filteredStudents.length > 0 && filteredStudents.every((s) => selectedIds.has(s.id))

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={step === 1 ? 'Add New Course' : `Select Elective Students (${selectedClassName})`}
    >
      {/* Step Indicator */}
      <div className="flex items-center gap-2 mb-5">
        <div className={clsx('flex items-center gap-1.5 text-xs font-medium', step === 1 ? 'text-indigo-600' : 'text-slate-400')}>
          <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold', step === 1 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>1</span>
          Course & Class Info
        </div>
        <div className="flex-1 h-px bg-slate-200" />
        <div className={clsx('flex items-center gap-1.5 text-xs font-medium', step === 2 ? 'text-indigo-600' : 'text-slate-400')}>
          <span className={clsx('w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold', step === 2 ? 'bg-indigo-600 text-white' : 'bg-slate-200 text-slate-500')}>2</span>
          Select Students
        </div>
      </div>

      {/* ── STEP 1: Course Info ── */}
      {step === 1 && (
        <form onSubmit={handleSubmit(onStep1Submit)} className="space-y-4">
          {/* Class / Section Dropdown */}
          <div className="space-y-1.5">
            <Label htmlFor="className">Target Class / Section *</Label>
            <select
              id="className"
              {...register('className')}
              className={clsx(
                'w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white text-slate-900',
                errors.className ? 'border-red-400' : 'border-slate-200'
              )}
            >
              {CLASS_OPTIONS.map((cls) => (
                <option key={cls} value={cls}>
                  {cls}
                </option>
              ))}
            </select>
            {errors.className && <p className="text-xs text-red-500">{errors.className.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courseCode">Course Code *</Label>
            <Input
              id="courseCode"
              placeholder="e.g. IT301"
              {...register('courseCode')}
              className={errors.courseCode ? 'border-red-400' : ''}
            />
            {errors.courseCode && <p className="text-xs text-red-500">{errors.courseCode.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="courseName">Course Name *</Label>
            <Input
              id="courseName"
              placeholder="e.g. Web Technology"
              {...register('courseName')}
              className={errors.courseName ? 'border-red-400' : ''}
            />
            {errors.courseName && <p className="text-xs text-red-500">{errors.courseName.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="semester">Semester</Label>
            <Input id="semester" placeholder="e.g. 5" {...register('semester')} />
          </div>

          {/* Course Type Selector: Core vs Elective */}
          <div className="space-y-2">
            <Label>Course Type *</Label>
            <div className="grid grid-cols-2 gap-3">
              {/* Core Course Button */}
              <button
                type="button"
                onClick={() => setEnrollmentType('default')}
                className={clsx(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  enrollmentType === 'default'
                    ? 'border-indigo-500 bg-indigo-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                {enrollmentType === 'default' && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-indigo-600 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <div className={clsx('p-2 rounded-lg', enrollmentType === 'default' ? 'bg-indigo-100' : 'bg-slate-100')}>
                  <Users className={clsx('w-5 h-5', enrollmentType === 'default' ? 'text-indigo-600' : 'text-slate-500')} />
                </div>
                <div>
                  <p className={clsx('text-sm font-semibold', enrollmentType === 'default' ? 'text-indigo-700' : 'text-slate-700')}>Core Course</p>
                  <p className="text-xs text-slate-500 mt-0.5">Auto-enrolls whole section</p>
                </div>
              </button>

              {/* Elective Course Button */}
              <button
                type="button"
                onClick={() => setEnrollmentType('elective')}
                className={clsx(
                  'relative flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all text-center',
                  enrollmentType === 'elective'
                    ? 'border-purple-500 bg-purple-50'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                )}
              >
                {enrollmentType === 'elective' && (
                  <span className="absolute top-2 right-2 w-4 h-4 bg-purple-600 rounded-full flex items-center justify-center">
                    <Check className="w-2.5 h-2.5 text-white" />
                  </span>
                )}
                <div className={clsx('p-2 rounded-lg', enrollmentType === 'elective' ? 'bg-purple-100' : 'bg-slate-100')}>
                  <BookOpen className={clsx('w-5 h-5', enrollmentType === 'elective' ? 'text-purple-600' : 'text-slate-500')} />
                </div>
                <div>
                  <p className={clsx('text-sm font-semibold', enrollmentType === 'elective' ? 'text-purple-700' : 'text-slate-700')}>Elective Course</p>
                  <p className="text-xs text-slate-500 mt-0.5">Select specific students</p>
                </div>
              </button>
            </div>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={handleClose}>
              Cancel
            </Button>
            <Button type="submit" className="flex-1" disabled={isPendingStep1}>
              {isPendingStep1 ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{enrollmentType === 'default' ? 'Enrolling...' : 'Creating...'}</>
              ) : (
                enrollmentType === 'default'
                  ? 'Create & Enroll Section'
                  : <><span>Select Students</span><ChevronRight className="w-4 h-4 ml-1" /></>
              )}
            </Button>
          </div>
        </form>
      )}

      {/* ── STEP 2: Elective Student Picker (Filtered to selected section) ── */}
      {step === 2 && (
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Showing students from <strong className="text-slate-700">{selectedClassName}</strong>. Select students enrolled in this elective.
          </p>

          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by name or roll number…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Select All + count */}
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={toggleAll}
              className="text-xs text-indigo-600 font-medium hover:text-indigo-800"
            >
              {allFilteredSelected ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-slate-500">
              {selectedIds.size} of {classStudents.length} selected
            </span>
          </div>

          {/* Student List */}
          <div className="max-h-64 overflow-y-auto space-y-1 border border-slate-100 rounded-xl p-2">
            {studentsLoading ? (
              <div className="py-6 text-center text-sm text-slate-400">Loading section students…</div>
            ) : filteredStudents.length === 0 ? (
              <div className="py-6 text-center text-sm text-slate-400">No students found for this class section.</div>
            ) : (
              filteredStudents.map((student) => {
                const isSelected = selectedIds.has(student.id)
                return (
                  <button
                    key={student.id}
                    type="button"
                    onClick={() => toggleStudent(student.id)}
                    className={clsx(
                      'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-all',
                      isSelected
                        ? 'bg-indigo-50 border border-indigo-200'
                        : 'hover:bg-slate-50 border border-transparent'
                    )}
                  >
                    {/* Checkbox */}
                    <span className={clsx(
                      'w-4 h-4 rounded flex-shrink-0 border-2 flex items-center justify-center transition-all',
                      isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300'
                    )}>
                      {isSelected && <Check className="w-2.5 h-2.5 text-white" />}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-slate-800 truncate">{student.name}</p>
                      <p className="text-xs text-slate-400">{student.rollNumber || student.roll_number}</p>
                    </div>
                  </button>
                )
              })
            )}
          </div>

          {/* Action buttons */}
          <div className="flex gap-3 pt-1">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setStep(1)}
            >
              <ChevronLeft className="w-4 h-4 mr-1" />Back
            </Button>
            <Button
              type="button"
              className="flex-1 bg-purple-600 hover:bg-purple-700"
              disabled={isEnrolling || selectedIds.size === 0}
              onClick={onStep2Submit}
            >
              {isEnrolling ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Enrolling…</>
              ) : (
                `Enroll ${selectedIds.size} Student${selectedIds.size !== 1 ? 's' : ''}`
              )}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  )
}
