import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { 
  getInvoicesSumByUserIdHandler,
  getInvoicesSumByBranchIdHandler,
  getInvoicesSumsByBranchUsersHandler
} from "../controllers/chartsController";
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

router.get("/userSums", asyncHandler(getInvoicesSumByUserIdHandler));
router.get("/branchSums", asyncHandler(getInvoicesSumByBranchIdHandler));
router.get("/branchUsersSums", asyncHandler(getInvoicesSumsByBranchUsersHandler));

export default router;