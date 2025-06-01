import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { 
  createBranchHandler, 
  listBranchesHandler, 
  updateBranchHandler, 
  deleteBranchHandler 
} from "../controllers/branchController";
import { authenticateToken } from "../middleware/auth";

const router = Router();

// Helper to wrap async route handlers with proper error handling
const asyncHandler = <P, ResBody, ReqBody, ReqQuery>(
  fn: (req: Request<P, ResBody, ReqBody, ReqQuery>, res: Response<ResBody>, next: NextFunction) => Promise<void>
): RequestHandler<P, ResBody, ReqBody, ReqQuery> => 
  (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };


// Apply authentication middleware to all following routes
router.use(authenticateToken as RequestHandler);


router.get("/", asyncHandler(listBranchesHandler));
router.post("/", asyncHandler(createBranchHandler));
router.put("/:id", asyncHandler(updateBranchHandler));
router.delete("/:id", asyncHandler(deleteBranchHandler));

export default router;