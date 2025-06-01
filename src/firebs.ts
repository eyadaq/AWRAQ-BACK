import admin from "firebase-admin";
import serviceAccount from "../serviceAccountKey.json"; // path to your downloaded key

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
});

const db = admin.firestore();

export default db;
