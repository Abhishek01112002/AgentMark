import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import { createProject, getProjects, getProject, updateProject, deleteProject, getDashboardStats, getMemoryStatus, updateClientMemory, clearClientMemory, synthesizeBrandMemory } from './project.controller';

const router = Router();

router.use(authMiddleware);

router.get('/stats/dashboard', getDashboardStats);
router.post('/', createProject);
router.get('/', getProjects);
router.get('/:id', getProject);
router.get('/:id/memory-status', getMemoryStatus);
router.post('/:id/memory', updateClientMemory);
router.post('/memory/update', updateClientMemory);
router.post('/:id/memory/synthesize', synthesizeBrandMemory);
router.post('/memory/synthesize', synthesizeBrandMemory);
router.post('/:id/memory/clear', clearClientMemory);
router.delete('/:id/memory', clearClientMemory);
router.patch('/:id', updateProject);
router.delete('/:id', deleteProject);

export default router;
