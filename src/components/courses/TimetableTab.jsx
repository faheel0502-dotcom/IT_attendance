import { useState } from 'react'
import { Plus, X, Loader2, FlaskConical, BookOpen } from 'lucide-react'
import toast from 'react-hot-toast'
import { useTimetable, useAddTimetableEntry, useDeleteTimetableEntry, useDeleteTimetableEntries } from '../../hooks/useTimetable'
import { LoadingSpinner } from '../ui/LoadingSpinner'

const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const HOURS = [1, 2, 3, 4, 5, 6, 7, 8]
const DURATIONS = [
  { value: 1, label: '1 Hour (Lecture)' },
  { value: 2, label: '2 Hours (Lab Block)' },
  { value: 3, label: '3 Hours (Lab Block)' },
  { value: 4, label: '4 Hours (Lab Block)' },
]

export function TimetableTab({ courseId }) {
  const [selectedDay, setSelectedDay] = useState(1)
  const [selectedHour, setSelectedHour] = useState(1)
  const [selectedDuration, setSelectedDuration] = useState(1)
  const { data: entries, isLoading } = useTimetable(courseId)
  const addEntry = useAddTimetableEntry(courseId)
  const deleteEntry = useDeleteTimetableEntry(courseId)
  const deleteEntries = useDeleteTimetableEntries(courseId)

  const isSlotsConflicting = (day, startHour, duration) => {
    if (!entries) return false
    for (let i = 0; i < duration; i++) {
      if (entries.some((e) => e.dayOfWeek === day && e.hour === startHour + i)) return true
    }
    return false
  }

  const handleAdd = async () => {
    if (isSlotsConflicting(selectedDay, selectedHour, selectedDuration)) {
      toast.error('One or more slots in this block are already added.')
      return
    }
    // Validate start hour + duration doesn't exceed hour 8
    if (selectedHour + selectedDuration - 1 > 8) {
      toast.error(`Cannot add ${selectedDuration}-hour block starting at Hour ${selectedHour} — exceeds Hour 8.`)
      return
    }
    try {
      await addEntry.mutateAsync({ courseId, dayOfWeek: selectedDay, hour: selectedHour, duration: selectedDuration })
      const msg = selectedDuration > 1
        ? `Lab block added: Hours ${selectedHour}–${selectedHour + selectedDuration - 1}`
        : `Hour ${selectedHour} added.`
      toast.success(msg)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDelete = async (id, hour) => {
    try {
      await deleteEntry.mutateAsync(id)
      toast.success(`Hour ${hour} removed.`)
    } catch (err) {
      toast.error(err.message)
    }
  }

  const handleDeleteGroup = async (group) => {
    try {
      if (group.length === 1) {
        await deleteEntry.mutateAsync(group[0].id)
        toast.success(`Hour ${group[0].hour} removed.`)
      } else {
        await deleteEntries.mutateAsync(group.map((e) => e.id))
        toast.success(`Lab block Hours ${group[0].hour}–${group[group.length - 1].hour} removed.`)
      }
    } catch (err) {
      toast.error(err.message)
    }
  }

  if (isLoading) return <LoadingSpinner />

  // Group entries by day, detect consecutive lab blocks
  const byDay = DAYS.reduce((acc, _, i) => {
    const dayNum = i + 1
    const dayEntries = (entries?.filter((e) => e.dayOfWeek === dayNum) || [])
      .sort((a, b) => a.hour - b.hour)

    // Group consecutive hours into lab blocks
    const groups = []
    let i2 = 0
    while (i2 < dayEntries.length) {
      const group = [dayEntries[i2]]
      while (
        i2 + 1 < dayEntries.length &&
        dayEntries[i2 + 1].hour === dayEntries[i2].hour + 1
      ) {
        i2++
        group.push(dayEntries[i2])
      }
      groups.push(group)
      i2++
    }
    acc[dayNum] = groups
    return acc
  }, {})

  return (
    <div className="space-y-6">
      {/* Add Slot */}
      <div className="bg-slate-50 rounded-xl p-4">
        <h3 className="text-sm font-semibold text-slate-700 mb-3">Add Time Slot</h3>
        <div className="flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Day</label>
            <select
              value={selectedDay}
              onChange={(e) => setSelectedDay(Number(e.target.value))}
              className="block border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DAYS.map((d, i) => <option key={d} value={i + 1}>{d}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Start Hour</label>
            <select
              value={selectedHour}
              onChange={(e) => setSelectedHour(Number(e.target.value))}
              className="block border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {HOURS.map((h) => <option key={h} value={h}>Hour {h}</option>)}
            </select>
          </div>
          <div className="space-y-1">
            <label className="text-xs text-slate-500 font-medium">Session Type</label>
            <select
              value={selectedDuration}
              onChange={(e) => setSelectedDuration(Number(e.target.value))}
              className="block border border-slate-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {DURATIONS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
            </select>
          </div>
          {selectedDuration > 1 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2 self-end">
              📅 Hours {selectedHour}–{Math.min(selectedHour + selectedDuration - 1, 8)} will be one lab session
            </div>
          )}
          <button
            onClick={handleAdd}
            disabled={addEntry.isPending}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 self-end"
          >
            {addEntry.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add {selectedDuration > 1 ? 'Lab Block' : 'Slot'}
          </button>
        </div>
      </div>

      {/* Schedule Grid */}
      <div className="space-y-3">
        {DAYS.map((day, i) => {
          const groups = byDay[i + 1]
          if (!groups || groups.length === 0) return null
          return (
            <div key={day} className="flex items-start gap-3 flex-wrap">
              <span className="text-xs font-semibold text-slate-500 w-24 flex-shrink-0 pt-1.5">{day}</span>
              <div className="flex flex-wrap gap-2">
                {groups.map((group) => {
                  const isLab = group.length > 1
                  const startHour = group[0].hour
                  const endHour = group[group.length - 1].hour
                  return (
                    <div
                      key={group[0].id}
                      className={`flex items-center gap-1.5 border rounded-lg px-3 py-1.5 ${
                        isLab
                          ? 'bg-purple-50 border-purple-200'
                          : 'bg-blue-50 border-blue-100'
                      }`}
                    >
                      {isLab ? (
                        <FlaskConical className="w-3.5 h-3.5 text-purple-500 flex-shrink-0" />
                      ) : (
                        <BookOpen className="w-3.5 h-3.5 text-blue-400 flex-shrink-0" />
                      )}
                      <span className={`text-xs font-semibold ${isLab ? 'text-purple-700' : 'text-blue-700'}`}>
                        {isLab ? `Hours ${startHour}–${endHour} (Lab)` : `Hour ${startHour}`}
                      </span>
                      <button
                        onClick={() => handleDeleteGroup(group)}
                        disabled={deleteEntry.isPending || deleteEntries.isPending}
                        className={`transition-colors ${
                          isLab ? 'text-purple-300 hover:text-purple-600' : 'text-blue-300 hover:text-blue-600'
                        }`}
                        title={isLab ? 'Remove entire lab block' : 'Remove slot'}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        {entries?.length === 0 && (
          <p className="text-sm text-slate-400 py-4 text-center">No time slots set. Add your first slot above.</p>
        )}
      </div>
    </div>
  )
}
