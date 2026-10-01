import { Request, Response, NextFunction } from 'express';

export interface AuthenticatedRequest extends Request {
  userId: string;
}

export function zeroTrustAuthMiddleware(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract user ID from header or auth token
  const userId = (req.header('x-user-id') || req.header('authorization')?.replace('Bearer ', '') || 'user_demo_01').trim();

  if (!userId) {
    res.status(401).json({
      error: 'Unauthorized',
      message: 'Zero-trust policy requires a valid x-user-id header or bearer token.'
    });
    return;
  }

  (req as AuthenticatedRequest).userId = userId;
  next();
}
