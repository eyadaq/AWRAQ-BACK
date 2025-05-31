import { Request } from 'express';

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

export {};
