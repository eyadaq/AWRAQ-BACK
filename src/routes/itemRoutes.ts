import { Router, RequestHandler, Request, Response, NextFunction } from "express";
import { 
  listItemesHandler, 
  createItemHandler,
  getItemByIdHandler,
  deleteItemHandler,
  updateItemHandler
} from "../controllers/itemController";
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


router.get("/", asyncHandler(listItemesHandler));
router.post("/", asyncHandler(createItemHandler));
router.get("/:id", asyncHandler(getItemByIdHandler));
router.put('/:id', asyncHandler(updateItemHandler));
router.delete("/:id", asyncHandler(deleteItemHandler));

export default router;