import { Request, Response } from "express";
import admin from "firebase-admin";
import db from "../firebs";

interface AuthenticatedRequest extends Request {
  user?: {
    uid: string;
    role: string;
    branchId: string;
  };
}

export async function createItemHandler (
  req: AuthenticatedRequest,
  res: Response) {
  const requester = req.user;
  if (!requester) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (requester.role === "admin") {
    res.status(403).json({ error: "Forbidden" });
    return;
  }
  let { name, weight, category, karat, factoryFees, vendor, Quantity, photo } = req.body;
  const branchId = req.user?.branchId;

  if ( !name ||  !weight || !category || !karat || !factoryFees || !vendor ) {
    res.status(400).json({ error: "Missing required fields" });
    return ;
  }
  const snapshot = await db.collection("items")
  .where("name", "==", name)
  .get();

  if (!snapshot.empty)
  {
    res.status(405).json({ error: "item already exists" });
    return ;
  }
  if (!Quantity)
    Quantity = 0;
  if (!photo)
    photo = 0;

  try {
    await db.collection("items").doc().set({
      name, weight, category, karat, factoryFees, vendor, branchId, Quantity, photo,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    res.status(201).json({ message: "item created", name });
  } catch (error: any) {
    console.error("Error creating item:", error);
    res.status(500).json({ error: error.message });
  }
}

export const listItemesHandler = async (
  req: AuthenticatedRequest,
  res: Response): Promise<void> =>  {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    let snapshot;
    if (requester.role === "admin")
    {
      snapshot = await db.collection("items").get();
    }
    else
    {
      snapshot = await db.collection("items")
      .where("branchId", "==", requester.branchId).get();
    }

      const items = snapshot.docs.map(doc => ({
        id: doc.id, // Firestore-generated doc ID
        ...doc.data()
      }));

      res.status(200).json(items);
    } catch (error: any) {
      console.error("Error fetching items:", error);
      res.status(500).json({ error: error.message });
  }
}

// export const getItemByNameHandler = async (
//   req: AuthenticatedRequest,
//   res: Response): Promise<void> =>  {
//   try {
//   const requester = req.user;
//   if (!requester) {
//     res.status(401).json({ error: "Unauthorized" });
//     return;
//   }
//   const { name } = req.body;
//   const snapshot = await db.collection("items")
//   .where("name", "==", name).get();

//   if (snapshot.empty)
//   {
//     res.status(405).json({ error: "item doesn't exist" });
//     return ;
//   }
//   const item = snapshot.docs.map(doc => ({
//     id: doc.id, // Firestore-generated doc ID
//     ...doc.data()
//   }));

//   res.status(200).json(item);
//   } catch (error: any) {
//     console.error("Error fetching items:", error);
//     res.status(500).json({ error: error.message });
//   }
// }

export const getItemByIdHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { id } = req.body;
    const snapshot = await db.collection("items").doc(id).get();

    if (!snapshot.exists) {
      res.status(405).json({ error: "item doesn't exist" });
      return;
    }

    const itemData = snapshot.data();
    
    // Ensure the requester is allowed to access this item:
    // Compare the requester's branchId with the item's branchId, unless the requester is admin.
    if (requester.role !== "admin" && requester.branchId !== itemData?.branchId) {
      res.status(406).json({ error: "Forbidden" });
      return;
    }
    
    const item = {
      id: snapshot.id,
      ...itemData
    };

    res.status(200).json(item);
  } catch (error: any) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: error.message });
  }
}

export const deleteItemHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const { id } = req.params;
    
    const docRef = db.collection("items").doc(id);
    const snapshot = await docRef.get();
    
    if (!snapshot.exists) {
      res.status(404).json({ error: "Item doesn't exist" });
      return;
    }
    
    const itemData = snapshot.data();
    // If the requester is not admin, ensure the branchId matches
    if (requester.role !== "admin" && requester.branchId !== itemData?.branchId) {
      res.status(403).json({ error: "Forbidden" });
      return;
    }
    
    await docRef.delete();
    res.status(200).json({ message: "Item deleted successfully", id });
  } catch (error: any) {
    console.error("Error deleting item:", error);
    res.status(500).json({ error: error.message });
  }
}

