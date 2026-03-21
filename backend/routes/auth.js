import express from 'express';
import dotenv from 'dotenv';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';

const router = express.Router();

dotenv.config();

// Firebase configuration
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Register endpoint
router.post('/register', async (req, res) => {
  try {
    const { email, password } = req.body;

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

    // Create user with Firebase
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    return res.status(201).json({
      success: true,
      message: 'Registration successful',
      user: {
        uid: user.uid,
        email: user.email,
        idToken: idToken
      }
    });
  } catch (error) {
    let message = 'Registration failed';

    if (error.code === 'auth/email-already-in-use') {
      message = 'Email already in use';
    } else if (error.code === 'auth/invalid-email') {
      message = 'Invalid email address';
    } else if (error.code === 'auth/weak-password') {
      message = 'Password is too weak';
    }

    return res.status(400).json({
      success: false,
      message: message,
      error: error.code
    });
  }
});

// Login endpoint
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Email and password are required'
      });
    }

    // Sign in with Firebase
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    const user = userCredential.user;
    const idToken = await user.getIdToken();

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      user: {
        uid: user.uid,
        email: user.email,
        idToken: idToken
      }
    });
  } catch (error) {
    let message = 'Login failed';

    if (error.code === 'auth/user-not-found') {
      message = 'User not found';
    } else if (error.code === 'auth/wrong-password') {
      message = 'Incorrect password';
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

export default router;
