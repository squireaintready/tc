import { initializeApp } from 'firebase/app'
import { initializeAppCheck, ReCaptchaV3Provider } from 'firebase/app-check'
import {
  getFirestore, initializeFirestore,
  persistentLocalCache, persistentMultipleTabManager,
} from 'firebase/firestore'

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
}

const app = initializeApp(firebaseConfig)

// App Check proves a request came from this real app, so Firestore can reject
// anyone hitting the database directly (it has no user login). Guarded by the
// site key so a missing key never breaks the app; enforcement is a separate
// toggle in the Firebase console.
const appCheckSiteKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY
if (appCheckSiteKey) {
  // Local dev needs a debug token registered in the console to reach an
  // enforced project. Setting this to `true` makes the SDK log one to register.
  if (import.meta.env.DEV) {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = import.meta.env.VITE_APPCHECK_DEBUG_TOKEN || true
  }
  try {
    initializeAppCheck(app, {
      provider: new ReCaptchaV3Provider(appCheckSiteKey),
      isTokenAutoRefreshEnabled: true,
    })
  } catch {
    // App Check failing to initialize must not take down the app
  }
}

// Offline persistence that keeps working when the app is open in several tabs
let firestore
try {
  firestore = initializeFirestore(app, {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  })
} catch {
  firestore = getFirestore(app)
}

export const db = firestore
