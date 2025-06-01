import { initializeApp, cert, getApps, getApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore } from 'firebase-admin/firestore';
// import serviceAccount from '../../serviceAccountKey.json';
import serviceAccount from '../../serviceAccountKey.json';

// Initialize Firebase Admin
const adminConfig = {
  credential: cert(serviceAccount as any),
  databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
};

const adminApp = getApps().length === 0 ? initializeApp(adminConfig) : getApp();
const adminAuth = getAuth(adminApp);
const adminDb = getFirestore(adminApp);

export { adminAuth, adminDb, adminApp };
