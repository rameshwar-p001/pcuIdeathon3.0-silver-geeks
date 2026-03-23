import express from 'express';
import { db, useAdminSdk } from '../config/firebaseAdmin.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

const requireAdminSdk = (req, res, next) => {
  if (!useAdminSdk) {
    return res.status(503).json({
      success: false,
      message: 'Service account credentials required. Faculty APIs are unavailable.'
    });
  }

  next();
};

const requireFacultyOrAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const role = userDoc.data().role;
    // Accept faculty, admin, and coordinator roles
    if (role !== 'faculty' && role !== 'admin' && role !== 'coordinator') {
      return res.status(403).json({
        success: false,
        message: 'Faculty/Coordinator access required'
      });
    }

    req.userRole = role;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Unable to validate faculty access',
      error: error.message
    });
  }
};

const toIsoString = (value) => {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (value?.toDate) return value.toDate().toISOString();
  if (value instanceof Date) return value.toISOString();
  return String(value);
};

const mapClassTeacherAssignment = (docSnapshot) => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    classId: data.class_id || data.classId || docSnapshot.id,
    className: data.class_name || data.className || data.class_id || data.classId || docSnapshot.id,
    facultyUid: data.faculty_id || data.facultyUid || '',
    facultyName: data.faculty_name || data.facultyName || '',
    facultyEmail: data.faculty_email || data.facultyEmail || '',
    updatedAt: toIsoString(data.updatedAt)
  };
};

const mapLegacyClassTeacherAssignment = (docSnapshot) => {
  const data = docSnapshot.data();
  return {
    id: docSnapshot.id,
    classId: data.classId || data.class_id || docSnapshot.id,
    className: data.className || data.class_name || data.classId || data.class_id || docSnapshot.id,
    facultyUid: data.facultyUid || data.faculty_id || '',
    facultyName: data.facultyName || data.faculty_name || '',
    facultyEmail: data.facultyEmail || data.faculty_email || '',
    updatedAt: toIsoString(data.updatedAt)
  };
};

const chunkArray = (list, chunkSize) => {
  const output = [];
  for (let i = 0; i < list.length; i += chunkSize) {
    output.push(list.slice(i, i + chunkSize));
  }
  return output;
};

const getFacultyClasses = async (uid) => {
  const [byFacultySnapshot, byClassTeacherSnapshot, classTeacherSnapshot, legacyClassTeacherSnapshot] = await Promise.all([
    db.collection('classes').where('faculty_id', '==', uid).get(),
    db.collection('classes').where('class_teacher_id', '==', uid).get(),
    db.collection('class_teachers').where('faculty_id', '==', uid).get(),
    db.collection('classTeachers').where('facultyUid', '==', uid).get(),
  ]);

  const classMap = new Map();

  byFacultySnapshot.forEach((docSnapshot) => {
    classMap.set(docSnapshot.id, { id: docSnapshot.id, ...docSnapshot.data() });
  });

  byClassTeacherSnapshot.forEach((docSnapshot) => {
    classMap.set(docSnapshot.id, { id: docSnapshot.id, ...docSnapshot.data() });
  });

  const classTeacherAssignments = [];
  const classIdsFromAssignments = [];

  classTeacherSnapshot.forEach((docSnapshot) => {
    const mapped = mapClassTeacherAssignment(docSnapshot);
    classTeacherAssignments.push(mapped);
    classIdsFromAssignments.push(mapped.classId);
  });

  legacyClassTeacherSnapshot.forEach((docSnapshot) => {
    const mapped = mapLegacyClassTeacherAssignment(docSnapshot);
    classTeacherAssignments.push(mapped);
    classIdsFromAssignments.push(mapped.classId);
  });

  const missingClassIds = classIdsFromAssignments.filter((classId) => !classMap.has(classId));
  if (missingClassIds.length > 0) {
    const classDocReads = missingClassIds.map((classId) => db.collection('classes').doc(classId).get());
    const classDocs = await Promise.all(classDocReads);

    classDocs.forEach((classDoc, index) => {
      const classId = missingClassIds[index];
      if (classDoc.exists) {
        classMap.set(classId, { id: classDoc.id, ...classDoc.data() });
        return;
      }

      classMap.set(classId, {
        id: classId,
        class_name: classId,
        subject: '',
        schedule: '',
      });
    });
  }

  return {
    classes: Array.from(classMap.values()),
    classTeacherAssignments
  };
};

const canAccessClass = (classes, classId) => classes.some((row) => row.id === classId);

router.get('/dashboard', requireAdminSdk, verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    const { classes, classTeacherAssignments } = await getFacultyClasses(req.user.uid);
    const classMap = new Map(classes.map((row) => [row.id, row]));

    const timetableSnapshot = await db.collection('timetable').where('faculty_id', '==', req.user.uid).get();
    const timetableByClass = {};
    const timetableClassIds = new Set();

    timetableSnapshot.forEach((docSnapshot) => {
      const row = docSnapshot.data();
      const classId = row.class_id;
      if (!classId) {
        return;
      }

      timetableClassIds.add(classId);
      if (!timetableByClass[classId]) {
        timetableByClass[classId] = [];
      }

      timetableByClass[classId].push({
        id: docSnapshot.id,
        day: row.day || '',
        time_slot: row.time_slot || '',
        subject: row.subject || '',
      });
    });

    const missingClassIds = Array.from(timetableClassIds).filter((classId) => !classMap.has(classId));
    if (missingClassIds.length > 0) {
      const classDocReads = missingClassIds.map((classId) => db.collection('classes').doc(classId).get());
      const classDocs = await Promise.all(classDocReads);

      classDocs.forEach((classDoc, index) => {
        const classId = missingClassIds[index];
        if (classDoc.exists) {
          classMap.set(classId, { id: classDoc.id, ...classDoc.data() });
          return;
        }

        classMap.set(classId, {
          id: classId,
          class_name: classId,
          subject: '',
          schedule: '',
        });
      });
    }

    const finalClasses = Array.from(classMap.values());
    const classIds = finalClasses.map((row) => row.id);

    const students = [];
    if (classIds.length > 0) {
      const usersSnapshot = await db.collection('users').where('role', '==', 'student').get();
      usersSnapshot.forEach((docSnapshot) => {
        const data = docSnapshot.data();
        const classId = data.class_id || data.classId;
        if (classId && classIds.includes(classId)) {
          students.push({ id: docSnapshot.id, ...data });
        }
      });

      const classChunks = chunkArray(classIds, 30);
      for (const chunk of classChunks) {
        const studentsSnapshot = await db.collection('students').where('class_id', 'in', chunk).get();
        studentsSnapshot.forEach((docSnapshot) => {
          students.push({ id: docSnapshot.id, ...docSnapshot.data() });
        });
      }
    }

    const uniqueStudents = Array.from(new Map(students.map((row) => [row.uid || row.id, row])).values());

    const [facultiesSnapshot, assignmentsSnapshot] = await Promise.all([
      db.collection('users').where('role', '==', 'faculty').get(),
      db.collection('assignments').where('faculty_id', '==', req.user.uid).get(),
    ]);

    const faculties = [];
    facultiesSnapshot.forEach((docSnapshot) => {
      faculties.push({ id: docSnapshot.id, ...docSnapshot.data() });
    });

    const assignments = [];
    assignmentsSnapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      assignments.push({
        id: docSnapshot.id,
        ...data,
        createdAt: toIsoString(data.createdAt)
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Faculty dashboard data retrieved successfully',
      data: {
        classes: finalClasses,
        timetableByClass,
        students: uniqueStudents,
        faculties,
        assignments,
        classTeacherAssignments,
      }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to load faculty dashboard data',
      error: error.message
    });
  }
});

router.get('/assignments', requireAdminSdk, verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    const snapshot = await db.collection('assignments').where('faculty_id', '==', req.user.uid).get();
    const assignments = [];

    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      assignments.push({
        id: docSnapshot.id,
        ...data,
        createdAt: toIsoString(data.createdAt)
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Assignments retrieved successfully',
      data: assignments
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve assignments',
      error: error.message
    });
  }
});

router.post('/assignments', requireAdminSdk, verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    console.log('POST /assignments - body:', req.body);
    const { title, description, deadline, class_id: classId, subject } = req.body;

    if (!title || !description || !deadline || !classId || !subject) {
      console.log('Missing required fields:', { title, description, deadline, classId, subject });
      return res.status(400).json({
        success: false,
        message: 'title, description, deadline, class_id and subject are required'
      });
    }

    console.log('Fetching faculty classes...');
    const { classes } = await getFacultyClasses(req.user.uid);
    console.log('Faculty classes:', classes.map(c => c.id));
    
    if (!canAccessClass(classes, classId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class'
      });
    }

    const normalizedSubject = String(subject).trim();
    console.log('Checking timetable for subject:', { classId, facultyId: req.user.uid, normalizedSubject });

    const timetableMatchSnapshot = await db
      .collection('timetable')
      .where('class_id', '==', classId)
      .get();

    const matchingTimetableRows = (timetableMatchSnapshot?.docs || []).filter((docSnapshot) => {
      const row = docSnapshot.data();
      return row.faculty_id === req.user.uid && String(row.subject || '').trim() === normalizedSubject;
    });

    let canCreateForSubject = matchingTimetableRows.length > 0;
    console.log('Timetable match found:', canCreateForSubject);

    if (!canCreateForSubject) {
      const classDoc = await db.collection('classes').doc(classId).get();
      if (classDoc.exists) {
        const classData = classDoc.data();
        canCreateForSubject =
          classData.faculty_id === req.user.uid &&
          String(classData.subject || '').trim() === normalizedSubject;
        console.log('Fallback check (class document):', canCreateForSubject);
      }
    }

    if (!canCreateForSubject) {
      return res.status(403).json({
        success: false,
        message: 'Only the assigned subject teacher can create assignments for this subject.'
      });
    }

    const payload = {
      title: String(title).trim(),
      description: String(description).trim(),
      deadline: String(deadline).trim(),
      class_id: classId,
      subject: normalizedSubject,
      faculty_id: req.user.uid,
      createdAt: new Date(),
    };

    console.log('Creating assignment in Firestore...');
    const writeResult = await db.collection('assignments').add(payload);
    console.log('Assignment created with ID:', writeResult.id);

    return res.status(201).json({
      success: true,
      message: 'Assignment created successfully',
      data: {
        id: writeResult.id,
        ...payload,
        createdAt: payload.createdAt.toISOString(),
      }
    });
  } catch (error) {
    console.error('Assignment creation error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create assignment',
      error: error.message,
      stack: process.env.NODE_ENV !== 'production' ? error.stack : undefined
    });
  }
});

router.get('/timetable', requireAdminSdk, verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    const classId = String(req.query.classId || '').trim();
    if (!classId) {
      return res.status(400).json({
        success: false,
        message: 'classId query parameter is required'
      });
    }

    const { classes } = await getFacultyClasses(req.user.uid);
    if (!canAccessClass(classes, classId)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have access to this class'
      });
    }

    const snapshot = await db.collection('timetable').where('class_id', '==', classId).get();
    const rows = [];
    snapshot.forEach((docSnapshot) => {
      const data = docSnapshot.data();
      rows.push({
        id: docSnapshot.id,
        ...data,
        updatedAt: toIsoString(data.updatedAt)
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Timetable retrieved successfully',
      data: rows
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve timetable',
      error: error.message
    });
  }
});

router.put('/timetable', requireAdminSdk, verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    const { classId, entries } = req.body;

    if (!classId || !Array.isArray(entries)) {
      return res.status(400).json({
        success: false,
        message: 'classId and entries are required'
      });
    }

    const [classTeacherDoc, legacyClassTeacherDoc] = await Promise.all([
      db.collection('class_teachers').doc(classId).get(),
      db.collection('classTeachers').doc(classId).get(),
    ]);
    const classTeacherData = classTeacherDoc.exists ? classTeacherDoc.data() : null;
    const legacyClassTeacherData = legacyClassTeacherDoc.exists ? legacyClassTeacherDoc.data() : null;
    const isClassTeacher =
      (classTeacherData && classTeacherData.faculty_id === req.user.uid) ||
      (legacyClassTeacherData && legacyClassTeacherData.facultyUid === req.user.uid);
    const canEdit = req.userRole === 'admin' || isClassTeacher;

    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'Only class teacher can update timetable'
      });
    }

    const writeJobs = [];
    entries.forEach((entry) => {
      const day = String(entry.day || '').trim();
      const timeSlot = String(entry.time_slot || '').trim();
      const subject = String(entry.subject || '').trim();
      const facultyId = String(entry.faculty_id || '').trim();

      if (!day || !timeSlot || (!subject && !facultyId)) {
        return;
      }

      const docId = `${classId}_${day}_${timeSlot}`;
      writeJobs.push(
        db.collection('timetable').doc(docId).set({
          class_id: classId,
          day,
          time_slot: timeSlot,
          subject,
          faculty_id: facultyId || req.user.uid,
          updatedAt: new Date(),
          updatedBy: req.user.uid,
        })
      );
    });

    await Promise.all(writeJobs);

    return res.status(200).json({
      success: true,
      message: 'Timetable updated successfully',
      updatedRows: writeJobs.length,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update timetable',
      error: error.message
    });
  }
});

// Get students by department sorted by GitHub score (Placement Coordinator)
router.get('/students-by-github-score', requireAdminSdk, verifyToken, requireFacultyOrAdmin, async (req, res) => {
  try {
    const { department } = req.query;

    // Get all students first, then filter in-memory
    let query = db.collection('users').where('role', '==', 'student');
    const snapshot = await query.get();
    
    console.log(`[DEBUG] Total students found: ${snapshot.size}`);

    let students = snapshot.docs
      .map((doc) => {
        const data = doc.data();
        
        // Log each student's GitHub data
        if (data.gitHubProfile) {
          console.log(`[DEBUG] Student ${data.name} (${doc.id}):`, {
            hasGitHubProfile: true,
            username: data.gitHubProfile.username,
            score: data.gitHubScore,
            profileKeys: Object.keys(data.gitHubProfile),
          });
        }
        
        const student = {
          uid: doc.id,
          name: data.name,
          email: data.email,
          department: data.department || 'N/A',
          enrollmentNumber: data.enrollmentNumber,
          cgpa: data.cgpa,
          gitHubProfile: data.gitHubProfile || null,
          gitHubScore: data.gitHubScore || 0,
        };
        
        return student;
      })
      .filter((student) => {
        // Only show students with GitHub profiles
        const hasGitHub = student.gitHubProfile && student.gitHubProfile.username;
        
        if (!hasGitHub) {
          console.log(`[DEBUG] Filtering out ${student.name}: No GitHub profile or username`);
          return false;
        }
        
        // Filter by department if specified
        if (department && String(department).trim()) {
          const matches = String(student.department).toLowerCase() === String(department).toLowerCase().trim();
          if (!matches) {
            console.log(`[DEBUG] Filtering out ${student.name}: Department mismatch (${student.department} vs ${department})`);
          }
          return matches;
        }
        
        console.log(`[DEBUG] Including ${student.name} in results`);
        return true;
      })
      .sort((a, b) => (b.gitHubScore || 0) - (a.gitHubScore || 0)); // Sort by score descending
    
    console.log(`[DEBUG] Students with GitHub profiles after filtering: ${students.length}`);

    return res.status(200).json({
      success: true,
      message: 'Students sorted by GitHub score retrieved',
      data: students,
      total: students.length,
    });
  } catch (error) {
    console.error('Get students by GitHub score error:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve students',
      error: error.message,
    });
  }
});

export default router;