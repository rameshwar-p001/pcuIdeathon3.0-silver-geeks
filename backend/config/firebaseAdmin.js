import admin from 'firebase-admin';
import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import fetch from 'node-fetch';

dotenv.config();

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const projectId = process.env.FIREBASE_PROJECT_ID || 'campus-8a535';
const apiKey = process.env.FIREBASE_API_KEY;

let adminDb = null;
let adminAuth = null;
let useAdminSdk = false;

// Try to load service account from file first
const serviceAccountPath = path.join(__dirname, 'serviceAccount.json');
try {
  let credential;
  
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));
    credential = admin.credential.cert(serviceAccount);
    useAdminSdk = true;
  } else {
    // Try environment variables
    const projectId = process.env.FIREBASE_PROJECT_ID;
    const privateKey = process.env.FIREBASE_PRIVATE_KEY;
    const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
    
    if (projectId && privateKey && clientEmail) {
      credential = admin.credential.cert({
        projectId,
        privateKey: privateKey.replace(/\\n/g, '\n'),
        clientEmail
      });
      useAdminSdk = true;
    }
  }

  if (useAdminSdk && credential) {
    try {
      admin.initializeApp({
        credential,
        projectId
      });
      adminDb = admin.firestore();
      adminAuth = admin.auth();
      console.log('✅ Firebase Admin SDK initialized');
    } catch (error) {
      if (error.code === 'app/duplicate-app') {
        adminDb = admin.firestore();
        adminAuth = admin.auth();
        console.log('✅ Firebase Admin SDK already initialized');
      } else {
        console.warn('⚠️  Using Firestore REST API (Admin SDK unavailable)');
        useAdminSdk = false;
      }
    }
  } else {
    console.warn('⚠️  Service account not found. Using Firestore REST API');
  }
} catch (error) {
  console.warn('⚠️  Using Firestore REST API (error:', error.message + ')');
  useAdminSdk = false;
}

// REST API helper wrappers
const db = {
  collection: (collectionName) => ({
    doc: (docId) => ({
      set: async (data) => {
        if (useAdminSdk && adminDb) return adminDb.collection(collectionName).doc(docId).set(data);
        return restSet(collectionName, docId, data);
      },
      get: async () => {
        if (useAdminSdk && adminDb) return adminDb.collection(collectionName).doc(docId).get();
        return restGet(collectionName, docId);
      },
      update: async (data) => {
        if (useAdminSdk && adminDb) return adminDb.collection(collectionName).doc(docId).update(data);
        return restUpdate(collectionName, docId, data);
      },
      delete: async () => {
        if (useAdminSdk && adminDb) return adminDb.collection(collectionName).doc(docId).delete();
        return restDelete(collectionName, docId);
      }
    }),
    where: (field, op, val) => ({
      get: async () => {
        if (useAdminSdk && adminDb) return adminDb.collection(collectionName).where(field, op, val).get();
        return restQuery(collectionName, field, op, val);
      }
    }),
    get: async () => {
      if (useAdminSdk && adminDb) return adminDb.collection(collectionName).get();
      return restGetAll(collectionName);
    }
  })
};

const auth = {
  createUser: async (data) => {
    if (useAdminSdk && adminAuth) return adminAuth.createUser(data);
    throw new Error('Admin SDK required for user creation');
  },
  verifyIdToken: async (token) => {
    if (useAdminSdk && adminAuth) return adminAuth.verifyIdToken(token);
    throw new Error('Admin SDK required for token verification');
  },
  deleteUser: async (uid) => {
    if (useAdminSdk && adminAuth) return adminAuth.deleteUser(uid);
    throw new Error('Admin SDK required for user deletion');
  }
};

// REST API functions
async function restSet(coll, docId, data) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${coll}`;
  try {
    const resp = await fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: convertToFirestoreValues(data)
      })
    });
    return { success: resp.ok };
  } catch (e) {
    console.error('REST set error:', e);
    throw e;
  }
}

async function restGet(coll, docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${coll}/${docId}?key=${apiKey}`;
  try {
    const resp = await fetch(url);
    const doc = await resp.json();
    return {
      exists: !!doc.fields && !doc.error,
      data: () => convertFromFirestoreValues(doc.fields || {}),
      id: docId
    };
  } catch (e) {
    return { exists: false, data: () => ({}), id: docId };
  }
}

async function restUpdate(coll, docId, data) {
  return restSet(coll, docId, data);
}

async function restDelete(coll, docId) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${coll}/${docId}?key=${apiKey}`;
  try {
    const resp = await fetch(url, { method: 'DELETE' });
    return { success: resp.ok };
  } catch (e) {
    throw e;
  }
}

async function restQuery(coll, field, op, val) {
  // Simple query - returns all docs for filtering
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${coll}?key=${apiKey}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    const docs = (data.documents || []).map(doc => ({
      id: doc.name.split('/').pop(),
      data: () => convertFromFirestoreValues(doc.fields || {})
    }));
    // Client-side filtering
    return {
      docs: docs.filter(d => matchQuery(d.data(), field, op, val))
    };
  } catch (e) {
    return { docs: [] };
  }
}

async function restGetAll(coll) {
  const url = `https://firestore.googleapis.com/v1/projects/${projectId}/databases/(default)/documents/${coll}?key=${apiKey}`;
  try {
    const resp = await fetch(url);
    const data = await resp.json();
    return {
      docs: (data.documents || []).map(doc => ({
        id: doc.name.split('/').pop(),
        data: () => convertFromFirestoreValues(doc.fields || {})
      }))
    };
  } catch (e) {
    return { docs: [] };
  }
}

function convertToFirestoreValues(obj) {
  const result = {};
  for (const [key, val] of Object.entries(obj)) {
    if (val === null) result[key] = { nullValue: null };
    else if (typeof val === 'string') result[key] = { stringValue: val };
    else if (typeof val === 'number') result[key] = { doubleValue: val };
    else if (typeof val === 'boolean') result[key] = { booleanValue: val };
    else if (val instanceof Date) result[key] = { timestampValue: val.toISOString() };
    else if (typeof val === 'object') result[key] = { mapValue: { fields: convertToFirestoreValues(val) } };
  }
  return result;
}

function convertFromFirestoreValues(fields) {
  const result = {};
  for (const [key, val] of Object.entries(fields)) {
    if (val.nullValue !== undefined) result[key] = null;
    else if (val.stringValue !== undefined) result[key] = val.stringValue;
    else if (val.doubleValue !== undefined) result[key] = val.doubleValue;
    else if (val.booleanValue !== undefined) result[key] = val.booleanValue;
    else if (val.timestampValue !== undefined) result[key] = new Date(val.timestampValue);
    else if (val.mapValue !== undefined) result[key] = convertFromFirestoreValues(val.mapValue.fields || {});
  }
  return result;
}

function matchQuery(data, field, op, val) {
  const fieldVal = data[field];
  switch (op) {
    case '==': return fieldVal === val;
    case '<': return fieldVal < val;
    case '<=': return fieldVal <= val;
    case '>': return fieldVal > val;
    case '>=': return fieldVal >= val;
    default: return false;
  }
}

export { db, auth, adminAuth, adminDb, useAdminSdk };
export default admin;

