import { useState, useEffect } from 'react'
import { Table, PageHeader, Badge, Button, Modal } from '../../components/ui'
import { Upload } from 'lucide-react'
import api from '../../services/api'

export default function HODStudents() {
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterClass, setFilterClass] = useState('')
  const [modal, setModal] = useState(null)
  const [error, setError] = useState('')
  
  const [importFile, setImportFile] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [importResult, setImportResult] = useState(null)

  const load = () => {
    setLoading(true)
    Promise.all([api.get('/users/students'), api.get('/classes/')]).then(([s, c]) => {
      setStudents(s.data); setClasses(c.data); setLoading(false)
    }).catch(() => setLoading(false))
  }

  useEffect(() => {
    load()
  }, [])

  const handleBulkImport = async () => {
    setUploading(true); setError(''); setImportResult(null)
    try {
      const formData = new FormData()
      formData.append('file', importFile)
      const res = await api.post('/users/students/bulk-import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      })
      setImportResult(res.data)
      setImportFile(null)
      load()
    } catch (err) {
      setError(err.response?.data?.detail || 'Error uploading file')
    } finally {
      setUploading(false)
    }
  }

  const filtered = students.filter(s => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.registration_number.toLowerCase().includes(search.toLowerCase())
    const matchClass = !filterClass || String(s.class_id) === filterClass
    return matchSearch && matchClass
  })

  const columns = [
    { key: 'registration_number', label: 'Reg. No.' },
    { key: 'name', label: 'Name' },
    { key: 'class', label: 'Class', render: r => r.class_ ? `Year ${r.class_.year} - ${r.class_.section}` : r.class_id },
    { key: 'email', label: 'Email' },
    { key: 'mobile_number', label: 'Mobile' },
    { key: 'status', label: '', render: r => <Badge color={r.user.is_active ? 'green' : 'red'}>{r.user.is_active ? 'Active' : 'Inactive'}</Badge> },
  ]

  return (
    <div>
      <PageHeader 
        title="Students" 
        subtitle={`${students.length} students in your department`} 
        action={
          <Button variant="secondary" onClick={() => { setModal('bulk'); setImportFile(null); setImportResult(null); setError('') }}>
            <Upload size={14} /> Bulk Register
          </Button>
        }
      />
      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
        <div className="p-4 border-b border-gray-100 dark:border-gray-700 flex flex-wrap gap-3">
          <input className="w-full sm:w-64 px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="Search..." value={search} onChange={e => setSearch(e.target.value)} />
          <select className="px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={filterClass} onChange={e => setFilterClass(e.target.value)}>
            <option value="">All Classes</option>
            {classes.map(c => <option key={c.id} value={c.id}>Year {c.year} - {c.section}</option>)}
          </select>
        </div>
        <Table columns={columns} data={filtered} loading={loading} />
      </div>

      <Modal open={modal === 'bulk'} onClose={() => { setModal(null); setImportFile(null); setImportResult(null); setError('') }} title="Bulk Registration (Excel/CSV)">
        <div className="space-y-4">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Upload an Excel (.xlsx, .xls) or CSV file containing both students and faculty members.
          </p>
          <div className="border border-dashed border-gray-300 dark:border-gray-600 rounded-xl p-6 text-center bg-gray-50/50 dark:bg-gray-800/50">
            <input 
              type="file" 
              accept=".xlsx,.xls,.csv" 
              onChange={e => setImportFile(e.target.files[0])}
              className="hidden" 
              id="bulk-file-upload" 
            />
            <label htmlFor="bulk-file-upload" className="cursor-pointer flex flex-col items-center gap-2">
              <Upload size={28} className="text-blue-500 animate-pulse" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {importFile ? importFile.name : 'Select Excel or CSV file'}
              </span>
              <span className="text-xs text-gray-400">Click to browse your files</span>
            </label>
          </div>

          <div className="text-xs text-gray-500 dark:text-gray-400 bg-blue-50/50 dark:bg-blue-900/10 p-3 rounded-lg space-y-1">
            <p className="font-semibold text-blue-700 dark:text-blue-400">Expected Columns:</p>
            <ul className="list-disc list-inside space-y-0.5">
              <li><strong>Common</strong>: role (student/faculty), username, password, name, email, mobile_number</li>
              <li><strong>Student</strong>: registration_number, class_id (or department_code, year, section)</li>
              <li><strong>Faculty</strong>: employee_id, department_code (or department_id), designation</li>
            </ul>
          </div>

          {importResult && (
            <div className={`p-3 rounded-lg text-xs space-y-1 ${importResult.failed > 0 ? 'bg-red-50 text-red-800 dark:bg-red-950/20 dark:text-red-300' : 'bg-green-50 text-green-800 dark:bg-green-950/20 dark:text-green-300'}`}>
              <p className="font-semibold text-sm">Import Complete:</p>
              <p>Successfully imported: <strong>{importResult.imported}</strong> records</p>
              <p>Failed: <strong>{importResult.failed}</strong> records</p>
              {importResult.errors?.length > 0 && (
                <div className="mt-2 max-h-28 overflow-y-auto border-t border-red-250 dark:border-red-800/30 pt-2 space-y-1 font-mono text-[10px]">
                  {importResult.errors.map((err, index) => (
                    <p key={index} className="text-red-600 dark:text-red-400">{err}</p>
                  ))}
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">{error}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" onClick={() => { setModal(null); setImportFile(null); setImportResult(null); setError('') }}>Cancel</Button>
            <Button onClick={handleBulkImport} disabled={!importFile || uploading}>
              {uploading ? 'Importing...' : 'Import'}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
