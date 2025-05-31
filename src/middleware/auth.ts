import { RequestHandler } from "express";
import admin from "firebase-admin";

declare global {
  namespace Express {
    interface Request {
      user?: {
        uid: string;
        role: string;
        branchId: string;
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

  admin.auth().verifyIdToken(idToken)
    .then(decodedToken => {
      if (!decodedToken.uid || !decodedToken.role) {
        res.status(401).json({ error: "Invalid token: Missing required claims" });
        return;
      }

      req.user = {
        uid: decodedToken.uid,
        role: decodedToken.role,
        branchId: decodedToken.branchId || "",
      };
      
      next();
    })
    .catch(error => {
      console.error("Authentication error:", error);
      res.status(401).json({ error: "Invalid or expired token" });
    });
};
