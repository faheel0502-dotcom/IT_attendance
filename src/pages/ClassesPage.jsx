import { useState, useMemo } from 'react'
import {
  GraduationCap,
  Plus,
  FileSpreadsheet,
  Search,
  Trash2,
  Users,
  Loader2,
  Upload,
  CheckCircle2,
} from 'lucide-react'
import toast from 'react-hot-toast'
import * as XLSX from 'xlsx'
import clsx from 'clsx'
import {
  useAllStudents,
  useAddStudentToSection,
  useBulkImportToSection,
  useDeleteStudent,
  useBulkDeleteStudents,
} from '../hooks/useStudents'
import { Modal } from '../components/ui/Modal'
import { Button } from '../components/ui/Button'
import { Input } from '../components/ui/Input'
import { Label } from '../components/ui/Label'

const CLASS_SECTIONS = [
  'IT Final year',
  'IT 3rd year - section A',
  'IT 3rd year - section B',
  'IT 2nd year - section A',
  'IT 2nd year - section B',
  'IT 1st year - section A',
  'IT 1st year - section B',
]

export default function ClassesPage() {
  const [selectedSection, setSelectedSection] = useState(CLASS_SECTIONS[0])
  const [search, setSearch] = useState('')
  const [selectedStudentIds, setSelectedStudentIds] = useState(new Set())

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [isImportModalOpen, setIsImportModalOpen] = useState(false)

  // Manual Add Form State
  const [rollNumber, setRollNumber] = useState('')
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')

  // Excel Import State
  const [parsedStudents, setParsedStudents] = useState([])
  const [fileName, setFileName] = useState('')

  // Hooks
  const { data: students = [], isLoading } = useAllStudents(selectedSection)
  const addStudentMutation = useAddStudentToSection(selectedSection)
  const bulkImportMutation = useBulkImportToSection(selectedSection)
  const deleteStudentMutation = useDeleteStudent(selectedSection)
  const bulkDeleteMutation = useBulkDeleteStudents(selectedSection)

  const filteredStudents = useMemo(() => {
    const q = search.toLowerCase()
    return students.filter(
      (s) =>
        s.name.toLowerCase().includes(q) ||
        (s.rollNumber || s.roll_number)?.toLowerCase().includes(q) ||
        s.email?.toLowerCase().includes(q)
    )
  }, [students, search])

  // Clear selections when changing class sections
  const handleSectionChange = (sec) => {
    setSelectedSection(sec)
    setSelectedStudentIds(new Set())
    setSearch('')
  }

  // Toggle selection for single student
  const toggleSelectStudent = (id) => {
    setSelectedStudentIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  // Toggle Select All
  const toggleSelectAll = () => {
    if (selectedStudentIds.size === filteredStudents.length && filteredStudents.length > 0) {
      setSelectedStudentIds(new Set())
    } else {
      setSelectedStudentIds(new Set(filteredStudents.map((s) => s.id)))
    }
  }

  // Handle Bulk Delete Selected (NO confirmation popup prompt)
  const handleBulkDelete = async () => {
    if (selectedStudentIds.size === 0) return

    const idsToDelete = Array.from(selectedStudentIds)
    try {
      await bulkDeleteMutation.mutateAsync(idsToDelete)
      toast.success(`Removed ${idsToDelete.length} student${idsToDelete.length !== 1 ? 's' : ''} from ${selectedSection}.`)
      setSelectedStudentIds(new Set())
    } catch (err) {
      toast.error(err.message || 'Failed to delete students.')
    }
  }

  // Handle Single Delete (NO confirmation popup prompt)
  const handleSingleDelete = async (studentId) => {
    try {
      await deleteStudentMutation.mutateAsync(studentId)
      toast.success('Student removed.')
      setSelectedStudentIds((prev) => {
        const next = new Set(prev)
        next.delete(studentId)
        return next
      })
    } catch (err) {
      toast.error('Failed to remove student.')
    }
  }

  // Handle Manual Add
  const handleAddSubmit = async (e) => {
    e.preventDefault()
    if (!rollNumber.trim() || !name.trim()) {
      toast.error('Roll number and name are required.')
      return
    }

    try {
      await addStudentMutation.mutateAsync({
        rollNumber: rollNumber.trim(),
        name: name.trim(),
        email: email.trim() || undefined,
      })
      toast.success(`Student added to ${selectedSection}!`)
      setRollNumber('')
      setName('')
      setEmail('')
      setIsAddModalOpen(false)
    } catch (err) {
      toast.error(err.message || 'Failed to add student.')
    }
  }

  // Handle Excel File Parsing
  const handleFileUpload = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    setFileName(file.name)
    const reader = new FileReader()

    reader.onload = (evt) => {
      try {
        const bstr = evt.target?.result
        const workbook = XLSX.read(bstr, { type: 'binary' })
        const firstSheetName = workbook.SheetNames[0]
        const worksheet = workbook.Sheets[firstSheetName]
        const rawData = XLSX.utils.sheet_to_json(worksheet, { header: 1 })

        if (rawData.length < 2) {
          toast.error('Excel file appears to be empty or missing headers.')
          return
        }

        const headers = (rawData[0] || []).map((h) => String(h).toLowerCase().trim())
        // Detect RRN column (Register Roll Number) first, then fallback to generic roll/id/no
        let rollIdx = headers.findIndex((h) => h === 'rrn' || h.includes('rrn'))
        if (rollIdx === -1) rollIdx = headers.findIndex((h) => h.includes('roll') || h.includes('register') || h.includes('no.'))
        if (rollIdx === -1) rollIdx = headers.findIndex((h) => h.includes('id') || h.includes('no'))
        let nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('student'))
        let emailIdx = headers.findIndex((h) => h.includes('mail'))

        if (rollIdx === -1) rollIdx = 0
        if (nameIdx === -1) nameIdx = 1

        const rows = rawData.slice(1)
        const extracted = []

        rows.forEach((row) => {
          const rNo = row[rollIdx] ? String(row[rollIdx]).trim() : ''
          const rName = row[nameIdx] ? String(row[nameIdx]).trim() : ''
          const rEmail = emailIdx !== -1 && row[emailIdx] ? String(row[emailIdx]).trim() : ''

          if (rNo && rName) {
            extracted.push({ rollNumber: rNo, name: rName, email: rEmail })
          }
        })

        if (extracted.length === 0) {
          toast.error('Could not parse any valid student rows from file.')
          return
        }

        // Sort by RRN / roll number using natural alphanumeric order
        extracted.sort((a, b) =>
          a.rollNumber.localeCompare(b.rollNumber, undefined, { numeric: true, sensitivity: 'base' })
        )

        setParsedStudents(extracted)
        toast.success(`Found ${extracted.length} valid student records in ${file.name}`)
      } catch (err) {
        toast.error('Failed to parse Excel file. Make sure it is .xlsx or .csv format.')
      }
    }

    reader.readAsBinaryString(file)
  }

  // Submit Bulk Import
  const handleBulkImportSubmit = async () => {
    if (parsedStudents.length === 0) {
      toast.error('No parsed students to import.')
      return
    }

    try {
      const res = await bulkImportMutation.mutateAsync(parsedStudents)
      toast.success(`Successfully imported ${res.count || parsedStudents.length} students into ${selectedSection}!`)
      setParsedStudents([])
      setFileName('')
      setIsImportModalOpen(false)
    } catch (err) {
      toast.error(err.message || 'Failed to import students.')
    }
  }

  const isAllSelected = filteredStudents.length > 0 && selectedStudentIds.size === filteredStudents.length

  return (
    <div className="space-y-6">
      {/* Page Title & Top Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2.5">
            <GraduationCap className="w-7 h-7 text-indigo-600" />
            Class Sections & Master Lists
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Manage student rosters for each of the 7 IT class sections.
          </p>
        </div>

        {/* Header Actions */}
        <div className="flex items-center gap-2.5 flex-wrap">
          {selectedStudentIds.size > 0 && (
            <Button
              onClick={handleBulkDelete}
              disabled={bulkDeleteMutation.isPending}
              className="bg-red-600 hover:bg-red-700 text-white flex items-center gap-2 shadow-sm animate-pulse"
            >
              {bulkDeleteMutation.isPending ? (
                <><Loader2 className="w-4 h-4 animate-spin" />Deleting…</>
              ) : (
                <><Trash2 className="w-4 h-4" />Delete Selected ({selectedStudentIds.size})</>
              )}
            </Button>
          )}
          <Button
            variant="outline"
            onClick={() => setIsImportModalOpen(true)}
            className="flex items-center gap-2 text-indigo-600 border-indigo-200 hover:bg-indigo-50"
          >
            <FileSpreadsheet className="w-4 h-4" />
            Import Excel
          </Button>
          <Button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </Button>
        </div>
      </div>

      {/* Class Section Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-none border-b border-slate-200">
        {CLASS_SECTIONS.map((sec) => (
          <button
            key={sec}
            onClick={() => handleSectionChange(sec)}
            className={clsx(
              'px-4 py-2.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all duration-150 flex items-center gap-2',
              selectedSection === sec
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'bg-white text-slate-600 hover:bg-slate-100 hover:text-slate-900 border border-slate-200'
            )}
          >
            <Users className="w-3.5 h-3.5" />
            {sec}
          </button>
        ))}
      </div>

      {/* Roster Controls & Table */}
      <div className="bg-white rounded-2xl border border-slate-100 p-5 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">{selectedSection}</h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Total Enrolled Students: <strong className="text-slate-800 font-semibold">{students.length}</strong>
              {selectedStudentIds.size > 0 && (
                <span className="ml-2 text-indigo-600 font-medium">({selectedStudentIds.size} selected)</span>
              )}
            </p>
          </div>

          {/* Search Box */}
          <div className="relative w-full md:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search student or roll no…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
            />
          </div>
        </div>

        {/* Student Roster Table with Multi-Select Checkboxes */}
        <div className="overflow-x-auto border border-slate-100 rounded-xl">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50/80 text-xs font-semibold text-slate-500 uppercase tracking-wider border-b border-slate-100">
              <tr>
                <th className="py-3 px-4 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    title="Select All"
                  />
                </th>
                <th className="py-3 px-4">#</th>
                <th className="py-3 px-4">Roll Number</th>
                <th className="py-3 px-4">Student Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-indigo-600" />
                    Loading roster for {selectedSection}…
                  </td>
                </tr>
              ) : filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No students found in {selectedSection}. Click "Add Student" or "Import Excel" to populate.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const isChecked = selectedStudentIds.has(s.id)
                  return (
                    <tr
                      key={s.id}
                      className={clsx(
                        'transition-colors',
                        isChecked ? 'bg-indigo-50/60' : 'hover:bg-slate-50/80'
                      )}
                    >
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelectStudent(s.id)}
                          className="w-4 h-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3 px-4 text-xs font-medium text-slate-400">{idx + 1}</td>
                      <td className="py-3 px-4 font-mono font-semibold text-indigo-600 text-xs">
                        {s.rollNumber || s.roll_number}
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">{s.name}</td>
                      <td className="py-3 px-4 text-xs text-slate-500">{s.email || '—'}</td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={() => handleSingleDelete(s.id)}
                          disabled={deleteStudentMutation.isPending}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Delete student immediately"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ── MODAL 1: MANUAL ADD STUDENT ── */}
      <Modal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        title={`Add Student to ${selectedSection}`}
      >
        <form onSubmit={handleAddSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="rollNo">Roll Number *</Label>
            <Input
              id="rollNo"
              placeholder="e.g. 22ITA101"
              value={rollNumber}
              onChange={(e) => setRollNumber(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sName">Full Name *</Label>
            <Input
              id="sName"
              placeholder="e.g. Aarav Sharma"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="sEmail">Email Address (Optional)</Label>
            <Input
              id="sEmail"
              type="email"
              placeholder="aarav@student.college.edu"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => setIsAddModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={addStudentMutation.isPending}
            >
              {addStudentMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Saving…</>
              ) : (
                'Add Student'
              )}
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── MODAL 2: BULK IMPORT EXCEL ── */}
      <Modal
        isOpen={isImportModalOpen}
        onClose={() => {
          setIsImportModalOpen(false)
          setParsedStudents([])
          setFileName('')
        }}
        title={`Import Excel Roster for ${selectedSection}`}
      >
        <div className="space-y-4">
          <p className="text-xs text-slate-500">
            Upload an <strong>Excel (.xlsx)</strong> or <strong>CSV</strong> file. The file should have columns for <strong>Roll Number</strong> and <strong>Student Name</strong>.
          </p>

          {/* File Upload Box */}
          <div className="border-2 border-dashed border-slate-200 hover:border-indigo-400 rounded-2xl p-6 text-center transition-colors cursor-pointer bg-slate-50/50 relative">
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              onChange={handleFileUpload}
              className="absolute inset-0 opacity-0 cursor-pointer"
            />
            <div className="flex flex-col items-center">
              <Upload className="w-8 h-8 text-indigo-500 mb-2" />
              <p className="text-sm font-semibold text-slate-700">
                {fileName ? fileName : 'Click or drag Excel file here'}
              </p>
              <p className="text-xs text-slate-400 mt-1">Supports .xlsx, .xls, .csv</p>
            </div>
          </div>

          {/* Parsed Preview */}
          {parsedStudents.length > 0 && (
            <div className="space-y-2 bg-indigo-50/60 border border-indigo-100 rounded-xl p-3">
              <div className="flex items-center gap-2 text-indigo-700 font-semibold text-xs">
                <CheckCircle2 className="w-4 h-4 text-indigo-600" />
                Ready to import {parsedStudents.length} students into {selectedSection}
              </div>
              <div className="max-h-36 overflow-y-auto divide-y divide-indigo-100 text-xs">
                {parsedStudents.slice(0, 5).map((s, idx) => (
                  <div key={idx} className="py-1 flex justify-between text-slate-700">
                    <span className="font-mono font-medium">{s.rollNumber}</span>
                    <span>{s.name}</span>
                  </div>
                ))}
                {parsedStudents.length > 5 && (
                  <p className="py-1 text-slate-400 italic text-center">
                    …and {parsedStudents.length - 5} more students
                  </p>
                )}
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={() => {
                setIsImportModalOpen(false)
                setParsedStudents([])
                setFileName('')
              }}
            >
              Cancel
            </Button>
            <Button
              type="button"
              className="flex-1 bg-indigo-600 hover:bg-indigo-700"
              disabled={bulkImportMutation.isPending || parsedStudents.length === 0}
              onClick={handleBulkImportSubmit}
            >
              {bulkImportMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Importing…</>
              ) : (
                `Import ${parsedStudents.length} Students`
              )}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
