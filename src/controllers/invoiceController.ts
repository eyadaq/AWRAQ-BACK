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

export const createInvoiceHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    
    const { custumerName, custumerPhone, items, totalPrice, goldPrice } = req.body;
    if (!custumerName || !custumerPhone || !items || !totalPrice || !goldPrice) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    
    const newInvoice = {
      branchId: requester.branchId,
      userId: requester.uid,
      custumerName,
      custumerPhone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      items,
      totalPrice,
      goldPrice
    };
    
    const invoiceRef = await db.collection("invoices").add(newInvoice);
    
    res.status(201).json({ message: "Invoice created successfully", id: invoiceRef.id });
  } catch (error: any) {
    console.error("Error creating invoice:", error);
    res.status(500).json({ error: error.message });
  }
};

export const listInvoicesHandler = async (
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
      snapshot = await db.collection("invoices").get();
    }
    else
    {
      snapshot = await db.collection("invoices")
      .where("branchId", "==", requester.branchId).get();
    }

      const invoices = snapshot.docs.map(doc => ({
        id: doc.id, // Firestore-generated doc ID
        ...doc.data()
      }));

      res.status(200).json(invoices);
    } catch (error: any) {
      console.error("Error fetching invoices:", error);
      res.status(500).json({ error: error.message });
  }
};

export const getInvoiceByIdHandler = async (
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
    const snapshot = await db.collection("invoices").doc(id).get();

    if (!snapshot.exists) {
      res.status(405).json({ error: "invoice doesn't exist" });
      return;
    }

    const invoiceData = snapshot.data();
    
    if (requester.role !== "admin" && requester.branchId !== invoiceData?.branchId) {
      res.status(406).json({ error: "Forbidden" });
      return;
    }
    
    const invoice = {
      id: snapshot.id,
      ...invoiceData
    };

    res.status(200).json(invoice);
  } catch (error: any) {
    console.error("Error fetching item:", error);
    res.status(500).json({ error: error.message });
  }
};
