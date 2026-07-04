import { Request, Response, NextFunction } from 'express';

export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);
  const status = err.status || 500;
  const isSafeError = err.status && err.status < 500;

  res.status(status).json({
    error: isSafeError ? err.message : 'Internal server error',
  });
};
