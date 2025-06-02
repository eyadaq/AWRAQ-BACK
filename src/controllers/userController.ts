import { Response, NextFunction } from "express";
import admin from "firebase-admin";
import db from "../firebs";
import { AuthenticatedRequest, CreateUserRequest, UserData } from "../utils/interfaces";

export const createUserHandler = async (
  req: CreateUserRequest,
  res: Response
): Promise<void> => {
  const { email, password, firstName, lastName, role, branchId } = req.body;
  const requester = req.user;
  
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }

  if (!email || !password || !firstName || !lastName || !role || !branchId) {
    res.status(400).json({ error: "Missing required fields" });
    return;
  }

  // Only admins can create admin users
  if (role === 'admin' && requester.role !== 'admin') {
    res.status(403).json({ error: 'Insufficient permissions to create admin user' });
    return;
  }

  // Managers can only create users in their own branch
  if (requester.role === 'manager' && branchId !== requester.branchId) {
    res.status(403).json({ error: 'Can only create users in your own branch' });
    return;
  }

  // Sales cannot create users
  if (requester.role === 'sales') {
    res.status(403).json({ error: 'Insufficient permissions' });
    return;
  }

  try {
      const userRecord = await admin.auth().createUser({
      email,
      password,
      emailVerified: false,
      disabled: false
    });

    const userData = {
      uid: userRecord.uid,
      email,
      firstName,
      lastName,
      role,
      branchId,
      isDelete: false,
      createdAt: admin.firestore.FieldValue.serverTimestamp()
    };

    await db.collection('users').doc(userRecord.uid).set(userData);

    await admin.auth().setCustomUserClaims(userRecord.uid, { role, branchId });

    res.status(201).json({
      uid: userRecord.uid,
      email: userRecord.email,
      firstName,
      lastName,
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
    // Don't allow deleting yourself
    if (uid === requester.uid) {
      res.status(400).json({ error: "Cannot delete your own account" });
      return;
    }

    const userDoc = await db.collection("users").doc(uid).get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const userData = userDoc.data() as UserData;

    // Check permissions
    if (requester.role === 'sales') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Managers can only delete users in their branch
    if (requester.role === 'manager') {
      if (userData.branchId !== requester.branchId) {
        res.status(403).json({ error: 'Can only delete users in your branch' });
        return;
      }
      // Prevent managers from deleting admins
      if (userData.role === 'admin') {
        res.status(403).json({ error: 'Cannot delete admin users' });
        return;
      }
    }

    // Prevent deleting the last admin
    if (userData.role === 'admin' && requester.role === 'admin') {
      const admins = await db.collection('users')
        .where('role', '==', 'admin')
        .where('isDelete', '==', false)
        .get();
      
      if (admins.size <= 1) {
        res.status(400).json({ error: 'Cannot delete the last admin' });
        return;
      }
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
// Admin can see all users, manager can see users in their branch only
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

  try {
    let usersRef = db.collection("users").where("isDelete", "==", false);
    
    // Managers can only see users in their branch
    if (requester.role === "manager") {
      usersRef = usersRef.where("branchId", "==", requester.branchId);
    }
    // Sales cannot list users
    else if (requester.role === "sales") {
      res.status(403).json({ error: "Insufficient permissions" });
      return;
    }
    // Admin can see all users (no additional filters needed)

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
  next: NextFunction
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
    // Get the target user's data
    const userRef = db.collection("users").doc(uid);
    const userDoc = await userRef.get();

    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const targetUser = userDoc.data() as UserData;

    // Check permissions
    if (requester.role === 'sales') {
      res.status(403).json({ error: 'Insufficient permissions' });
      return;
    }

    // Managers can only update users in their branch
    if (requester.role === 'manager') {
      if (targetUser.branchId !== requester.branchId) {
        res.status(403).json({ error: 'Can only update users in your branch' });
        return;
      }
      // Prevent managers from changing roles to admin
      if (role === 'admin') {
        res.status(403).json({ error: 'Cannot assign admin role' });
        return;
      }
      // Prevent moving users to other branches
      if (branchId && branchId !== requester.branchId) {
        res.status(403).json({ error: 'Cannot move users to other branches' });
        return;
      }
    }

    // Admins can do anything, but prevent demoting the last admin
    if (requester.role === 'admin' && targetUser.role === 'admin' && role !== 'admin') {
      const admins = await db.collection('users')
        .where('role', '==', 'admin')
        .where('isDelete', '==', false)
        .get();
      
      if (admins.size <= 1) {
        res.status(400).json({ error: 'Cannot remove the last admin' });
        return;
      }
    }

    // Proceed with the update
    const updateData: Partial<UserData> = {};
    if (role) updateData.role = role;
    if (branchId) updateData.branchId = branchId;

    await userRef.update(updateData);

    // Update custom claims if role changed
    if (role) {
      await admin.auth().setCustomUserClaims(uid, {
        role,
        branchId: branchId || targetUser.branchId
      });
    } else if (branchId) {
      await admin.auth().setCustomUserClaims(uid, {
        role: targetUser.role,
        branchId
      });
    }

    res.status(200).json({ message: 'User updated successfully' });
  } catch (error) {
    console.error('Error updating user:', error);
    next(error);
  }
};
