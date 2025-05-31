import { initializeApp, getApps, getApp, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
import serviceAccount from '../serviceAccountKey.json';

// Initialize Firebase Admin
const adminConfig = {
  credential: cert(serviceAccount as any),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
};

const app = getApps().length === 0 ? initializeApp(adminConfig) : getApp();
const auth = getAuth(app);
const db = getFirestore(app);

// Initialize Firebase Client SDK for client-side operations
const clientConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: `${serviceAccount.project_id}.firebaseapp.com`,
  projectId: serviceAccount.project_id,
  storageBucket: `${serviceAccount.project_id}.appspot.com`,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

// Export both admin and client auth
const clientApp = getApps().length <= 1 ? initializeApp(clientConfig, 'client') : getApp('client');
const clientAuth = getAuth(clientApp);

export { auth, db, app, clientAuth, clientApp };
