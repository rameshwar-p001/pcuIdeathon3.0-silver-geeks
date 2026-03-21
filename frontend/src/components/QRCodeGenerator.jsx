import { useState } from 'react'
import QRCode from 'qrcode'
import { apiRequest } from '../lib/api'

function QRCodeGenerator({ classes, user }) {
  const [selectedClass, setSelectedClass] = useState('')
  const [latitude, setLatitude] = useState('')
  const [longitude, setLongitude] = useState('')
  const [radius, setRadius] = useState(50)
  const [qrCanvas, setQrCanvas] = useState(null)
  const [errorMessage, setErrorMessage] = useState('')
  const [successMessage, setSuccessMessage] = useState('')
  const [loading, setLoading] = useState(false)

  const getLocationFromBrowser = async () => {
    setErrorMessage('')
    setLoading(true)

    if (!navigator.geolocation) {
      setErrorMessage('Geolocation is not supported by your browser.')
      setLoading(false)
      return
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLatitude(String(position.coords.latitude))
        setLongitude(String(position.coords.longitude))
        setSuccessMessage(
          `Location set: ${position.coords.latitude.toFixed(4)}, ${position.coords.longitude.toFixed(4)}`
        )
        setLoading(false)
      },
      (error) => {
        setErrorMessage(
          `Unable to get location: ${error.message}. Please enter coordinates manually.`
        )
        setLoading(false)
      }
    )
  }

  const generateQRCode = async (event) => {
    event.preventDefault()
    setErrorMessage('')
    setSuccessMessage('')

    if (!selectedClass || !latitude || !longitude) {
      setErrorMessage('Please select a class and enter coordinates.')
      return
    }

    setLoading(true)

    try {
      const response = await apiRequest('/api/faculty/qr-code', {
        method: 'POST',
        body: JSON.stringify({
          classId: selectedClass,
          latitude: parseFloat(latitude),
          longitude: parseFloat(longitude),
          radius: parseInt(radius),
        }),
      })

      const { encodedData } = response.data

      // Generate QR code
      const canvas = document.createElement('canvas')
      await QRCode.toCanvas(canvas, encodedData, {
        errorCorrectionLevel: 'H',
        type: 'image/png',
        quality: 0.95,
        margin: 1,
        width: 400,
      })

      setQrCanvas(canvas.toDataURL('image/png'))
      setSuccessMessage('QR Code generated successfully! Students can now scan it.')
    } catch (error) {
      setErrorMessage(error?.message || 'Failed to generate QR code.')
    } finally {
      setLoading(false)
    }
  }

  const downloadQRCode = () => {
    if (!qrCanvas) {
      setErrorMessage('No QR code to download.')
      return
    }

    const link = document.createElement('a')
    link.href = qrCanvas
    link.download = `attendance-qr-${selectedClass}-${Date.now()}.png`
    link.click()
  }

  const selectedClassData = classes.find((c) => c.id === selectedClass)

  return (
    <div className="qr-code-generator">
      <h3>Generate Attendance QR Code</h3>

      {errorMessage && <div className="error-message">{errorMessage}</div>}
      {successMessage && <div className="success-message">{successMessage}</div>}

      <form onSubmit={generateQRCode} className="qr-form">
        <div className="form-group">
          <label>Select Class *</label>
          <select
            value={selectedClass}
            onChange={(e) => {
              setSelectedClass(e.target.value)
              setQrCanvas(null)
            }}
            disabled={loading}
          >
            <option value="">-- Choose a class --</option>
            {classes.map((classItem) => (
              <option key={classItem.id} value={classItem.id}>
                {classItem.class_name || classItem.id}
              </option>
            ))}
          </select>
        </div>

        {selectedClassData && (
          <div className="class-info">
            <p>
              <strong>Division:</strong> {selectedClassData.division || selectedClassData.div || 'N/A'}
            </p>
            <p>
              <strong>Department:</strong> {selectedClassData.department || 'N/A'}
            </p>
            <p>
              <strong>Year:</strong> {selectedClassData.year || 'N/A'}
            </p>
          </div>
        )}

        <div className="location-inputs">
          <div className="form-group">
            <label>Latitude *</label>
            <input
              type="number"
              step="0.000001"
              value={latitude}
              onChange={(e) => setLatitude(e.target.value)}
              placeholder="e.g., 40.7128"
              disabled={loading}
            />
          </div>

          <div className="form-group">
            <label>Longitude *</label>
            <input
              type="number"
              step="0.000001"
              value={longitude}
              onChange={(e) => setLongitude(e.target.value)}
              placeholder="e.g., -74.0060"
              disabled={loading}
            />
          </div>

          <button
            type="button"
            onClick={getLocationFromBrowser}
            disabled={loading}
            className="btn-secondary"
          >
            {loading ? 'Getting location...' : 'Use Current Location'}
          </button>
        </div>

        <div className="form-group">
          <label>Radius (meters)</label>
          <input
            type="number"
            min="10"
            max="500"
            value={radius}
            onChange={(e) => setRadius(e.target.value)}
            disabled={loading}
          />
          <small>Students must be within this distance to mark attendance (default: 50m)</small>
        </div>

        <button type="submit" disabled={loading} className="btn-primary">
          {loading ? 'Generating...' : 'Generate QR Code'}
        </button>
      </form>

      {qrCanvas && (
        <div className="qr-display">
          <h4>QR Code</h4>
          <img src={qrCanvas} alt="QR Code" />
          <div className="qr-actions">
            <button onClick={downloadQRCode} className="btn-secondary">
              Download QR Code
            </button>
          </div>
          <div className="qr-info">
            <p>
              <strong>Class:</strong> {selectedClassData?.class_name || selectedClass}
            </p>
            <p>
              <strong>Location:</strong> ({latitude}, {longitude})
            </p>
            <p>
              <strong>Radius:</strong> {radius}m
            </p>
          </div>
        </div>
      )}

      <style>{`
        .qr-code-generator {
          background: white;
          padding: 20px;
          border-radius: 8px;
          margin: 20px 0;
        }

        .qr-code-generator h3 {
          margin-top: 0;
          color: #333;
        }

        .qr-form {
          display: flex;
          flex-direction: column;
          gap: 15px;
        }

        .form-group {
          display: flex;
          flex-direction: column;
        }

        .form-group label {
          font-weight: 500;
          margin-bottom: 5px;
          color: #555;
        }

        .form-group input,
        .form-group select {
          padding: 8px 12px;
          border: 1px solid #ddd;
          border-radius: 4px;
          font-size: 14px;
        }

        .form-group small {
          color: #888;
          margin-top: 3px;
          font-size: 12px;
        }

        .location-inputs {
          display: grid;
          grid-template-columns: 1fr 1fr 1fr;
          gap: 10px;
          align-items: flex-end;
        }

        .location-inputs .form-group {
          margin: 0;
        }

        .location-inputs button {
          padding: 8px 12px;
          white-space: nowrap;
        }

        .class-info {
          background: #f5f5f5;
          padding: 10px;
          border-radius: 4px;
          margin: 10px 0;
        }

        .class-info p {
          margin: 5px 0;
          font-size: 14px;
        }

        .btn-primary,
        .btn-secondary {
          padding: 10px 16px;
          border: none;
          border-radius: 4px;
          cursor: pointer;
          font-size: 14px;
          font-weight: 500;
        }

        .btn-primary {
          background: #007bff;
          color: white;
        }

        .btn-primary:hover:not(:disabled) {
          background: #0056b3;
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

        .qr-display {
          margin-top: 30px;
          padding: 20px;
          background: #f9f9f9;
          border-radius: 8px;
          text-align: center;
        }

        .qr-display h4 {
          margin-top: 0;
          color: #333;
        }

        .qr-display img {
          max-width: 400px;
          border: 2px solid #ddd;
          padding: 10px;
          background: white;
          border-radius: 4px;
        }

        .qr-actions {
          margin: 15px 0;
          display: flex;
          justify-content: center;
          gap: 10px;
        }

        .qr-info {
          text-align: left;
          background: white;
          padding: 15px;
          border-radius: 4px;
          margin-top: 15px;
          border: 1px solid #ddd;
        }

        .qr-info p {
          margin: 8px 0;
          font-size: 14px;
        }

        .error-message {
          background: #f8d7da;
          color: #721c24;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          border: 1px solid #f5c6cb;
        }

        .success-message {
          background: #d4edda;
          color: #155724;
          padding: 12px;
          border-radius: 4px;
          margin-bottom: 15px;
          border: 1px solid #c3e6cb;
        }
      `}</style>
    </div>
  )
}

export default QRCodeGenerator
