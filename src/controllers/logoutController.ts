import { Response } from 'express';
import { auth } from '../config/firebase-client';
import { AuthenticatedRequest } from '../utils/interfaces';


export const logoutHandler = async (
  req: AuthenticatedRequest,
  res: Response
): Promise<void> => {
  try {
    const requester = req.user;
    if (!requester) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }

    // Revoke all refresh tokens for the user.
    // This will invalidate the user's current session eventually.
    await auth.revokeRefreshTokens(requester.uid);

    res.status(200).json({ message: "Logout successful" });
  } catch (error: any) {
    console.error("Logout error:", error);
    res.status(500).json({ error: error.message });
  }
};
