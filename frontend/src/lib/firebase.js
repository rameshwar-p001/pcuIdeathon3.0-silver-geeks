import { deleteApp, getApp, getApps, initializeApp } from 'firebase/app'
import {
  createUserWithEmailAndPassword,
  getAuth,
  signOut,
} from 'firebase/auth'
import { doc, initializeFirestore, setDoc } from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig)

export const auth = getAuth(app)
export const db = initializeFirestore(app, {
  experimentalAutoDetectLongPolling: true,
  useFetchStreams: false,
})

export async function createAuthUserFromAdminSession(email, password, profileData) {
  const appName = `admin-create-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const secondaryApp = initializeApp(firebaseConfig, appName)
  const secondaryAuth = getAuth(secondaryApp)
  const secondaryDb = initializeFirestore(secondaryApp, {
    experimentalAutoDetectLongPolling: true,
    useFetchStreams: false,
  })

  try {
    const credentials = await createUserWithEmailAndPassword(
      secondaryAuth,
      email,
      password,
    )

    if (profileData) {
      await setDoc(doc(secondaryDb, 'users', credentials.user.uid), {
        uid: credentials.user.uid,
        ...profileData,
      })
    }

    return credentials.user
  } finally {
    await signOut(secondaryAuth).catch(() => {})
    await deleteApp(secondaryApp)
  }
}
