import { Response } from "express";
import admin from "firebase-admin";
import db from "../firebs";
import { AuthenticatedRequest } from "../utils/interfaces";
import PDFDocument from "pdfkit";
import ExcelJS from "exceljs";

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

    const { customerName, customerPhone, items, totalPrice, goldPrice, totalProfits } = req.body;
    if (!customerName || !customerPhone || !items || !totalPrice || !goldPrice || !totalProfits) {
      res.status(400).json({ error: "Missing required fields" });
      return;
    }
    
    const newInvoice = {
      branchId: requester.branchId,
      userId: requester.uid,
      customerName,
      customerPhone,
      createdAt: admin.firestore.FieldValue.serverTimestamp(),
      items,
      totalPrice,
      totalProfits,
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

export const exportInvoicesToExcelHandler = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    const branchId = requester.branchId;
    if (!branchId) {
      res.status(400).json({ error: "Missing branchId" });
      return;
    }

    const snapshot = await db.collection("invoices")
      .where("branchId", "==", branchId)
      .get();

    if (snapshot.empty) {
      res.status(404).json({ error: "No invoices found for this branch" });
      return;
    }

    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet("Invoices");

    // Define headers
    sheet.columns = [
      { header: "Invoice ID", key: "id", width: 20 },
      { header: "User ID", key: "userId", width: 20 },
      { header: "Customer Name", key: "customerName", width: 25 },
      { header: "Customer Phone", key: "customerPhone", width: 20 },
      { header: "Created At", key: "createdAt", width: 25 },
      { header: "Total Price", key: "totalPrice", width: 15 },
      { header: "Total Profits", key: "totalProfits", width: 15 },
      { header: "Items", key: "items", width: 50 },
    ];

    snapshot.forEach(doc => {
      const data = doc.data();
      const items = Array.isArray(data.items)
        ? data.items.map((item: any, idx: number) => {
            return `#${idx + 1} Name: ${item.name}, Qty: ${item.quantity}, Price: ${item.price}, Profit: ${item.profit}`;
          }).join("\n")
        : "No items";

      sheet.addRow({
        id: doc.id,
        userId: data.userId || "",
        customerName: data.customerName || "",
        customerPhone: data.customerPhone || "",
        createdAt: data.createdAt?.toDate().toLocaleString() || "",
        totalPrice: data.totalPrice || 0,
        totalProfits: data.totalProfits || 0,
        items: items,
      });
    });

    // Set headers
    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet");
    res.setHeader("Content-Disposition", `attachment; filename=invoices-${branchId}.xlsx`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error: any) {
    console.error("Error generating Excel:", error);
    res.status(500).json({ error: error.message });
  }
};
