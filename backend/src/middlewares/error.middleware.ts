import { Request, Response, NextFunction } from 'express';
import logger from '../utils/logger';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Guard: if response headers are already sent (e.g. post-res.json() code threw),
  // delegate to Express's default error handler to avoid ERR_HTTP_HEADERS_SENT crash.
  if (res.headersSent) {
    return next(err);
  }

  logger.error('Unhandled error:', err);
  const status = err.status || 500;
  const isSafeError = err.status && err.status < 500;

  res.status(status).json({
    error: isSafeError ? err.message : 'Internal server error',
  });
};
