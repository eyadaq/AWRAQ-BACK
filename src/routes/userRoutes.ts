import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { 
  createUserHandler, 
  deleteUserHandler, 
  listUsersHandler, 
  updateUserHandler 
} from "../controllers/userController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Helper to wrap async route handlers with proper error handling
const asyncHandler = <P, ResBody, ReqBody, ReqQuery>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<void>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => 
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };

// Public routes (no authentication required)
router.post(
  "/", 
  asyncHandler(createUserHandler)
);

// Apply authentication middleware to all following routes
router.use(authenticateToken as RequestHandler);

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
