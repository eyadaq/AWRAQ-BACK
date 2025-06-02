import { RequestHandler } from "express";
import admin from "firebase-admin";

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        role: string;
        branchId: string;
        firstName: string;
      };
    }
  }
}

export const authenticateToken: RequestHandler = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    res.status(401).json({ error: "Unauthorized: No token provided" });
    return;
  }

  const idToken = authHeader.split(" ")[1];

  admin.auth().verifyIdToken(idToken, true)
    .then(decodedToken => {
      if (!decodedToken.uid || !decodedToken.role) {
        res.status(401).json({ error: "Invalid token: Missing required claims" });
        return;
      }

      req.user = {
        uid: decodedToken.uid,
        role: decodedToken.role,
        branchId: decodedToken.branchId || "",
        firstName: decodedToken.firstName || "",
      };
      
      next();
    })
    .catch(error => {
      console.error("Authentication error:", error);
      res.status(401).json({ error: "Invalid or expired token" });
    });
};

export const requireAdmin: RequestHandler = (req, res, next) => {
  if (!req.user) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }

  if (req.user.role !== 'admin') {
    res.status(403).json({ error: "Insufficient permissions" });
    return;
  }

  next();
};
