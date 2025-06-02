import * as admin from 'firebase-admin';
import * as fs from 'fs';
import * as path from 'path';


const serviceAccountPath = path.join(__dirname, '../../serviceAccountKey.json');

if (!fs.existsSync(serviceAccountPath)) {
  throw new Error('Firebase service account key file not found');
}

const serviceAccount = JSON.parse(fs.readFileSync(serviceAccountPath, 'utf8'));


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      privateKey: serviceAccount.private_key
    }),
    databaseURL: `https://${serviceAccount.project_id}.firebaseio.com`
  });
}

// Get Firestore instance
const db = admin.firestore();

// Get Auth instance
const auth = admin.auth();

export { admin, db, auth };
