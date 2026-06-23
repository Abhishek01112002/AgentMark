import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createProject, getProjects, getProject, deleteProject, getDashboardStats } from './project.controller';

const router = Router();

router.use(authMiddleware);

router.get('/stats/dashboard', getDashboardStats);
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.delete('/:id', deleteProject);

export default router;
