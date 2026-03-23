import express from 'express';
import { auth, db, useAdminSdk } from '../config/firebaseAdmin.js';
import { verifyToken } from '../middleware/auth.js';
import { getGitHubScore } from '../utils/github.js';

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

// Update GitHub profile and calculate score
router.post('/update-github-profile', verifyToken, async (req, res) => {
  try {
    const { gitHubUrl } = req.body;

    // Validation
    if (!gitHubUrl) {
      return res.status(400).json({
        success: false,
        message: 'GitHub URL is required'
      });
    }

    // Get GitHub score and data
    const gitHubData = await getGitHubScore(gitHubUrl);
    
    console.log('[DEBUG] GitHub data fetched:', {
      username: gitHubData.username,
      score: gitHubData.totalScore,
      repoCount: gitHubData.repoCount,
    });

    // Update user profile in Firestore
    const userDocRef = db.collection('users').doc(req.user.uid);
    
    await userDocRef.update({
      gitHubProfile: {
        username: gitHubData.username,
        url: gitHubData.gitHubUrl,
        avatarUrl: gitHubData.avatarUrl,
        score: gitHubData.totalScore,
        repoCount: gitHubData.repoCount,
        repoScore: gitHubData.repoScore,
        activityScore: gitHubData.activityScore,
        lastUpdated: gitHubData.lastUpdated,
        fetchedAt: new Date().toISOString(),
      },
      gitHubScore: gitHubData.totalScore, // Denormalized for easy sorting
    });
    
    console.log('[DEBUG] GitHub profile saved for user:', req.user.uid);

    return res.status(200).json({
      success: true,
      message: 'GitHub profile updated successfully',
      data: {
        username: gitHubData.username,
        gitHubUrl: gitHubData.gitHubUrl,
        score: gitHubData.totalScore,
        repoCount: gitHubData.repoCount,
        repoScore: gitHubData.repoScore,
        activityScore: gitHubData.activityScore,
      }
    });
  } catch (error) {
    console.error('GitHub profile update error:', error);
    
    let statusCode = 500;
    let message = 'Failed to update GitHub profile';

    // Handle specific error cases
    if (error.message.includes('not found')) {
      statusCode = 404;
      message = error.message;
    } else if (error.message.includes('Invalid GitHub')) {
      statusCode = 400;
      message = error.message;
    }

    return res.status(statusCode).json({
      success: false,
      message: message,
      error: error.message
    });
  }
});

export default router;
