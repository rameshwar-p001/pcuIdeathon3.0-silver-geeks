import express from 'express';
import { auth, db, useAdminSdk } from '../config/firebaseAdmin.js';
import { verifyToken, requireAdmin } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Admin SDK is available
const requireAdminSdk = (req, res, next) => {
  if (!useAdminSdk) {
    return res.status(503).json({
      success: false,
      message: 'Service account credentials required. Admin features are unavailable. Please add Firebase service account to backend/.env or backend/serviceAccount.json'
    });
  }
  next();
};

// Add Student - Admin only
router.post('/add-student', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, enrollmentNumber, department, semester, phone } = req.body;

    // Validation
    if (!name || !email || !password || !enrollmentNumber || !department || !semester) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, password, enrollmentNumber, department, semester'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name
    });

    // Store user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name,
      email: email,
      enrollmentNumber: enrollmentNumber,
      department: department,
      semester: parseInt(semester),
      phone: phone || '',
      role: 'student',
      createdAt: new Date(),
      createdBy: req.user.uid
    });

    return res.status(201).json({
      success: true,
      message: 'Student created successfully',
      data: {
        uid: userRecord.uid,
        email: email,
        name: name,
        enrollmentNumber: enrollmentNumber,
        role: 'student'
      }
    });
  } catch (error) {
    let message = 'Failed to create student';

    if (error.code === 'auth/email-already-exists') {
      message = 'Email already in use';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.message
    });
  }
});

// Add Faculty - Admin only
router.post('/add-faculty', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, email, password, facultyId, department, subject, phone } = req.body;

    // Validation
    if (!name || !email || !password || !facultyId || !department) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields: name, email, password, facultyId, department'
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters'
      });
    }

    // Create user in Firebase Auth
    const userRecord = await auth.createUser({
      email: email,
      password: password,
      displayName: name
    });

    // Store user profile in Firestore
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name,
      email: email,
      facultyId: facultyId,
      department: department,
      subject: subject || '',
      phone: phone || '',
      role: 'faculty',
      createdAt: new Date(),
      createdBy: req.user.uid
    });

    return res.status(201).json({
      success: true,
      message: 'Faculty created successfully',
      data: {
        uid: userRecord.uid,
        email: email,
        name: name,
        facultyId: facultyId,
        role: 'faculty'
      }
    });
  } catch (error) {
    let message = 'Failed to create faculty';

    if (error.code === 'auth/email-already-exists') {
      message = 'Email already in use';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.message
    });
  }
});

// Get faculty list - Admin only
router.get('/faculties', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const facultiesSnapshot = await db.collection('users').where('role', '==', 'faculty').get();
    const faculties = [];

    facultiesSnapshot.forEach((facultyDoc) => {
      const data = facultyDoc.data();
      faculties.push({
        uid: data.uid,
        name: data.name,
        email: data.email,
        facultyId: data.facultyId || '',
        department: data.department || '',
        subject: data.subject || '',
        phone: data.phone || ''
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Faculty list retrieved successfully',
      data: faculties,
      total: faculties.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve faculty list',
      error: error.message
    });
  }
});

// Assign class teacher - Admin only
router.post('/assign-class-teacher', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const { class_id: classId, faculty_id: facultyId } = req.body;

    if (!classId || !facultyId) {
      return res.status(400).json({
        success: false,
        message: 'class_id and faculty_id are required'
      });
    }

    const facultyDoc = await db.collection('users').doc(facultyId).get();

    if (!facultyDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'Faculty not found'
      });
    }

    const facultyData = facultyDoc.data();

    if (facultyData.role !== 'faculty') {
      return res.status(400).json({
        success: false,
        message: 'Provided faculty_id does not belong to a faculty user'
      });
    }

    const assignment = {
      class_id: classId,
      faculty_id: facultyId,
      faculty_name: facultyData.name,
      faculty_email: facultyData.email,
      updatedAt: new Date(),
      updatedBy: req.user.uid
    };

    await db.collection('class_teachers').doc(classId).set(assignment);

    return res.status(200).json({
      success: true,
      message: 'Class teacher assigned successfully',
      data: assignment
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to assign class teacher',
      error: error.message
    });
  }
});

// Get assigned classes - Admin only
router.get('/assigned-classes', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const assignedSnapshot = await db.collection('class_teachers').get();
    const rows = [];

    assignedSnapshot.forEach((docSnapshot) => {
      rows.push({
        id: docSnapshot.id,
        ...docSnapshot.data()
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Assigned classes retrieved successfully',
      data: rows,
      total: rows.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve assigned classes',
      error: error.message
    });
  }
});

// Get all users - Admin only
router.get('/users', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const usersSnapshot = await db.collection('users').get();
    const users = [];

    usersSnapshot.forEach((doc) => {
      const userData = doc.data();
      users.push({
        uid: userData.uid,
        name: userData.name,
        email: userData.email,
        role: userData.role,
        enrollmentNumber: userData.enrollmentNumber || null,
        facultyId: userData.facultyId || null,
        department: userData.department || null,
        semester: userData.semester || null,
        phone: userData.phone || '',
        createdAt: userData.createdAt
      });
    });

    return res.status(200).json({
      success: true,
      message: 'Users retrieved successfully',
      data: users,
      total: users.length
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve users',
      error: error.message
    });
  }
});

// Get user by ID - Admin only
router.get('/users/:uid', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.params.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }

    const userData = userDoc.data();
    return res.status(200).json({
      success: true,
      message: 'User retrieved successfully',
      data: userData
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user',
      error: error.message
    });
  }
});

// Update user - Admin only
router.put('/users/:uid', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    const { name, department, phone, subject, enrollmentNumber, semester, role } = req.body;

    const updateData = {};
    if (name) updateData.name = name;
    if (department) updateData.department = department;
    if (phone) updateData.phone = phone;
    if (subject) updateData.subject = subject;
    if (enrollmentNumber) updateData.enrollmentNumber = enrollmentNumber;
    if (semester) updateData.semester = parseInt(semester);
    if (role) updateData.role = role; // Allow updating role

    if (Object.keys(updateData).length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    await db.collection('users').doc(req.params.uid).update(updateData);

    return res.status(200).json({
      success: true,
      message: 'User updated successfully',
      data: { uid: req.params.uid, ...updateData }
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to update user',
      error: error.message
    });
  }
});

// Delete user - Admin only
router.delete('/users/:uid', requireAdminSdk, verifyToken, requireAdmin, async (req, res) => {
  try {
    // Delete user from Firebase Auth
    await auth.deleteUser(req.params.uid);

    // Delete user profile from Firestore
    await db.collection('users').doc(req.params.uid).delete();

    return res.status(200).json({
      success: true,
      message: 'User and related records deleted successfully'
    });
  } catch (error) {
    let message = 'Failed to delete user';

    if (error.code === 'auth/user-not-found') {
      message = 'User not found in Firebase Auth';
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.message
    });
  }
});

export default router;












