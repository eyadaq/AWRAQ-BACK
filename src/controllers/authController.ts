import { Request, Response } from 'express';
import { auth, db } from '../config/firebase-client';

interface UserData {
  uid: string;
  email: string;
  role?: string;
  branchId?: string;
  username?: string;
  [key: string]: any; // Allow additional properties
}

interface LoginRequest extends Request {
  body: {
    email: string;
    password: string;
  };
}

export const loginHandler = async (
  req: LoginRequest,
  res: Response,
): Promise<void> => {
  const { email, password } = req.body;
  
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  try {
    // Get user by email using Admin SDK
    const userRecord = await auth.getUserByEmail(email);
    
    // Get additional user data from Firestore
    const userDoc = await db.collection('users').doc(userRecord.uid).get();
    const userData = userDoc.data() as UserData | undefined;
    
    // Verify password by trying to sign in with email/password
    // This requires the Firebase Auth REST API
    const firebaseApiKey = process.env.FIREBASE_API_KEY;
    if (!firebaseApiKey) {
      throw new Error('Missing FIREBASE_API_KEY environment variable');
    }
    
    // Verify password using Firebase Auth REST API
    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${firebaseApiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          password,
          returnSecureToken: true
        })
      }
    );
    
    const data = await response.json();
    console.log('Firebase Auth Response:', JSON.stringify(data, null, 2));
    
    if (!response.ok) {
      console.error('Firebase Auth Error:', data.error);
      throw new Error(data.error?.message || 'Authentication failed');
    }
    
    if (!data.idToken) {
      throw new Error('No ID token received from Firebase');
    }
    
    const idToken = data.idToken;

    // Set custom claims if needed
    if (userData?.role) {
      await auth.setCustomUserClaims(userRecord.uid, { 
        role: userData.role,
        branchId: userData.branchId || null
      });
    }

    res.json({
      id: userRecord.uid,
      email: userRecord.email,
      role: userData?.role || 'user',
      branchId: userData?.branchId,
      username: userData?.username,
      token: idToken
    });
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof Error) {
      if (error.message.includes('INVALID_PASSWORD') || error.message.includes('EMAIL_NOT_FOUND')) {
        res.status(401).json({ error: "Invalid email or password" });
      } else {
        console.error('Unexpected error during login:', error);
        res.status(500).json({ 
          error: "Login failed",
          details: process.env.NODE_ENV === 'development' ? error.message : undefined
        });
      }
    } else {
      res.status(500).json({ error: "An unknown error occurred" });
    }
  }
}
