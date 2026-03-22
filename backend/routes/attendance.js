import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';
import { db } from '../config/firebaseAdmin.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const uploadsRoot = path.resolve(__dirname, '../uploads/attendance-proof');
const pythonApiBaseUrl = (process.env.PYTHON_ATTENDANCE_API_URL || 'http://127.0.0.1:8000').replace(/\/$/, '');
const pythonApiFallbackUrls = Array.from(
  new Set([
    pythonApiBaseUrl,
    ...(pythonApiBaseUrl === 'http://127.0.0.1:8000' ? ['http://127.0.0.1:8001'] : []),
  ]),
);

const normalizeText = (value) => String(value || '').trim();
const normalizeKey = (value) => normalizeText(value).toLowerCase();

const getDepartmentCandidates = (value) => {
  const key = normalizeKey(value).replace(/[^a-z0-9]/g, '');
  if (!key) {
    return new Set();
  }

  const aliases = {
    cse: ['cse', 'computerengineering', 'computerscienceengineering', 'computer'],
    it: ['it', 'informationtechnology'],
    aids: ['aids', 'ai&ds', 'aiandds', 'artificialintelligenceanddatascience', 'artificialintelligencedatascience'],
    entc: ['entc', 'electronicsandtelecommunication', 'electronicscommunication'],
    mechanical: ['mechanical', 'mech'],
    civil: ['civil'],
    electrical: ['electrical', 'eee'],
  };

  const matchedCanonical = Object.entries(aliases).find(([, values]) => values.includes(key));
  if (matchedCanonical) {
    return new Set(aliases[matchedCanonical[0]]);
  }

  return new Set([key]);
};

const normalizeDivisionKey = (value) => {
  const text = normalizeText(value);
  if (!text) {
    return '';
  }

  const upper = text.toUpperCase();
  const singleLetterMatch = upper.match(/(?:^|[^A-Z])([A-D])(?:$|[^A-Z])/);
  if (singleLetterMatch?.[1]) {
    return singleLetterMatch[1].toLowerCase();
  }

  const tailLetterMatch = upper.match(/[-_\s]([A-D])$/);
  if (tailLetterMatch?.[1]) {
    return tailLetterMatch[1].toLowerCase();
  }

  return normalizeKey(text).replace(/[^a-z0-9]/g, '');
};

const parseDateFromRecord = (record = {}) => {
  const raw = record.date || record.attendance_date || record.createdAt || record.markedAt;

  if (!raw) {
    return '';
  }

  if (typeof raw === 'string') {
    return raw;
  }

  if (raw?.toDate) {
    return raw.toDate().toISOString();
  }

  if (raw instanceof Date) {
    return raw.toISOString();
  }

  return String(raw);
};

const parseBase64Image = (imagePayload) => {
  const raw = normalizeText(imagePayload);
  const dataUrlMatch = raw.match(/^data:(image\/[a-zA-Z0-9.+-]+);base64,(.+)$/);

  if (dataUrlMatch) {
    const mimeType = dataUrlMatch[1].toLowerCase();
    const base64Body = dataUrlMatch[2];
    const extension = mimeType.includes('png') ? 'png' : mimeType.includes('webp') ? 'webp' : 'jpg';
    return {
      mimeType,
      extension,
      buffer: Buffer.from(base64Body, 'base64'),
      payloadForPython: raw,
    };
  }

  const stripped = raw.replace(/\s/g, '');
  if (!stripped) {
    throw new Error('Class photo payload is empty.');
  }

  return {
    mimeType: 'image/jpeg',
    extension: 'jpg',
    buffer: Buffer.from(stripped, 'base64'),
    payloadForPython: `data:image/jpeg;base64,${stripped}`,
  };
};

const parseEncoding = (value) => {
  if (!value) {
    return null;
  }

  if (Array.isArray(value)) {
    return value.map((item) => Number(item)).filter((item) => Number.isFinite(item));
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (Array.isArray(parsed)) {
        return parsed.map((item) => Number(item)).filter((item) => Number.isFinite(item));
      }
    } catch {
      return null;
    }
  }

  return null;
};

const requireFacultyOrAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found',
      });
    }

    const role = userDoc.data().role;
    if (role !== 'faculty' && role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Faculty access required',
      });
    }

    req.userRole = role;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to validate faculty access',
      error: error.message,
    });
  }
};

router.post(['/ai-photo-mark', '/ai-photo'], verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    const department = normalizeText(req.body.department);
    const division = normalizeText(req.body.division);
    const subject = normalizeText(req.body.subject) || 'General';
    const classPhotoBase64 = req.body.classPhotoBase64;

    if (!department || !division || !classPhotoBase64) {
      return res.status(400).json({
        success: false,
        message: 'department, division, and classPhotoBase64 are required.',
      });
    }

    const imageData = parseBase64Image(classPhotoBase64);

    if (!imageData.buffer || imageData.buffer.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Uploaded class photo is empty or invalid.',
      });
    }

    await fs.mkdir(uploadsRoot, { recursive: true });

    const fileName = `class_${Date.now()}_${Math.random().toString(36).slice(2, 10)}.${imageData.extension}`;
    const filePath = path.join(uploadsRoot, fileName);
    await fs.writeFile(filePath, imageData.buffer);

    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    const selectedDepartmentCandidates = getDepartmentCandidates(department);
    const selectedDivision = normalizeDivisionKey(division);

    const students = (usersSnapshot?.docs || [])
      .map((item) => ({ id: item.id, ...item.data() }))
      .filter((student) => {
        const studentDepartmentCandidates = getDepartmentCandidates(student.department || student.dept || student.branch);
        const studentDivision = normalizeDivisionKey(
          student.class_id || student.classId || student.division || student.div || student.class_name || student.className,
        );

        const departmentMatches = [...studentDepartmentCandidates].some((item) => selectedDepartmentCandidates.has(item));
        const divisionMatches = studentDivision === selectedDivision;

        return departmentMatches && divisionMatches;
      });

    if (!students.length) {
      return res.status(404).json({
        success: false,
        message: 'No students found for the selected department/division.',
      });
    }

    const faceEncodingSnapshot = await db.collection('face_encodings').get();
    const encodingByStudentId = new Map();

    for (const docSnapshot of (faceEncodingSnapshot?.docs || [])) {
      const row = docSnapshot.data() || {};
      const studentId = normalizeText(row.student_id || row.studentId || row.uid || docSnapshot.id);
      if (!studentId) {
        continue;
      }

      const parsed = parseEncoding(row.encoding);
      if (parsed && parsed.length > 0) {
        encodingByStudentId.set(studentId, parsed);
      }
    }

    const knownFaces = students
      .map((student) => {
        const studentId = normalizeText(student.uid || student.id);
        const encoding = encodingByStudentId.get(studentId);
        const selfieUrl = normalizeText(
          student.selfieUrl ||
          student.selfie_url ||
          student.profilePhotoUrl ||
          student.profile_photo_url ||
          student.photoUrl,
        );

        if (encoding) {
          return {
            student_id: studentId,
            encoding,
          };
        }

        if (!selfieUrl) {
          return null;
        }

        return {
          student_id: studentId,
          image_url: selfieUrl,
        };
      })
      .filter(Boolean);

    if (!knownFaces.length) {
      return res.status(400).json({
        success: false,
        message: 'No student encodings or selfie profile photos found for this class.',
      });
    }

    let pythonResponse;
    try {
      let lastErrorMessage = '';

      for (const apiBase of pythonApiFallbackUrls) {
        try {
          const providerResponse = await fetch(`${apiBase}/match-faces`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              image_base64: imageData.payloadForPython,
              known_faces: knownFaces,
              tolerance: Number(process.env.FACE_MATCH_TOLERANCE || 0.48),
            }),
          });

          pythonResponse = await providerResponse.json();

          if (!providerResponse.ok || pythonResponse?.success === false) {
            throw new Error(pythonResponse?.message || `Python service responded with ${providerResponse.status}`);
          }

          lastErrorMessage = '';
          break;
        } catch (innerError) {
          lastErrorMessage = innerError.message;
        }
      }

      if (!pythonResponse) {
        throw new Error(lastErrorMessage || 'Unable to reach Python face-matching service.');
      }
    } catch (error) {
      return res.status(502).json({
        success: false,
        message: 'Failed to process class photo with AI service.',
        error: error.message,
      });
    }

    const knownStudentIdSet = new Set(knownFaces.map((item) => item.student_id));
    const matchedStudentIds = Array.from(
      new Set((pythonResponse?.matched_student_ids || []).map((item) => normalizeText(item)).filter((item) => knownStudentIdSet.has(item))),
    );

    const attendanceDate = new Date().toISOString().slice(0, 10);
    const nowIso = new Date().toISOString();
    const studentById = new Map(students.map((student) => [normalizeText(student.uid || student.id), student]));

    const writePromises = matchedStudentIds.map((studentId) => {
      const attendanceId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 9)}_${studentId.slice(0, 6)}`;
      return db.collection('attendance').doc(attendanceId).set({
        student_id: studentId,
        userId: studentId,
        department,
        division,
        subject,
        date: attendanceDate,
        status: 'present',
        source: 'ai-class-photo',
        createdAt: nowIso,
        markedBy: req.user.uid,
      });
    });

    await Promise.all(writePromises);

    const imageUrl = `${req.protocol}://${req.get('host')}/uploads/attendance-proof/${fileName}`;
    const proofId = `proof_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;

    await db.collection('attendance_proof').doc(proofId).set({
      image_url: imageUrl,
      date: attendanceDate,
      department,
      division,
      subject,
      uploadedBy: req.user.uid,
      total_detected_faces: Number(pythonResponse?.total_detected_faces || 0),
      total_present_marked: matchedStudentIds.length,
      createdAt: nowIso,
    });

    const presentStudents = matchedStudentIds.map((studentId) => {
      const student = studentById.get(studentId) || {};
      return {
        student_id: studentId,
        name: student.name || 'Unknown',
        email: student.email || '',
        enrollmentNumber: student.enrollmentNumber || student.enrollment_number || '',
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance processed successfully using class photo.',
      data: {
        date: attendanceDate,
        department,
        division,
        subject,
        classPhotoUrl: imageUrl,
        proofId,
        totalDetectedFaces: Number(pythonResponse?.total_detected_faces || 0),
        totalMatchedFaces: Number(pythonResponse?.total_matched_faces || matchedStudentIds.length),
        totalPresent: matchedStudentIds.length,
        presentStudents,
      },
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to mark attendance from class photo.',
      error: error.message,
    });
  }
});

router.get('/user/:userId', verifyToken, async (req, res) => {
  try {
    const requesterUid = normalizeText(req.user?.uid);
    const userId = normalizeText(req.params.userId);

    const requesterDoc = await db.collection('users').doc(requesterUid).get();
    const requesterRole = requesterDoc.exists ? requesterDoc.data().role : '';

    if (requesterRole !== 'admin' && requesterUid !== userId) {
      return res.status(403).json({
        success: false,
        message: 'You are not allowed to access this attendance.',
      });
    }

    const [byStudentIdSnapshot, byLegacyUserIdSnapshot] = await Promise.all([
      db.collection('attendance').where('student_id', '==', userId).get(),
      db.collection('attendance').where('userId', '==', userId).get(),
    ]);

    const recordMap = new Map();

    for (const snapshot of [byStudentIdSnapshot, byLegacyUserIdSnapshot]) {
      for (const docSnapshot of snapshot?.docs || []) {
        if (!recordMap.has(docSnapshot.id)) {
          recordMap.set(docSnapshot.id, {
            id: docSnapshot.id,
            ...docSnapshot.data(),
          });
        }
      }
    }

    const records = Array.from(recordMap.values()).sort((a, b) => {
      const aDate = Date.parse(parseDateFromRecord(a)) || 0;
      const bDate = Date.parse(parseDateFromRecord(b)) || 0;
      return bDate - aDate;
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: records,
      total: records.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance',
      error: error.message,
    });
  }
});

router.get('/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const attendanceSnapshot = await db.collection('attendance').get();
    const records = (attendanceSnapshot?.docs || []).map((docSnapshot) => ({
      id: docSnapshot.id,
      ...docSnapshot.data(),
    }));

    records.sort((a, b) => {
      const aDate = Date.parse(parseDateFromRecord(a)) || 0;
      const bDate = Date.parse(parseDateFromRecord(b)) || 0;
      return bDate - aDate;
    });

    return res.status(200).json({
      success: true,
      message: 'All attendance records retrieved',
      data: records,
      total: records.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records',
      error: error.message,
    });
  }
});

router.get('/summary', verifyToken, requireAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    const attendanceSnapshot = await db.collection('attendance').get();

    const attendanceByStudent = new Map();

    for (const docSnapshot of attendanceSnapshot?.docs || []) {
      const row = docSnapshot.data() || {};
      const studentId = normalizeText(row.student_id || row.userId);
      if (!studentId) {
        continue;
      }

      const existing = attendanceByStudent.get(studentId) || [];
      existing.push(row);
      attendanceByStudent.set(studentId, existing);
    }

    const summary = (usersSnapshot?.docs || []).map((userDoc) => {
      const userData = userDoc.data() || {};
      const studentId = normalizeText(userData.uid || userDoc.id);
      const rows = attendanceByStudent.get(studentId) || [];

      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      rows.forEach((row) => {
        const status = normalizeKey(row.status);
        if (status === 'present') presentCount += 1;
        if (status === 'absent') absentCount += 1;
        if (status === 'leave') leaveCount += 1;
      });

      const totalRecords = rows.length;
      const attendancePercentage = totalRecords > 0
        ? Number(((presentCount / totalRecords) * 100).toFixed(2))
        : 0;

      return {
        uid: studentId,
        name: userData.name || '',
        email: userData.email || '',
        enrollmentNumber: userData.enrollmentNumber || userData.enrollment_number || '',
        department: userData.department || '',
        division: userData.class_id || userData.classId || userData.division || '',
        totalRecords,
        presentCount,
        absentCount,
        leaveCount,
        attendancePercentage,
      };
    });

    return res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved',
      data: summary,
      total: summary.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance summary',
      error: error.message,
    });
  }
});

export default router;
