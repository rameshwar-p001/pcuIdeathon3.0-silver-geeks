import { auth, db } from '../config/firebaseAdmin.js';

const extractBearerToken = (authorizationHeader) => {
  const headerValue = String(authorizationHeader || '').trim();
  if (!headerValue) {
    return null;
  }

  // Accept `Bearer <token>` in a case-insensitive way and ignore extra spaces.
  const match = headerValue.match(/^Bearer\s+(.+)$/i);
  if (match?.[1]) {
    return match[1].trim();
  }

  return null;
};

const decodeJwtPayloadUnsafe = (token) => {
  try {
    const parts = String(token || '').split('.');
    if (parts.length < 2) {
      return null;
    }

    const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), '=');
    const decoded = Buffer.from(padded, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch {
    return null;
  }
};

// Middleware to verify Firebase ID token
export const verifyToken = async (req, res, next) => {
  try {
    const authorizationHeader = req.headers.authorization;
    const token = extractBearerToken(authorizationHeader);
    
    if (!token) {
      console.warn('verifyToken missing bearer token:', {
        method: req.method,
        path: req.originalUrl,
        hasAuthorizationHeader: Boolean(authorizationHeader),
        authorizationPreview: authorizationHeader ? String(authorizationHeader).slice(0, 20) : null,
      });

      return res.status(401).json({
        success: false,
        message: 'No token provided'
      });
    }












    

    const decodedToken = await auth.verifyIdToken(token);
    req.user = {
      uid: decodedToken.uid,
      email: decodedToken.email
    };
    
    next();
  } catch (error) {
    const token = extractBearerToken(req.headers.authorization);
    const payload = decodeJwtPayloadUnsafe(token);

    console.error('verifyToken failed:', {
      code: error?.code || 'unknown',
      message: error?.message || 'unknown error',
      path: req.originalUrl,
      tokenClaims: payload ? {
        aud: payload.aud,
        iss: payload.iss,
        sub: payload.sub,
        exp: payload.exp,
        iat: payload.iat,
      } : null,
    });

    return res.status(401).json({
      success: false,
      message: 'Invalid or expired token',
      error: error.message
    });
  }
};

// Middleware to check if user is admin
export const requireAdmin = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (!userDoc.exists) {
      return res.status(403).json({
        success: false,
        message: 'User profile not found'
      });
    }

    const userData = userDoc.data();
    
    if (userData.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Admin access required'
      });
    }

    req.userRole = userData.role;
    next();
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: 'Error checking admin status',
      error: error.message
    });
  }
};

// Middleware to attach user role
export const attachUserRole = async (req, res, next) => {
  try {
    const userDoc = await db.collection('users').doc(req.user.uid).get();
    
    if (userDoc.exists) {
      req.userRole = userDoc.data().role;
    }
    
    next();
  } catch (error) {
    next();
  }
};
