import 'dotenv/config';
import express, { Express, Request, Response, NextFunction, Router, RequestHandler } from "express";
import bodyParser from "body-parser";
import userRoutes from "./routes/userRoutes";
import branchRoutes from "./routes/branchRoutes";
import itemRoutes from "./routes/itemRoutes";
import invoiceRoutes from "./routes/invoiceRoutes";
import authRoutes from "./routes/authRoutes";
import { authenticateToken } from "./middleware/auth";
import './config/firebase-admin'; // Initialize Firebase Admin SDK
import cors from 'cors';

const app: Express = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(bodyParser.json());

app.use(cors({
  origin: 'http://localhost:3000', // Change this to your frontend URL in prod
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true, // Optional: only needed if you're using cookies or auth headers
}));

// Public routes (no authentication required)
app.use("/api/auth", authRoutes); // Login route is public

// Protected routes (require authentication)
const apiRouter = Router();
apiRouter.use(authenticateToken as RequestHandler);

// Mount all API routes under /api with authentication
apiRouter.use("/users", userRoutes);
apiRouter.use("/branches", branchRoutes);
apiRouter.use("/items", itemRoutes);
apiRouter.use("/invoices", invoiceRoutes);

// Mount the protected API router
app.use("/api", apiRouter);

// Public health check endpoint
app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({ status: "ok" });
});

// 404 handler
app.use((_req: Request, res: Response) => {
  res.status(404).json({ error: "Not Found" });
});

// Error handling middleware
app.use((err: unknown, _req: Request, res: Response, _next: NextFunction) => {
  console.error("Error:", err);
  
  // Handle Firebase Auth errors
  if (err && typeof err === 'object' && 'code' in err && 
      typeof err.code === 'string' && err.code.startsWith('auth/')) {
    res.status(401).json({ 
      error: 'Authentication failed',
      details: process.env.NODE_ENV === 'development' && 'message' in err 
        ? String(err.message) 
        : undefined
    });
    return;
  }
  
  const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred';
  res.status(500).json({ 
    error: "Internal Server Error",
    ...(process.env.NODE_ENV === 'development' && { details: errorMessage })
  });
});

// Start server
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});

// Handle unhandled promise rejections
process.on("unhandledRejection", (err: Error) => {
  console.error("Unhandled Rejection:", err);
  server.close(() => process.exit(1));
});
