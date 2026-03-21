import express from 'express';
import { auth, db, useAdminSdk } from '../config/firebaseAdmin.js';
import { verifyToken } from '../middleware/auth.js';

const router = express.Router();

// Middleware to check if Admin SDK is available
const requireAdminSdk = (req, res, next) => {
  if (!useAdminSdk) {
    return res.status(503).json({
      success: false,
      message: 'Service account credentials required. Please add Firebase service account to continue.'
    });
  }
  next();
};

// Login endpoint
router.post('/login', requireAdminSdk, async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Get user by email from Firebase Auth
    const userRecord = await auth.getUserByEmail(email);
    
    // Create custom token for frontend authentication
    const customToken = await auth.createCustomToken(userRecord.uid);

    // Get user profile from Firestore to retrieve role
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    let role = 'student';
    let userData = null;

    if (userDoc.exists) {
      userData = userDoc.data();
      role = userData.role || 'student';
    }

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        uid: userRecord.uid,
        email: userRecord.email,
        customToken: customToken,
        role: role,
        name: userData?.name || ''
      }
    });
  } catch (error) {
    let message = 'Login failed';

    if (error.code === 'auth/user-not-found') {
      message = 'User not found';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.code
    });
  }
});

// Register endpoint - Creates admin user (first-time setup)
router.post('/register', requireAdminSdk, async (req, res) => {
  try {
    const { email, password, name } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
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
      displayName: name || email
    });

    // Store user profile in Firestore as admin
    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      name: name || email,
      email: email,
      role: 'admin',
      createdAt: new Date()
    });

    const customToken = await auth.createCustomToken(userRecord.uid);

    return res.status(201).json({
      success: true,
      message: 'Admin registration successful',
      user: {
        uid: userRecord.uid,
        email: email,
        name: name || email,
        customToken: customToken,
        role: 'admin'
      }
    });
  } catch (error) {
    let message = 'Registration failed';

    if (error.code === 'auth/email-already-exists') {
      message = 'Email already in use';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.code
    });
  }
});

// Get current user profile
router.get('/me', verifyToken, async (req, res) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();

    if (!userDoc.exists) {
      return res.status(404).json({
        success: false,
        message: 'User profile not found'
      });
    }

    return res.status(200).json({
      success: true,
      message: 'User profile retrieved',
      data: userDoc.data()
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve user profile',
      error: error.message
    });
  }
});

export default router;
