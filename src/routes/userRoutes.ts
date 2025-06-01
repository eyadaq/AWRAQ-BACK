import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { 
  createUserHandler, 
  deleteUserHandler, 
  listUsersHandler, 
  updateUserHandler 
} from "../controllers/userController";
import { authenticateToken, requireAdmin } from "../middleware/auth";

const router = Router();

// Helper to wrap async route handlers with proper error handling
const asyncHandler = <P, ResBody, ReqBody, ReqQuery>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<void>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => 
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Apply authentication middleware to all routes
router.use(authenticateToken as RequestHandler);

// Admin-only routes
router.post(
  "/", 
  requireAdmin as RequestHandler,
  asyncHandler(createUserHandler)
);

// Protected routes (require authentication)
router.get(
  "/", 
  asyncHandler(listUsersHandler)
);

router.put(
  "/:uid", 
  asyncHandler(updateUserHandler)
);

router.delete(
  "/:uid", 
  asyncHandler<{ uid: string }, any, any, any>(deleteUserHandler)
);

export default router;