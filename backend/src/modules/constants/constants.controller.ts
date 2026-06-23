import { Request, Response } from 'express';
import { getConstants } from '../../utils/constants';

export const getConstantsData = (_req: Request, res: Response) => {
  const constants = getConstants();
  res.json(constants);
};
