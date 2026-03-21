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

export default router;
