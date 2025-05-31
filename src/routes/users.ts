import { Request, Response } from "express";
import admin from "firebase-admin";
import db from "../firebs";

export async function createUserHandler(req: Request, res: Response) {
  const { email, password, role, branchId } = req.body;

  if (!email || !password || !role || !branchId) {
    return res.status(400).json({ error: "Missing required fields" });
  }
  
  try {
    const userRecord = await admin.auth().createUser({ email, password });
    await db.collection("users").doc(userRecord.uid).set({
      email,
      role,
      branchId: branchId || null,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    await admin.auth().setCustomUserClaims(userRecord.uid, {
      role,
      branchId: branchId || null,
    });
    res.status(201).json({ message: "User created", uid: userRecord.uid });
  } catch (error: any) {
    console.error("Error creating user:", error);
    res.status(500).json({ error: error.message });
  }
}
