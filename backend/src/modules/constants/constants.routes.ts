import { Router } from 'express';
import { getConstantsData } from './constants.controller';

const router = Router();

router.get('/', getConstantsData);

export default router;
