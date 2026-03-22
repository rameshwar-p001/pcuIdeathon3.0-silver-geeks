import { useEffect, useMemo, useRef, useState } from 'react'
import { apiRequest } from '../lib/api'

const normalize = (value) => String(value || '').trim()

const extractClassDivision = (classRow = {}) => {
  return normalize(
    classRow.division ||
      classRow.div ||
      classRow.class_id ||
      classRow.classId ||
      classRow.class_name ||
      classRow.className ||
      classRow.id,
  )
}

const readFileAsDataUrl = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result || ''))
    reader.onerror = () => reject(new Error('Unable to read selected image file.'))
    reader.readAsDataURL(file)
  })

const DEFAULT_DEPARTMENT_OPTIONS = [
  'CSE',
  'IT',
  'AI & DS',
  'ENTC',
  'Mechanical',
  'Civil',
  'Electrical',
]

const DEFAULT_DIVISION_OPTIONS = ['A', 'B', 'C', 'D']

const departmentMatches = (selectedDepartment, optionDepartment) => {
  const selected = normalize(selectedDepartment).toLowerCase()
  const option = normalize(optionDepartment).toLowerCase()

  if (!selected) {
    return true
  }

  if (!option) {
    return false
  }

  return option === selected || option.includes(selected) || selected.includes(option)
}

function AIAttendanceCapture({ classes = [] }) {
  const [selectedClassId, setSelectedClassId] = useState('')
  const [department, setDepartment] = useState('')
  const [division, setDivision] = useState('')
  const [subject, setSubject] = useState('')
  const [captureMode, setCaptureMode] = useState('realtime')
  const [classPhotoFile, setClassPhotoFile] = useState(null)
  const [classPhotoBase64, setClassPhotoBase64] = useState('')
  const [classPhotoPreview, setClassPhotoPreview] = useState('')
  const [isCameraOpen, setIsCameraOpen] = useState(false)
  const [isOpeningCamera, setIsOpeningCamera] = useState(false)
  const [loading, setLoading] = useState(false)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [result, setResult] = useState(null)
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)

  const classOptions = useMemo(
    () =>
      classes.map((row) => ({
        id: normalize(row.id),
        className: normalize(row.class_name || row.className || row.id),
        department: normalize(row.department),
        division: extractClassDivision(row),
      })),
    [classes],
  )

  const departmentOptions = useMemo(
    () =>
      Array.from(
        new Set([
          ...DEFAULT_DEPARTMENT_OPTIONS,
          ...classOptions.map((row) => row.department).filter(Boolean),
        ]),
      ),
    [classOptions],
  )

  const divisionOptions = useMemo(
    () => {
      const matchedDivisions = classOptions
        .filter((row) => departmentMatches(department, row.department))
        .map((row) => row.division)
        .filter(Boolean)

      const fallbackDivisions = classOptions
        .map((row) => row.division)
        .filter(Boolean)

      const source = matchedDivisions.length ? matchedDivisions : fallbackDivisions

      return Array.from(new Set([...DEFAULT_DIVISION_OPTIONS, ...source]))
    },
    [classOptions, department],
  )

  const handleClassChange = (nextClassId) => {
    setSelectedClassId(nextClassId)

    const selected = classOptions.find((row) => row.id === nextClassId)
    if (!selected) {
      return
    }

    if (selected.department) {
      setDepartment(selected.department)
    }

    if (selected.division) {
      setDivision(selected.division)
    }
  }

  const handleClassPhotoChange = (event) => {
    const file = event.target.files?.[0] || null
    setClassPhotoFile(file)
    setClassPhotoBase64('')
    setResult(null)
    setErrorMessage('')
    setSuccessMessage('')

    if (!file) {
      setClassPhotoPreview('')
      return
    }

    readFileAsDataUrl(file)
      .then((base64) => {
        setClassPhotoBase64(base64)
        setClassPhotoPreview(base64)
      })
      .catch(() => {
        setErrorMessage('Unable to read selected image file.')
        setClassPhotoBase64('')
        setClassPhotoPreview('')
      })
  }

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null
    }

    setIsCameraOpen(false)
    setIsOpeningCamera(false)
  }

  const startCamera = async () => {
    setErrorMessage('')
    setSuccessMessage('')
    setIsOpeningCamera(true)

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        throw new Error('Camera is not supported in this browser.')
      }

      if (typeof window !== 'undefined' && !window.isSecureContext) {
        throw new Error('Camera requires HTTPS on mobile. Open this page using a secure dev tunnel URL.')
      }

      stopCamera()

      const constraints = {
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920, min: 1280 },
          height: { ideal: 1080, min: 720 },
        },
        audio: false,
      }

      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints)
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false })
      }

      if (!videoRef.current) {
        throw new Error('Camera preview is not ready.')
      }

      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setIsCameraOpen(true)
    } catch (error) {
      stopCamera()
      setErrorMessage(error?.message || 'Unable to open camera.')
    } finally {
      setIsOpeningCamera(false)
    }
  }

  const captureFromCamera = () => {
    setErrorMessage('')
    setSuccessMessage('')

    if (!videoRef.current || !canvasRef.current || !isCameraOpen) {
      setErrorMessage('Camera is not ready. Please start camera first.')
      return
    }

    const video = videoRef.current
    const canvas = canvasRef.current
    const width = video.videoWidth || 1280
    const height = video.videoHeight || 720

    canvas.width = width
    canvas.height = height

    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setErrorMessage('Unable to capture frame from camera.')
      return
    }

    ctx.drawImage(video, 0, 0, width, height)
    const dataUrl = canvas.toDataURL('image/jpeg', 0.95)
    setClassPhotoFile(null)
    setClassPhotoBase64(dataUrl)
    setClassPhotoPreview(dataUrl)
    setSuccessMessage('Class photo captured successfully.')
  }

  useEffect(() => () => stopCamera(), [])

  useEffect(() => {
    if (captureMode === 'upload') {
      stopCamera()
    }
  }, [captureMode])

  const handleModeChange = (nextMode) => {
    setCaptureMode(nextMode)
    setResult(null)
    setErrorMessage('')
    setSuccessMessage('')

    if (nextMode === 'upload') {
      setClassPhotoFile(null)
      setClassPhotoBase64('')
      setClassPhotoPreview('')
      return
    }

    setClassPhotoFile(null)
    setClassPhotoBase64('')
    setClassPhotoPreview('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')
    setResult(null)

    if (!department || !division || !classPhotoBase64) {
      setErrorMessage('Department, division, and class photo are required.')
      return
    }

    setLoading(true)

    try {
      const response = await apiRequest('/api/attendance/ai-photo-mark', {
        method: 'POST',
        body: JSON.stringify({
          department,
          division,
          subject,
          classPhotoBase64,
        }),
      })

      setResult(response.data || null)
      setSuccessMessage(response.message || 'Attendance marked successfully.')
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to process attendance from class photo.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <section className="admin-panel-card">
      <h3>Take Attendance (AI Class Photo)</h3>
      <p className="login-hint">
        Select class details, capture class photo in real time (or upload), and mark attendance automatically.
      </p>

      {errorMessage && <p className="field-error">{errorMessage}</p>}
      {successMessage && <p className="field-success">{successMessage}</p>}

      <form className="auth-form" onSubmit={handleSubmit}>
        <label htmlFor="attendance-class">Class (optional auto-fill)</label>
        <select
          id="attendance-class"
          value={selectedClassId}
          onChange={(event) => handleClassChange(event.target.value)}
          disabled={loading}
        >
          <option value="">Select class</option>
          {classOptions.map((row) => (
            <option key={row.id} value={row.id}>
              {row.className}
            </option>
          ))}
        </select>

        <label htmlFor="attendance-department">Department</label>
        <select
          id="attendance-department"
          value={department}
          onChange={(event) => setDepartment(event.target.value)}
          disabled={loading}
          required
        >
          <option value="">Select department</option>
          {departmentOptions.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>

        <label htmlFor="attendance-division">Division</label>
        <select
          id="attendance-division"
          value={division}
          onChange={(event) => setDivision(event.target.value)}
          disabled={loading}
          required
        >
          <option value="">Select division</option>
          {divisionOptions.map((row) => (
            <option key={row} value={row}>
              {row}
            </option>
          ))}
        </select>

        <label htmlFor="attendance-subject">Subject (optional)</label>
        <input
          id="attendance-subject"
          type="text"
          value={subject}
          onChange={(event) => setSubject(event.target.value)}
          placeholder="Example: Data Structures"
          disabled={loading}
        />

        <label>Class Photo Source</label>
        <div className="table-actions" style={{ marginBottom: 8 }}>
          <button
            type="button"
            className={captureMode === 'realtime' ? 'submit-btn' : ''}
            onClick={() => handleModeChange('realtime')}
            disabled={loading}
          >
            Realtime Camera
          </button>
          <button
            type="button"
            className={captureMode === 'upload' ? 'submit-btn' : ''}
            onClick={() => handleModeChange('upload')}
            disabled={loading}
          >
            Upload Photo
          </button>
        </div>

        {captureMode === 'upload' && (
          <>
            <label htmlFor="attendance-photo">Upload Class Photo</label>
            <input
              id="attendance-photo"
              type="file"
              accept="image/*"
              onChange={handleClassPhotoChange}
              disabled={loading}
              required={captureMode === 'upload'}
            />
          </>
        )}

        {captureMode === 'realtime' && (
          <>
            <div className="table-actions" style={{ marginBottom: 8 }}>
              {!isCameraOpen && (
                <button
                  type="button"
                  onClick={startCamera}
                  disabled={loading || isOpeningCamera}
                >
                  {isOpeningCamera ? 'Opening Camera...' : 'Start Camera'}
                </button>
              )}
              {isCameraOpen && (
                <>
                  <button
                    type="button"
                    onClick={captureFromCamera}
                    disabled={loading}
                  >
                    Capture Class Photo
                  </button>
                  <button type="button" onClick={stopCamera} disabled={loading}>
                    Stop Camera
                  </button>
                </>
              )}
            </div>

            <video
              ref={videoRef}
              playsInline
              muted
              autoPlay
              style={{
                width: '100%',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
                minHeight: 180,
                background: '#f8fafc',
                display: isCameraOpen ? 'block' : 'none',
              }}
            />
            {!isCameraOpen && (
              <p className="login-hint" style={{ marginTop: 0 }}>
                Camera preview will appear here after you click Start Camera.
              </p>
            )}
            <canvas ref={canvasRef} style={{ display: 'none' }} />
          </>
        )}

        {classPhotoPreview && (
          <div className="new-selfie-preview-wrap">
            <span>Selected class photo:</span>
            <img src={classPhotoPreview} alt="Class preview" className="selfie-preview" />
          </div>
        )}

        <button type="submit" className="submit-btn" disabled={loading}>
          {loading ? 'Processing...' : 'Run AI Attendance'}
        </button>
      </form>

      {result && (
        <div className="users-table-wrap" style={{ marginTop: 16 }}>
          <table className="users-table">
            <thead>
              <tr>
                <th>Total Detected Faces</th>
                <th>Total Present</th>
                <th>Department</th>
                <th>Division</th>
                <th>Subject</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>{result.totalDetectedFaces ?? 0}</td>
                <td>{result.totalPresent ?? 0}</td>
                <td>{result.department || department}</td>
                <td>{result.division || division}</td>
                <td>{result.subject || subject || 'General'}</td>
              </tr>
            </tbody>
          </table>

          <table className="users-table" style={{ marginTop: 14 }}>
            <thead>
              <tr>
                <th>Present Student ID</th>
                <th>Name</th>
                <th>Email</th>
                <th>Enrollment</th>
              </tr>
            </thead>
            <tbody>
              {(result.presentStudents || []).length === 0 ? (
                <tr>
                  <td colSpan="4">No matched students found in this photo.</td>
                </tr>
              ) : (
                (result.presentStudents || []).map((student) => (
                  <tr key={student.student_id}>
                    <td>{student.student_id}</td>
                    <td>{student.name || 'N/A'}</td>
                    <td>{student.email || 'N/A'}</td>
                    <td>{student.enrollmentNumber || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export default AIAttendanceCapture
