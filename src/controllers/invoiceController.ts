import { Response } from "express";
import admin from "firebase-admin";
import db from "../firebs";
import { AuthenticatedRequest } from "../utils/interfaces";
import PDFDocument from "pdfkit";

export const getInvoicePdf = async (
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
      res.status(404).json({ error: "Invoice doesn't exist" });
      return;
    }
    const invoiceData = snapshot.data();

    // Setup PDF document
    const doc = new PDFDocument();
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename=invoice-${id}.pdf`);
    doc.pipe(res);

    // Add header
    doc.fontSize(20).text("Invoice", { align: "center" });
    doc.moveDown();

    // Items header
    doc.fontSize(16).text("Items:");
    doc.moveDown(0.5);

    // List each item
    if (Array.isArray(invoiceData?.items)) {
      invoiceData.items.forEach((item: any) => {
        const { name, quantity, weight, price } = item;
        doc.fontSize(12)
          .text(`Name: ${name} | Quantity: ${quantity} | Weight: ${weight} | Price: ${price}`);
      });
    } else {
      doc.text("No items found.");
    }
    doc.moveDown();

    // Total Price
    if (invoiceData?.totalPrice) {
      doc.fontSize(14).text(`Total Price: ${invoiceData.totalPrice}`);
    }
    
    doc.end();
  } catch (error: any) {
    console.error("Error generating invoice PDF:", error);
    res.status(500).json({ error: error.message });
  }
};

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
    // "custumerName": "aaa",
    //  "custumerPhone": "aaa",
    //  "items": "aaa",
    //  "totalPrice": "aaa",
    //  "goldPrice": "aaa",
    //  "totalProfits": "aaa",

    const { custumerName, custumerPhone, items, totalPrice, goldPrice, totalProfits } = req.body;
    if (!custumerName || !custumerPhone || !items || !totalPrice || !goldPrice || !totalProfits) {
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
      totalProfits,
      goldPrice
    };
    
    const invoiceRef = await db.collection("invoices").add(newInvoice);
    // firstName: requester.firstName
    res.status(201).json({ message: "Invoice created successfully", id: invoiceRef.id });
    // getInvoicePdf(res, invoiceRef.id);
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
