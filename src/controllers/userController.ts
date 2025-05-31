import { Request, Response, NextFunction } from "express";
import admin from "firebase-admin";
import db from "../firebs";

interface UserData {
  uid: string;
  email: string;
  role: string;
  branchId: string;
  isDelete: boolean;
  createdAt?: admin.firestore.Timestamp;
  deletedAt?: admin.firestore.Timestamp;
}

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    role: string;
    branchId: string;
  };
}

interface CreateUserRequest extends AuthenticatedRequest {
  body: {
    email: string;
    password: string;
    role: string;
    branchId: string;
  };
}

// Create a new user (public endpoint)
export const createUserHandler = async (
  req: CreateUserRequest,
  res: Response
): Promise<void> => {
  const { email, password, role, branchId } = req.body;
  if (!email || !password || !role || !branchId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Only allow admin creation by authenticated admin users
  if (role === 'admin' && (!req.user || req.user.role !== 'admin')) {
    res.status(403).json({ error: 'Insufficient permissions to create admin user' });
    return;
  }

  try {
    // Create user in Firebase Auth
    const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false
    });

    // Create user document in Firestore
    const userData = {
      uid: userRecord.uid,
      email,
      role,
      branchId,
      isDelete: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    // Set custom claims for role-based access control
    await admin.auth().setCustomUserClaims(userRecord.uid, { role, branchId });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      role,
      branchId
    });
  } catch (error: any) {
    console.error('Detailed error creating user:', {
      message: error.message,
      code: error.code,
      details: error.errorInfo || error.details,
      stack: error.stack
    });
    
    // Clean up Firebase Auth user if it was created but Firestore operation failed
    if (req.body.email) {
      try {
        const userRecord = await admin.auth().getUserByEmail(req.body.email);
        console.log('Cleaning up partially created user:', userRecord.uid);
        await admin.auth().deleteUser(userRecord.uid);
      } catch (deleteError) {
        console.error('Failed to clean up user after error:', deleteError);
      }
    }
    
    // More detailed error messages
    if (error.code === 'auth/email-already-exists') {
      res.status(409).json({ 
        error: 'Email already in use',
        details: 'The email address is already registered with another account'
      });
    } else if (error.code === 'auth/invalid-email') {
      res.status(400).json({ 
        error: 'Invalid email address',
        details: 'The email address is not valid'
      });
    } else if (error.code === 'auth/weak-password') {
      res.status(400).json({ 
        error: 'Weak password',
        details: 'Password should be at least 6 characters long'
      });
    } else if (error.code === 'auth/operation-not-allowed') {
      res.status(403).json({
        error: 'Operation not allowed',
        details: 'Email/password accounts are not enabled. Enable them in the Firebase Console.'
      });
    } else if (error.code === 'auth/unauthorized-continue-uri') {
      res.status(400).json({
        error: 'Unauthorized domain',
        details: 'The domain is not authorized for OAuth operations.'
      });
    } else {
      res.status(500).json({ 
        error: 'Failed to create user',
        details: process.env.NODE_ENV !== 'production' ? error.message : undefined,
        code: error.code
      });
    }
  }
};

interface DeleteUserRequest extends AuthenticatedRequest {
  params: {
    uid: string;
  };
}

// Delete a user (protected endpoint)
export const deleteUserHandler = async (
  req: DeleteUserRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const { uid } = req.params;
  const requester = req.user;

  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  try {
    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userData = userDoc.data() as UserData;

    if (requester.role === "sales") {
      res.status(403).json({ error: "Sales cannot delete users" });
      return;
    }

    if (requester.role === "manager" && userData.branchId !== requester.branchId) {
      res.status(403).json({ error: "Managers can only delete users in their branch" });
      return;
    }

    await db.collection("users").doc(uid).update({
      isDelete: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp() as any,
    });

    res.status(200).json({ message: "User soft-deleted" });
  } catch (error) {
    next(error);
  }
};

// List all users (protected endpoint)
export const listUsersHandler = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  const requester = req.user;
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (requester.role === "sales") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }

  try {
    let usersRef = db.collection("users").where("isDelete", "==", false);
    if (requester.role === "manager") {
      usersRef = usersRef.where("branchId", "==", requester.branchId);
    }

    const snapshot = await usersRef.get();
    const users = snapshot.docs.map((doc) => ({ uid: doc.id, ...doc.data() }));

    res.status(200).json({ users });
  } catch (error) {
    next(error);
  }
};

interface UpdateUserRequest extends AuthenticatedRequest {
  params: {
    uid: string;
  };
  body: {
    role?: string;
    branchId?: string;
  };
}

// Update a user (protected endpoint)
export const updateUserHandler = async (
  req: UpdateUserRequest,
  res: Response,
  //next: NextFunction
): Promise<void> => {
  const { uid } = req.params;
  const { role, branchId } = req.body;
  const requester = req.user;

  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!role && !branchId) {
    res.status(400).json({ error: "At least one of role or branchId must be provided" });
    return;
  }

  try {
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const targetUser = userDoc.data() as UserData | undefined;
    if (!targetUser) {
      res.status(404).json({ error: "User data is missing" });
      return;
    }

    if (requester.role === "sales") {
      res.status(403).json({ error: "Sales cannot update users" });
      return;
    }

    if (requester.role === "manager") {
      if (targetUser.role !== "sales") {
        res.status(403).json({ error: "Managers can only update sales users" });
        return;
      }

      if (targetUser.branchId !== requester.branchId) {
        res.status(403).json({ error: "Managers can only update users in their branch" });
        return;
      }

      if (branchId && branchId !== requester.branchId) {
        res.status(403).json({ error: "Managers cannot move users to another branch" });
        return;
      }
    }

    const updateData: Partial<UserData> = {};
    if (role) updateData.role = role;
    if (branchId) updateData.branchId = branchId;

    await userRef.update(updateData);

    await admin.auth().setCustomUserClaims(uid, {
      role: role || targetUser.role,
      branchId: branchId || targetUser.branchId,
    });

    res.status(200).json({ message: "User updated" });
  } catch (error) {
    console.error("Error updating user:", error);
    res.status(500).json({ error: "Internal server error" });
  }
};
