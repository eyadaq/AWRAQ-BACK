import express, { Express, Request, Response, NextFunction } from "express";
import bodyParser from "body-parser";
import { createUserHandler } from "./routes/users";

const app: Express = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());

// Routes
app.post("/api/users", (req: Request, res: Response, next: NextFunction) => {
  createUserHandler(req, res).catch(next);
});

// Error handling middleware
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
