import { Response } from "express";
import admin from "firebase-admin";
import db from "../firebs";
import { AuthenticatedRequest } from "../utils/interfaces";

export async function createBranchHandler (
  req: AuthenticatedRequest,
  res: Response) {
  const requester = req.user;
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (requester.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name } = req.body;

  if ( !name ) {
    res.status(400).json({ error: "Missing required fields" });
    return ;
  }
  
  const snapshot = await db.collection("branches")
  .where("name", "==", name)
  .get();

  if (!snapshot.empty)
  {
    res.status(405).json({ error: "branch already exists" });
    return ;
  }
  
  try {
    await db.collection("branches").doc().set({
      name,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      isDelete: false
    });
    res.status(201).json({ message: "Branch created", name });
  } catch (error: any) {
    console.error("Error creating branch:", error);
    res.status(500).json({ error: error.message });
  }
}

export const listBranchesHandler = async (
  req: AuthenticatedRequest,
  res: Response): Promise<void> =>  {
  try {
  const requester = req.user;
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (requester.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
    const snapshot = await db.collection("branches").get();

    const branches = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));

    res.status(200).json(branches);
  } catch (error: any) {
    console.error("Error fetching branches:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function updateBranchHandler(
  req: AuthenticatedRequest,
  res: Response) {
    
  try {
  const requester = req.user;
  const { id: docId } = req.params;
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (requester.role === "sales" || (requester.role === "manager" && requester.branchId !== docId)) {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  const { name } = req.body;
  const snapshot = await db.collection("branches")
  .where("name", "==", name)
  .get();

  if (!snapshot.empty)
  {
    res.status(405).json({ error: "branch with the new name already exists" });
    return ;
  }

	const docRef = db.collection("branches").doc(docId);
	const doc = await docRef.get();
	if (!doc.exists) {
	  res.status(404).json({ error: "Branch not found" });
    return ;
	}
    await db.collection("branches").doc(docId).update({
      name,
      updatedAt: admin.firestore.FieldValue.serverTimestamp()
    });


    res.status(201).json({ message: "Branch modified", name });
  } catch (error: any) {
    console.error("Error fetching branch:", error);
    res.status(500).json({ error: error.message });
  }
}

export async function deleteBranchHandler(
  req: AuthenticatedRequest,
  res: Response) {
  const { id: docId } = req.params;

  try {
  const requester = req.user;
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (requester.role !== "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
	const docRef = db.collection("branches").doc(docId);
	const doc = await docRef.get();
  const branchData = doc.data();
  const name = branchData?.name;

	if (!doc.exists) {
	  res.status(404).json({ error: "Branch not found" });
    return ;
	}
    db.collection("branches").doc(docId).update({
      isDelete: true,
      deletedAt: admin.firestore.FieldValue.serverTimestamp() as any,
  });

    res.status(201).json({ message: "Branch deleted", name });
  } catch (error: any) {
    console.error("Error fetching branch:", error);
    res.status(500).json({ error: error.message });
  }
}

// export async function getBranchByIdHandler(
//   req: AuthenticatedRequest,
//   res: Response) {
//   const docId = req.params.id;

//   try {
//     const docRef = db.collection("branches").doc(docId);
//     const doc = await docRef.get();

//     if (!doc.exists) {
//       return res.status(404).json({ error: "Branch not found" });
//     }

//     res.status(200).json({ id: doc.id, ...doc.data() });
//   } catch (error: any) {
//     console.error("Error fetching branch:", error);
//     res.status(500).json({ error: error.message });
//   }
// }
