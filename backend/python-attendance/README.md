# AI Attendance Python Service

This service detects and matches student faces from one class photo.

## Important compatibility note

For Windows, use Python 3.10 or 3.11 for this service.
Python 3.12 often fails while building dlib for face_recognition.

## Run locally

```bash
cd backend/python-attendance
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn attendance_service:app --host 0.0.0.0 --port 8000 --reload
```

## Windows setup (required once)

If installation fails at dlib, install these first:

1. CMake from https://cmake.org/download/ and enable Add CMake to PATH during install.
2. Visual Studio Build Tools with Desktop development with C++ workload.
3. Python 3.11 (recommended) and ensure Python is in PATH.

Then create the venv with Python 3.11 explicitly:

```powershell
cd backend/python-attendance
py -3.11 -m venv .venv
.venv\Scripts\Activate.ps1
python -m pip install --upgrade pip
python -m pip install -r requirements.txt
python -m uvicorn attendance_service:app --host 0.0.0.0 --port 8000 --reload
```

## Why uvicorn was not recognized

Your package install stopped at dlib, so uvicorn was never installed in the environment.
Also, running python -m uvicorn is more reliable than calling uvicorn directly.

## Endpoint

- `POST /match-faces`
  - Request:
    - `image_base64`: class image data URL or base64 string
    - `known_faces`: list of `{ student_id, encoding }`
    - `tolerance`: optional match threshold (default `0.48`)
  - Response:
    - `matched_student_ids`
    - `total_detected_faces`
    - `total_matched_faces`

Set backend env variable `PYTHON_ATTENDANCE_API_URL` if this service runs on a different host/port.
