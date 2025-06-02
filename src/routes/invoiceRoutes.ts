import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { 
  createInvoiceHandler, 
  listInvoicesHandler,
  getInvoiceByIdHandler,
  getInvoicePdf
} from "../controllers/invoiceController";
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


router.get("/", asyncHandler(listInvoicesHandler));
router.post("/", asyncHandler(createInvoiceHandler));
router.get("/:id", asyncHandler(getInvoiceByIdHandler));
router.get("/pdf", asyncHandler(getInvoicePdf));

export default router;