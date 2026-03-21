import express from 'express';
import { db } from '../config/firebaseAdmin.js';
import { verifyToken, requireAdmin, attachUserRole } from '../middleware/auth.js';

const router = express.Router();

// Get attendance by user - Admin only
router.get('/user/:userId', verifyToken, requireAdmin, async (req, res) => {
  try {
    const attendanceSnapshot = await db
      .collection('attendance')
      .where('userId', '==', req.params.userId)
      .orderBy('date', 'desc')
      .get();

    const records = [];
    attendanceSnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });


















    
    return res.status(200).json({
      success: true,
      message: 'Attendance records retrieved successfully',
      data: records,
      total: records.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance',
      error: error.message
    });
  }
});

// Get all attendance records - Admin only
router.get('/all', verifyToken, requireAdmin, async (req, res) => {
  try {
    const attendanceSnapshot = await db
      .collection('attendance')
      .orderBy('date', 'desc')
      .limit(1000)
      .get();

    const records = [];
    attendanceSnapshot.forEach((doc) => {
      records.push({
        id: doc.id,
        ...doc.data()
      });
    });

    return res.status(200).json({
      success: true,
      message: 'All attendance records retrieved',
      data: records,
      total: records.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance records',
      error: error.message
    });
  }
});

// Get attendance summary for all students - Admin only
router.get('/summary', verifyToken, requireAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
    const summary = [];

    for (const userDoc of usersSnapshot.docs) {
      const userData = userDoc.data();
      const attendanceSnapshot = await db
        .collection('attendance')
        .where('userId', '==', userData.uid)
        .get();

      const records = [];
      let presentCount = 0;
      let absentCount = 0;
      let leaveCount = 0;

      attendanceSnapshot.forEach((doc) => {
        const record = doc.data();
        records.push(record);
        if (record.status === 'present') presentCount++;
        if (record.status === 'absent') absentCount++;
        if (record.status === 'leave') leaveCount++;
      });

      const totalCount = presentCount + absentCount + leaveCount;
      const percentage = totalCount > 0 ? ((presentCount / totalCount) * 100).toFixed(2) : 0;

      summary.push({
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        enrollmentNumber: userData.enrollmentNumber,
        department: userData.department,
        totalRecords: totalCount,
        presentCount: presentCount,
        absentCount: absentCount,
        leaveCount: leaveCount,
        attendancePercentage: parseFloat(percentage)
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Attendance summary retrieved',
      data: summary,
      total: summary.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance summary',
      error: error.message
    });
  }
});

const calculateDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371000; // Earth's radius in meters
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  const distance = R * c;

  return distance;
};

const normalizeDay = (value) => {
  const text = String(value || '').trim().toLowerCase();
  const dayMap = {
    mon: 'Mon', monday: 'Mon',
    tue: 'Tue', tues: 'Tue', tuesday: 'Tue',
    wed: 'Wed', wednesday: 'Wed',
    thu: 'Thu', thur: 'Thu', thurs: 'Thu', thursday: 'Thu',
    fri: 'Fri', friday: 'Fri',
    sat: 'Sat', saturday: 'Sat',
    sun: 'Sun', sunday: 'Sun',
  };
  return dayMap[text] || '';
};

const parseClockToMinutes = (clockValue) => {
  const raw = String(clockValue || '').trim();
  if (!raw) return null;

  const amPmMatch = raw.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (amPmMatch) {
    let hour = Number(amPmMatch[1]);
    const minute = Number(amPmMatch[2]);
    const period = amPmMatch[3].toUpperCase();
    if (Number.isNaN(hour) || Number.isNaN(minute) || minute < 0 || minute > 59) {
      return null;
    }
    if (period === 'PM' && hour !== 12) hour += 12;
    if (period === 'AM' && hour === 12) hour = 0;
    return (hour * 60) + minute;
  }

  const hhmmMatch = raw.match(/^(\d{1,2}):(\d{2})$/);
  if (hhmmMatch) {
    const hour = Number(hhmmMatch[1]);
    const minute = Number(hhmmMatch[2]);
    if (Number.isNaN(hour) || Number.isNaN(minute) || hour < 0 || hour > 23 || minute < 0 || minute > 59) {
      return null;
    }
    return (hour * 60) + minute;
  }

  return null;
};

const getCurrentTimeSlot = (timetableEntries = [], options = {}) => {
  const graceMinutes = Number.isFinite(Number(options.graceMinutes)) ? Number(options.graceMinutes) : 15;
  const now = new Date();
  const currentMinutes = (now.getHours() * 60) + now.getMinutes();
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const currentDay = dayNames[now.getDay()];

  const todaySlots = [];

  for (const entry of timetableEntries) {
    const normalizedEntryDay = normalizeDay(entry.day);
    const [startText, endText] = String(entry.time_slot || '').split('-').map((part) => part.trim());
    const startMinutes = parseClockToMinutes(startText);
    const endMinutes = parseClockToMinutes(endText);

    if (normalizedEntryDay !== currentDay || startMinutes === null || endMinutes === null) {
      continue;
    }

    todaySlots.push({
      day: normalizedEntryDay,
      time_slot: entry.time_slot,
      subject: entry.subject,
      startMinutes,
      endMinutes,
    });

    if (
      currentMinutes >= (startMinutes - graceMinutes) &&
      currentMinutes < (endMinutes + graceMinutes)
    ) {
      return {
        day: normalizedEntryDay,
        time_slot: entry.time_slot,
        subject: entry.subject,
      };
    }
  }

  // If not currently within any slot window, allow the nearest slot start within grace.
  const nearestStart = todaySlots
    .map((slot) => ({ ...slot, delta: Math.abs(currentMinutes - slot.startMinutes) }))
    .sort((a, b) => a.delta - b.delta)[0];

  if (nearestStart && nearestStart.delta <= graceMinutes) {
    return {
      day: nearestStart.day,
      time_slot: nearestStart.time_slot,
      subject: nearestStart.subject,
    };
  }

  return null;
};

const toLocalClock = (dateValue) => {
  const date = dateValue instanceof Date ? dateValue : new Date(dateValue);
  const hh = String(date.getHours()).padStart(2, '0');
  const mm = String(date.getMinutes()).padStart(2, '0');
  return `${hh}:${mm}`;
};

router.post('/qr-mark', verifyToken, async (req, res) => {
  try {
    const { qrData, studentLatitude, studentLongitude, studentAccuracy } = req.body;

    if (!qrData || studentLatitude === undefined || studentLongitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'qrData, studentLatitude, and studentLongitude are required'
      });
    }

    // Get student info
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    if (userData.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Student access required'
      });
    }

    const { classId, className, classDocId, classRefs, division, department, year, latitude, longitude, radius, generatedAt } = qrData;

    if (!classId || latitude === undefined || longitude === undefined) {
      return res.status(400).json({
        success: false,
        message: 'Invalid QR payload'
      });
    }

    const generatedAtDate = new Date(generatedAt || 0);
    if (Number.isNaN(generatedAtDate.getTime()) || Date.now() - generatedAtDate.getTime() > 10 * 60 * 1000) {
      return res.status(400).json({
        success: false,
        message: 'QR code expired. Please ask class teacher to generate a new one.'
      });
    }

    let classData = null;
    let resolvedClassId = classId;

    const normalizeClassKey = (value) => String(value || '')
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '');

    const candidateValues = Array.from(new Set([
      classDocId,
      classId,
      className,
      ...(Array.isArray(classRefs) ? classRefs : []),
    ].filter(Boolean)));

    for (const candidate of candidateValues) {
      const classDoc = await db.collection('classes').doc(candidate).get();
      if (classDoc.exists) {
        classData = classDoc.data();
        resolvedClassId = classDoc.id;
        break;
      }
    }

    if (!classData && candidateValues.length > 0) {
      for (const candidate of candidateValues) {
        const byClassIdField = await db.collection('classes').where('class_id', '==', candidate).get();
        if (byClassIdField?.docs?.length > 0) {
          classData = byClassIdField.docs[0].data();
          resolvedClassId = byClassIdField.docs[0].id;
          break;
        }
      }
    }

    if (!classData && candidateValues.length > 0) {
      for (const candidate of candidateValues) {
        const byClassNameField = await db.collection('classes').where('class_name', '==', candidate).get();
        if (byClassNameField?.docs?.length > 0) {
          classData = byClassNameField.docs[0].data();
          resolvedClassId = byClassNameField.docs[0].id;
          break;
        }
      }
    }

    // Final fallback: tolerant compare across id/class_id/class_name/className variants.
    if (!classData) {
      const normalizedCandidates = new Set(candidateValues.map((item) => normalizeClassKey(item)).filter(Boolean));
      const allClassesSnapshot = await db.collection('classes').get();
      for (const docSnapshot of allClassesSnapshot.docs || []) {
        const row = docSnapshot.data();
        const rowKeys = [
          docSnapshot.id,
          row.class_id,
          row.class_name,
          row.className,
        ].map((item) => normalizeClassKey(item)).filter(Boolean);

        if (rowKeys.some((key) => normalizedCandidates.has(key))) {
          classData = row;
          resolvedClassId = docSnapshot.id;
          break;
        }
      }
    }

    if (!classData) {
      // Fallback: if QR class mapping is missing, use the student's class profile to continue.
      const studentClassId = userData.class_id || userData.classId || classId;
      const studentClassName = userData.class_name || userData.className || className || studentClassId;

      classData = {
        class_id: studentClassId,
        class_name: studentClassName,
        className: studentClassName,
        division: userData.division || userData.div || division || '',
        department: userData.department || department || '',
        year: userData.year || userData.semester || year || '',
      };

      resolvedClassId = studentClassId;
    }

    // 1. Verify division match
    const requiredDivision = classData.division || classData.div || division || '';
    const studentDivision = userData.division || userData.div || '';
    if (String(requiredDivision).trim() && String(studentDivision).trim() !== String(requiredDivision).trim()) {
      return res.status(403).json({
        success: false,
        message: `You are not part of division ${requiredDivision}. Only students of the correct division can mark attendance.`
      });
    }

    const requiredDepartment = classData.department || department || '';
    const studentDepartment = userData.department || '';
    if (String(requiredDepartment).trim() && String(studentDepartment).trim() !== String(requiredDepartment).trim()) {
      return res.status(403).json({
        success: false,
        message: `Only ${requiredDepartment} students can mark attendance for this QR.`
      });
    }

    const requiredYear = classData.year || classData.semester || year || '';
    const studentYear = userData.year || userData.semester || '';
    if (String(requiredYear).trim() && String(studentYear).trim() && String(studentYear).trim() !== String(requiredYear).trim()) {
      return res.status(403).json({
        success: false,
        message: `Only year/semester ${requiredYear} students can mark attendance for this QR.`
      });
    }

    // 2. Check geolocation
    const distance = calculateDistance(
      latitude,
      longitude,
      parseFloat(studentLatitude),
      parseFloat(studentLongitude)
    );

    const allowedRadius = Number.isFinite(Number(radius)) && Number(radius) > 0 ? Number(radius) : 50;
    const reportedAccuracy = Number.isFinite(Number(studentAccuracy)) ? Number(studentAccuracy) : 0;
    const geoSafetyBuffer = Number.isFinite(Number(process.env.GEO_SAFETY_BUFFER_METERS))
      ? Number(process.env.GEO_SAFETY_BUFFER_METERS)
      : 75;
    const effectiveAllowedRadius = allowedRadius + Math.max(0, reportedAccuracy) + Math.max(0, geoSafetyBuffer);

    if (distance > effectiveAllowedRadius) {
      return res.status(403).json({
        success: false,
        message: `You are ${Math.round(distance)} meters away. Allowed range is ${Math.round(effectiveAllowedRadius)}m (base ${allowedRadius}m + GPS accuracy ${Math.round(reportedAccuracy)}m + buffer ${Math.round(geoSafetyBuffer)}m).`
      });
    }

    // 3. Get timetable for this class
    const timetableClassCandidates = Array.from(new Set([
      classId,
      resolvedClassId,
      classData.class_id,
      classData.class_name,
      classData.className,
    ].filter(Boolean)));

    const timetableEntries = [];
    for (const candidate of timetableClassCandidates) {
      const timetableSnapshot = await db.collection('timetable').where('class_id', '==', candidate).get();
      (timetableSnapshot?.docs || []).forEach((docSnapshot) => {
        timetableEntries.push({ id: docSnapshot.id, ...docSnapshot.data() });
      });
    }

    const uniqueTimetableEntries = Array.from(
      new Map(
        timetableEntries.map((row) => [`${row.class_id || ''}_${row.day || ''}_${row.time_slot || ''}_${row.subject || ''}`, row])
      ).values()
    );

    // 4. Check if current time matches any timetable slot
    const currentSlot = getCurrentTimeSlot(uniqueTimetableEntries, { graceMinutes: 15 });
    const now = new Date();
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const fallbackSlot = {
      day: dayNames[now.getDay()],
      time_slot: `QR-${toLocalClock(generatedAtDate)}-${toLocalClock(now)}`,
      subject: qrData?.subject || classData?.subject || 'General',
      timetableBypassed: true,
    };
    const slotToUse = currentSlot || fallbackSlot;

    // 5. Check if attendance already marked for this slot
    const today = new Date();
    const attendanceDate = today.toISOString().slice(0, 10);

    const existingAttendanceSnapshot = await db
      .collection('attendance')
      .where('student_id', '==', req.user.uid)
      .get();

    const existingMatches = (existingAttendanceSnapshot?.docs || []).filter((docSnapshot) => {
      const row = docSnapshot.data();
      return (
        timetableClassCandidates.includes(row.class_id) &&
        row.attendance_date === attendanceDate &&
        row.time_slot === slotToUse.time_slot
      );
    });

    if (existingMatches.length > 0) {
      return res.status(400).json({
        success: false,
        message: 'Attendance already marked for this time slot today.'
      });
    }

    // 6. Create attendance record
    const attendancePayload = {
      student_id: req.user.uid,
      student_name: userData.name || '',
      class_id: resolvedClassId,
      class_ref: classId,
      attendance_date: attendanceDate,
      date: today,
      day: slotToUse.day,
      time_slot: slotToUse.time_slot,
      subject: slotToUse.subject || '',
      timetableBypassed: Boolean(slotToUse.timetableBypassed),
      markedAt: new Date(),
      latitude: parseFloat(studentLatitude),
      longitude: parseFloat(studentLongitude),
      accuracy: reportedAccuracy,
      distance: Math.round(distance),
      effectiveAllowedRadius: Math.round(effectiveAllowedRadius),
      qrVerified: true,
    };

    const attendanceId = `att_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    await db.collection('attendance').doc(attendanceId).set(attendancePayload);

    return res.status(201).json({
      success: true,
      message: 'Attendance marked successfully!',
      data: {
        id: attendanceId,
        ...attendancePayload,
        markedAt: attendancePayload.markedAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('QR attendance marking error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to mark attendance',
      error: error.message
    });
  }
});

router.post('/face-verify', verifyToken, async (req, res) => {
  try {
    const { liveImageBase64 } = req.body;

    if (!liveImageBase64) {
      return res.status(400).json({
        success: false,
        message: 'liveImageBase64 is required'
      });
    }

    const apiToken = process.env.LUXAND_API_TOKEN || process.env.LUXAND_API_KEY;
    if (!apiToken) {
      return res.status(503).json({
        success: false,
        message: 'Luxand API token is not configured on the server.'
      });
    }

    const userDoc = await db.collection('users').doc(req.user.uid).get();
    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    if (userData.role !== 'student') {
      return res.status(403).json({
        success: false,
        message: 'Student access required'
      });
    }

    const selfieUrl = String(userData.selfieUrl || '').trim();
    if (!selfieUrl) {
      return res.status(400).json({
        success: false,
        message: 'Student profile selfie not found. Please upload selfie in profile first.'
      });
    }

    const base64Payload = String(liveImageBase64).replace(/^data:image\/[a-zA-Z+]+;base64,/, '');
    const liveBuffer = Buffer.from(base64Payload, 'base64');
    if (!liveBuffer.length) {
      return res.status(400).json({
        success: false,
        message: 'Invalid face image payload'
      });
    }

    const selfieResponse = await fetch(selfieUrl);
    if (!selfieResponse.ok) {
      return res.status(400).json({
        success: false,
        message: 'Unable to fetch stored selfie image for verification.'
      });
    }

    const selfieArrayBuffer = await selfieResponse.arrayBuffer();
    const selfieBuffer = Buffer.from(selfieArrayBuffer);
    const selfieContentType = selfieResponse.headers.get('content-type') || 'image/jpeg';

    const formData = new FormData();
    formData.append('photo1', new Blob([liveBuffer], { type: 'image/jpeg' }), 'live.jpg');
    formData.append('photo2', new Blob([selfieBuffer], { type: selfieContentType }), 'profile.jpg');

    const callLuxandVerify = async (fd, endpoint) => {
      const response = await fetch(`https://api.luxand.cloud${endpoint}`, {
        method: 'POST',
        headers: {
          token: apiToken,
        },
        body: fd,
      });

      const rawText = await response.text();
      let payload = {};
      try {
        payload = rawText ? JSON.parse(rawText) : {};
      } catch {
        payload = { raw: rawText };
      }

      return { response, payload, endpoint };
    };

    // Luxand currently accepts POST for /photo/similarity.
    let { response: luxandResponse, payload: luxandPayload, endpoint: luxandEndpoint } =
      await callLuxandVerify(formData, '/photo/similarity');

    // Backward compatibility fallback.
    if (!luxandResponse.ok) {
      const legacyResult = await callLuxandVerify(formData, '/photo/verify');
      if (legacyResult.response.ok) {
        luxandResponse = legacyResult.response;
        luxandPayload = legacyResult.payload;
        luxandEndpoint = legacyResult.endpoint;
      }
    }

    // Retry once with reversed image order for compatibility with edge cases.
    if (!luxandResponse.ok) {
      const retryFormData = new FormData();
      retryFormData.append('photo1', new Blob([selfieBuffer], { type: selfieContentType }), 'profile.jpg');
      retryFormData.append('photo2', new Blob([liveBuffer], { type: 'image/jpeg' }), 'live.jpg');

      const retryResult = await callLuxandVerify(retryFormData, luxandEndpoint || '/photo/similarity');
      if (retryResult.response.ok) {
        luxandResponse = retryResult.response;
        luxandPayload = retryResult.payload;
        luxandEndpoint = retryResult.endpoint;
      }
    }

    if (!luxandResponse.ok) {
      console.error('Luxand verify failed:', {
        endpoint: luxandEndpoint,
        status: luxandResponse.status,
        payload: luxandPayload,
      });

      const upstreamMessage =
        luxandPayload?.message ||
        luxandPayload?.error ||
        luxandPayload?.raw ||
        'Face verification failed by provider';

      const providerFailureMessage = luxandResponse.status === 401
        ? 'Luxand API authentication failed. Check server Luxand API key configuration.'
        : upstreamMessage;

      // Reserve 401 for our own authentication middleware only.
      // Provider-side auth/quota failures should surface as upstream errors.
      const mappedStatus = [400, 403, 404, 422, 429].includes(luxandResponse.status)
        ? luxandResponse.status
        : 502;

      return res.status(mappedStatus).json({
        success: false,
        message: `Luxand verify failed: ${providerFailureMessage}`,
        error: {
          endpoint: luxandEndpoint,
          providerStatus: luxandResponse.status,
          providerPayload: luxandPayload,
        }
      });
    }

    const toNormalizedUnit = (value) => {
      const numeric = Number(value);
      if (!Number.isFinite(numeric)) {
        return null;
      }
      return numeric > 1 ? numeric / 100 : numeric;
    };

    // Some responses are similarity-style (higher is better), others include distance (lower is better).
    const normalizedSimilarity = toNormalizedUnit(luxandPayload?.similarity);
    const normalizedScore = toNormalizedUnit(
      luxandPayload?.score ??
      luxandPayload?.confidence
    );
    const normalizedDistance = toNormalizedUnit(
      luxandPayload?.distance ??
      luxandPayload?.dissimilarity
    );

    const effectiveScore = normalizedSimilarity ?? normalizedScore;

    const configuredThreshold = Number(process.env.LUXAND_MATCH_THRESHOLD);
    const matchThreshold = Number.isFinite(configuredThreshold) && configuredThreshold > 0 && configuredThreshold <= 1
      ? configuredThreshold
      : 0.40;

    const configuredDistanceThreshold = Number(process.env.LUXAND_DISTANCE_THRESHOLD);
    const distanceThreshold = Number.isFinite(configuredDistanceThreshold) && configuredDistanceThreshold > 0 && configuredDistanceThreshold <= 1
      ? configuredDistanceThreshold
      : 0.45;

    const allowUnknownMatch = String(process.env.LUXAND_ALLOW_UNKNOWN_MATCH || '').toLowerCase() === 'true';

    const explicitNoMatch =
      luxandPayload?.same_person === false ||
      luxandPayload?.is_same_person === false ||
      luxandPayload?.match === false ||
      luxandPayload?.verified === false ||
      luxandPayload?.result === false;

    const similarityMatch = effectiveScore !== null && effectiveScore >= matchThreshold;
    const distanceMatch = normalizedDistance !== null && normalizedDistance <= distanceThreshold;
    const statusText = String(luxandPayload?.status || luxandPayload?.result_status || '').toLowerCase();
    const statusMatch = ['success', 'ok', 'verified', 'match'].includes(statusText);
    const hasNoNumericSignals = effectiveScore === null && normalizedDistance === null;
    const unknownButAllowed = allowUnknownMatch && hasNoNumericSignals && !explicitNoMatch;

    const samePerson =
      !explicitNoMatch && (
        luxandPayload?.same_person === true ||
        luxandPayload?.is_same_person === true ||
        luxandPayload?.match === true ||
        luxandPayload?.verified === true ||
        luxandPayload?.result === true ||
        statusMatch ||
        similarityMatch ||
        distanceMatch ||
        unknownButAllowed
      );

    if (!samePerson) {
      return res.status(403).json({
        success: false,
        message: `Face does not match your profile selfie. similarity=${effectiveScore ?? 'n/a'}, distance=${normalizedDistance ?? 'n/a'}.`,
        data: {
          verified: false,
          score: effectiveScore,
          rawSimilarity: luxandPayload?.similarity,
          rawScore: luxandPayload?.score ?? luxandPayload?.confidence ?? null,
          rawDistance: luxandPayload?.distance ?? luxandPayload?.dissimilarity ?? null,
          normalizedSimilarity,
          normalizedScore,
          normalizedDistance,
          matchThreshold,
          distanceThreshold,
          providerResponse: luxandPayload,
        }
      });
    }

    return res.status(200).json({
      success: true,
      message: 'Face verified successfully',
      data: {
        verified: true,
        score: effectiveScore,
        normalizedSimilarity,
        normalizedScore,
        normalizedDistance,
        matchThreshold,
        distanceThreshold,
        providerResponse: luxandPayload,
      }
    });
  } catch (error) {
    console.error('Face verification error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to verify face',
      error: error.message
    });
  }
});

router.get('/qr-history', verifyToken, async (req, res) => {
  try {
    const attendanceSnapshot = await db
      .collection('attendance')
      .where('student_id', '==', req.user.uid)
      .get();

    const attendance = (attendanceSnapshot?.docs || [])
      .map((docSnapshot) => {
        const data = docSnapshot.data();
        const markedAtValue = data.markedAt?.toDate?.() || (data.markedAt ? new Date(data.markedAt) : null);
        const dateValue = data.date?.toDate?.() || (data.date ? new Date(data.date) : null);

        return {
          id: docSnapshot.id,
          ...data,
          markedAt: markedAtValue ? markedAtValue.toISOString() : null,
          date: dateValue ? dateValue.toISOString() : null,
          _markedAtSort: markedAtValue ? markedAtValue.getTime() : 0,
        };
      })
      .sort((a, b) => b._markedAtSort - a._markedAtSort)
      .slice(0, 100)
      .map(({ _markedAtSort, ...row }) => row);

    return res.status(200).json({
      success: true,
      message: 'Attendance history retrieved',
      data: attendance
    });
  } catch (error) {
    console.error('Attendance history error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve attendance history',
      error: error.message
    });
  }
});

export default router;
