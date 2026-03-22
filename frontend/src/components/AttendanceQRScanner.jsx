import { useState, useRef, useEffect } from 'react'
import { Html5QrcodeScanner } from 'html5-qrcode'
import { apiRequest } from '../lib/api'

function AttendanceQRScanner({ user }) {
  const [activeTab, setActiveTab] = useState('scan') // 'scan' or 'history'
  const [scannedData, setScannedData] = useState(null)
  const [studentLocation, setStudentLocation] = useState(null)
  const [locationError, setLocationError] = useState('')
  const [attendanceMessage, setAttendanceMessage] = useState('')
  const [attendanceError, setAttendanceError] = useState('')
  const [loading, setLoading] = useState(false)
  const [isFaceVerified, setIsFaceVerified] = useState(false)
  const [faceScore, setFaceScore] = useState(null)
  const [isFaceScannerOpen, setIsFaceScannerOpen] = useState(false)
  const [isOpeningFaceCamera, setIsOpeningFaceCamera] = useState(false)
  const [isVerifyingFace, setIsVerifyingFace] = useState(false)
  const [faceVerificationMessage, setFaceVerificationMessage] = useState('')
  const [attendanceHistory, setAttendanceHistory] = useState([])
  const [historyLoading, setHistoryLoading] = useState(false)
  const scannerRef = useRef(null)
  const htmlScannerRef = useRef(null)
  const faceVideoRef = useRef(null)
  const faceCanvasRef = useRef(null)
  const faceStreamRef = useRef(null)

  const stopQrScanner = async () => {
    try {
      if (scannerRef.current) {
        await scannerRef.current.clear()
        scannerRef.current = null
      }
    } catch {
      // Ignore scanner clear errors when scanner is already stopped.
    }

    if (htmlScannerRef.current) {
      htmlScannerRef.current.hasScanner = false
      const previewVideo = htmlScannerRef.current.querySelector('video')
      const previewStream = previewVideo?.srcObject
      if (previewStream?.getTracks) {
        previewStream.getTracks().forEach((track) => track.stop())
      }
      htmlScannerRef.current.innerHTML = ''
    }
  }

  const startQrScanner = () => {
    if (!htmlScannerRef.current || htmlScannerRef.current.hasScanner || scannedData) {
      return
    }

    const scanner = new Html5QrcodeScanner(
      htmlScannerRef.current.id,
      {
        fps: 8,
        qrbox: { width: 260, height: 260 },
        aspectRatio: 1.0,
        rememberLastUsedCamera: true,
        videoConstraints: { facingMode: { ideal: 'environment' } },
      },
      false
    )

    scannerRef.current = scanner
    scanner.render(onScanSuccess, onScanError)
    htmlScannerRef.current.hasScanner = true
  }

  useEffect(() => {
    if (activeTab === 'scan' && !scannedData) {
      startQrScanner()
    } else {
      stopQrScanner()
    }

    return () => {
      stopQrScanner()
    }
  }, [activeTab, scannedData])

  const onScanSuccess = async (decodedText) => {
    try {
      await stopQrScanner()

      const qrData = JSON.parse(decodedText)
      setScannedData(qrData)
      setAttendanceError('')
      setAttendanceMessage('')
      setIsFaceVerified(false)
      setFaceScore(null)
      setFaceVerificationMessage('')
      stopFaceScanner()

      // Request student location
      if (!navigator.geolocation) {
        setLocationError('Geolocation is not supported by your browser.')
        return
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          setStudentLocation({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
          })
          setLocationError('')
        },
        (error) => {
          setLocationError(`Unable to get location: ${error.message}`)
        }
      )
    } catch (error) {
      setAttendanceError('Invalid QR code format.')
      setScannedData(null)
    }
  }

  const onScanError = (error) => {
    // Silently ignore scanning errors
  }

  const stopFaceScanner = () => {
    if (faceStreamRef.current) {
      faceStreamRef.current.getTracks().forEach((track) => track.stop())
      faceStreamRef.current = null
    }
    if (faceVideoRef.current) {
      faceVideoRef.current.srcObject = null
    }
    setIsOpeningFaceCamera(false)
    setIsFaceScannerOpen(false)
  }

  const waitForVideoElement = async (attempts = 40, waitMs = 50) => {
    for (let i = 0; i < attempts; i += 1) {
      if (faceVideoRef.current) {
        return faceVideoRef.current
      }
      await new Promise((resolve) => setTimeout(resolve, waitMs))
    }

    throw new Error('Face video element not ready')
  }

  const waitForFrameReadiness = async (video, timeoutMs = 5000) => {
    const startTime = Date.now()
    while (Date.now() - startTime < timeoutMs) {
      const hasFrame = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0
      if (hasFrame) {
        return
      }
      await new Promise((resolve) => setTimeout(resolve, 80))
    }
    throw new Error('Camera started but no video frame is available yet')
  }

  const startFaceScanner = async () => {
    setAttendanceError('')
    setFaceVerificationMessage('')
    setIsOpeningFaceCamera(true)
    setIsFaceScannerOpen(true)

    try {
      if (!navigator?.mediaDevices?.getUserMedia) {
        setAttendanceError('Camera API is not available in this browser/device.')
        setIsOpeningFaceCamera(false)
        setIsFaceScannerOpen(false)
        return
      }

      if (!window.isSecureContext) {
        setAttendanceError('Camera access requires HTTPS or localhost. Open this page on https:// or localhost.')
        setIsOpeningFaceCamera(false)
        setIsFaceScannerOpen(false)
        return
      }

      await stopQrScanner()

      // Give the device a short moment to release the previous camera stream.
      await new Promise((resolve) => setTimeout(resolve, 200))

      const constraintsList = [
        { video: { facingMode: { exact: 'user' } }, audio: false },
        { video: { facingMode: 'user' }, audio: false },
        { video: { facingMode: { ideal: 'user' } }, audio: false },
        { video: true, audio: false },
      ]

      let stream = null
      let lastError = null

      for (const constraints of constraintsList) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints)
          if (stream) {
            break
          }
        } catch (error) {
          lastError = error
        }
      }

      if (!stream) {
        throw lastError || new Error('Unable to access camera stream')
      }

      faceStreamRef.current = stream

      const video = await waitForVideoElement()
      video.srcObject = stream

      const playPromise = video.play?.()
      if (playPromise?.catch) {
        await playPromise.catch(() => {
          // Some mobile browsers delay autoplay until media is ready.
        })
      }

      await waitForFrameReadiness(video)
      setIsOpeningFaceCamera(false)
    } catch (error) {
      stopFaceScanner()
      setAttendanceError(`Unable to open front camera: ${error.message}`)
      setIsOpeningFaceCamera(false)
    }
  }

  const captureAndVerifyFace = async () => {
    if (!faceVideoRef.current || !faceCanvasRef.current) {
      setAttendanceError('Camera is not ready for face scan.')
      return
    }

    setIsVerifyingFace(true)
    setAttendanceError('')
    setFaceVerificationMessage('')

    try {
      const video = faceVideoRef.current
      const canvas = faceCanvasRef.current
      const hasLiveFrame = video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0

      if (!hasLiveFrame) {
        setAttendanceError('Camera frame not ready. Please wait a second and try capture again.')
        setIsVerifyingFace(false)
        return
      }

      const sourceWidth = video.videoWidth || 640
      const sourceHeight = video.videoHeight || 480
      const maxDimension = 640
      const scale = Math.min(1, maxDimension / Math.max(sourceWidth, sourceHeight))
      const width = Math.max(1, Math.round(sourceWidth * scale))
      const height = Math.max(1, Math.round(sourceHeight * scale))

      canvas.width = width
      canvas.height = height

      const context = canvas.getContext('2d')
      context.drawImage(video, 0, 0, width, height)

      const dataUrl = canvas.toDataURL('image/jpeg', 0.75)
      const base64 = dataUrl.split(',')[1]

      const response = await apiRequest('/api/attendance/face-verify', {
        method: 'POST',
        body: JSON.stringify({
          liveImageBase64: base64,
        }),
      })

      setIsFaceVerified(true)
      setFaceScore(response?.data?.score ?? null)
      setFaceVerificationMessage(response?.message || 'Face verified successfully.')
      stopFaceScanner()
    } catch (error) {
      setIsFaceVerified(false)
      setFaceScore(null)
      setAttendanceError(error?.message || 'Face verification failed.')
    } finally {
      setIsVerifyingFace(false)
    }
  }

  const handleMarkAttendance = async () => {
    if (!scannedData || !studentLocation) {
      setAttendanceError('QR code and location data required.')
      return
    }

    if (!isFaceVerified) {
      setAttendanceError('Please complete face scan verification before marking attendance.')
      return
    }

    setLoading(true)
    setAttendanceError('')
    setAttendanceMessage('')

    try {
      const response = await apiRequest('/api/attendance/qr-mark', {
        method: 'POST',
        body: JSON.stringify({
          qrData: scannedData,
          studentLatitude: studentLocation.latitude,
          studentLongitude: studentLocation.longitude,
          studentAccuracy: studentLocation.accuracy,
        }),
      })

      setAttendanceMessage(response.message)
      setScannedData(null)
      setStudentLocation(null)
      setIsFaceVerified(false)
      setFaceScore(null)
      setFaceVerificationMessage('')
      stopFaceScanner()

      // Reload attendance history
      await loadAttendanceHistory()
    } catch (error) {
      setAttendanceError(error?.message || 'Failed to mark attendance.')
    } finally {
      setLoading(false)
    }
  }

  const loadAttendanceHistory = async () => {
    setHistoryLoading(true)
    try {
      const response = await apiRequest('/api/attendance/qr-history')
      setAttendanceHistory(response.data || [])
    } catch (error) {
      console.error('Failed to load history:', error)
    } finally {
      setHistoryLoading(false)
    }
  }

  useEffect(() => {
    if (activeTab === 'history') {
      loadAttendanceHistory()
    }
  }, [activeTab])

  useEffect(() => {
    return () => {
      stopFaceScanner()
    }
  }, [])

  return (
    <div className="attendance-qr-scanner">
      <div className="tabs">
        <button
          className={`tab-btn ${activeTab === 'scan' ? 'active' : ''}`}
          onClick={() => setActiveTab('scan')}
        >
          Scan QR
        </button>
        <button
          className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`}
          onClick={() => setActiveTab('history')}
        >
          Attendance History
        </button>
      </div>

      {activeTab === 'scan' && (
        <div className="scan-section">
          <h3>Mark Attendance via QR Code</h3>

          {attendanceError && <div className="error-message">{attendanceError}</div>}
          {attendanceMessage && <div className="success-message">{attendanceMessage}</div>}

          <div className="scanner-container" id="qr-scanner" ref={htmlScannerRef}></div>

          {scannedData && (
            <div className="scanned-data">
              <h4>QR Data Captured</h4>
              <div className="data-display">
                <p>
                  <strong>Class:</strong> {scannedData.className || scannedData.classId}
                </p>
                <p>
                  <strong>Division:</strong> {scannedData.division}
                </p>
                <p>
                  <strong>Department:</strong> {scannedData.department}
                </p>
                <p>
                  <strong>Year:</strong> {scannedData.year}
                </p>
                <p>
                  <strong>Radius:</strong> {scannedData.radius}m
                </p>
              </div>

              {studentLocation && (
                <div className="location-info">
                  <h4>Your Location</h4>
                  <p>
                    <strong>Latitude:</strong> {studentLocation.latitude.toFixed(6)}
                  </p>
                  <p>
                    <strong>Longitude:</strong> {studentLocation.longitude.toFixed(6)}
                  </p>
                  <p>
                    <strong>Accuracy:</strong> ±{Math.round(studentLocation.accuracy)}m
                  </p>
                </div>
              )}

              {locationError && <div className="error-message location-error">{locationError}</div>}

              <div className="face-scan-panel">
                <h4>Face Verification</h4>
                {faceVerificationMessage && <div className="success-message">{faceVerificationMessage}</div>}
                {isFaceVerified ? (
                  <p className="login-hint">
                    Verified {faceScore !== null ? `(score: ${Number(faceScore).toFixed(2)})` : ''}
                  </p>
                ) : (
                  <p className="login-hint">Face scan is required before attendance marking.</p>
                )}

                {!isFaceScannerOpen && (
                  <button
                    onClick={startFaceScanner}
                    disabled={loading || isVerifyingFace}
                    className="btn-secondary"
                  >
                    {isFaceVerified ? 'Re-scan Face' : 'Face Scan'}
                  </button>
                )}

                {isFaceScannerOpen && (
                  <div className="face-camera-wrap">
                    <video ref={faceVideoRef} autoPlay playsInline muted className="face-video" />
                    <canvas ref={faceCanvasRef} style={{ display: 'none' }} />
                    {isOpeningFaceCamera && <p className="login-hint">Opening front camera...</p>}
                    <div className="inline-actions">
                      <button
                        onClick={captureAndVerifyFace}
                        disabled={isVerifyingFace || isOpeningFaceCamera}
                        className="btn-primary"
                      >
                        {isVerifyingFace ? 'Verifying...' : 'Capture & Verify'}
                      </button>
                      <button onClick={stopFaceScanner} className="btn-secondary">
                        Cancel
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <button
                onClick={handleMarkAttendance}
                disabled={loading || !studentLocation || !isFaceVerified}
                className="btn-primary"
              >
                {loading ? 'Marking attendance...' : 'Mark Attendance'}
              </button>

              <button
                onClick={() => {
                  setScannedData(null)
                  setStudentLocation(null)
                  setLocationError('')
                  setIsFaceVerified(false)
                  setFaceScore(null)
                  setFaceVerificationMessage('')
                  stopFaceScanner()
                  setTimeout(() => {
                    startQrScanner()
                  }, 100)
                }}
                className="btn-secondary"
              >
                Clear
              </button>
            </div>
          )}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="history-section">
          <h3>Your Attendance History</h3>

          {historyLoading ? (
            <p>Loading attendance history...</p>
          ) : attendanceHistory.length === 0 ? (
            <p>No attendance records found.</p>
          ) : (
            <div className="history-table">
              <table>
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Class</th>
                    <th>Subject</th>
                    <th>Time Slot</th>
                    <th>Distance</th>
                    <th>Marked At</th>
                  </tr>
                </thead>
                <tbody>
                  {attendanceHistory.map((record) => (
                    <tr key={record.id}>
                      <td>
                        {new Date(record.date).toLocaleDateString()}
                      </td>
                      <td>{record.class_id}</td>
                      <td>{record.subject || 'N/A'}</td>
                      <td>{record.time_slot}</td>
                      <td>{record.distance}m</td>
                      <td>
                        {new Date(record.markedAt).toLocaleTimeString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <style>{`
        .attendance-qr-scanner {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .tabs {
          display: flex;
          gap: 10px;
          margin-bottom: 20px;
          border-bottom: 2px solid #eee;
        }

        .tab-btn {
          padding: 10px 20px;
          border: none;
          background: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 500;
          color: #666;
          border-bottom: 3px solid transparent;
          transition: all 0.3s ease;
        }

        .tab-btn.active {
          color: #007bff;
          border-bottom-color: #007bff;
        }

        .tab-btn:hover {
          color: #0056b3;
        }

        .scan-section,
        .history-section {
          margin-top: 20px;
        }

        .scan-section h3,
        .history-section h3 {
          margin-top: 0;
          color: #333;
        }

        .scanner-container {
          max-width: 500px;
          margin: 20px auto;
          border: 2px solid #ddd;
          border-radius: 8px;
          overflow: hidden;
        }

        .scanned-data {
          background: #f9f9f9;
          padding: 20px;
          border-radius: 8px;
          margin-top: 20px;
        }

        .scanned-data h4 {
          margin-top: 0;
          color: #333;
        }

        .data-display {
          background: white;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
        }

        .data-display p {
          margin: 8px 0;
          font-size: 14px;
        }

        .location-info {
          background: white;
          padding: 15px;
          border-radius: 4px;
          margin-bottom: 15px;
          border: 1px solid #ddd;
        }

        .location-info h4 {
          margin-top: 0;
          color: #333;
          font-size: 14px;
        }

        .location-info p {
          margin: 6px 0;
          font-size: 13px;
        }

        .location-error {
          margin: 15px 0;
        }

        .face-scan-panel {
          background: #fff;
          border: 1px solid #ddd;
          border-radius: 8px;
          padding: 12px;
          margin-bottom: 15px;
        }

        .face-camera-wrap {
          margin-top: 10px;
        }

        .face-video {
          width: 100%;
          max-width: 320px;
          border-radius: 8px;
          border: 1px solid #ccc;
          display: block;
          margin-bottom: 10px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
          margin-right: 10px;
        }

        .btn-primary {
          background: #28a745;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #218838;
        }

        .btn-secondary {
          background: #6c757d;
          color: white;
        }

        .btn-secondary:hover:not(:disabled) {
          background: #545b62;
        }

        button:disabled {
          opacity: 0.6;
          cursor: not-allowed;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #f5c6cb;
          margin-bottom: 15px;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 4px;
          border: 1px solid #c3e6cb;
          margin-bottom: 15px;
        }

        .history-table {
          overflow-x: auto;
          margin-top: 20px;
        }

        .history-table table {
          width: 100%;
          border-collapse: collapse;
          font-size: 14px;
        }

        .history-table th {
          background: #f5f5f5;
          padding: 12px;
          text-align: left;
          font-weight: 600;
          border-bottom: 2px solid #ddd;
          color: #333;
        }

        .history-table td {
          padding: 12px;
          border-bottom: 1px solid #eee;
        }

        .history-table tr:hover {
          background: #f9f9f9;
        }
      `}</style>
    </div>
  )
}

export default AttendanceQRScanner
