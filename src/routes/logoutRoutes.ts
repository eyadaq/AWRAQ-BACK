import { Router } from 'express';
import { logoutHandler } from '../controllers/logoutController';

const router = Router();
// POST /api/logout

router.post('/', logoutHandler);

export default router;
