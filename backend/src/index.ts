import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './modules/auth/auth.routes';
import projectRoutes from './modules/projects/project.routes';
import campaignRoutes from './modules/campaigns/campaign.routes';
import constantsRoutes from './modules/constants/constants.routes';
import imagekitRoutes from './modules/imagekit/imagekit.routes';
import notificationRoutes from './modules/notifications/notification.routes';
import { errorHandler } from './middlewares/error.middleware';
import prisma from './db';
import { notificationService } from './modules/notifications/notification.service';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

app.use(cors());
app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'AgentMark API is running' });
});

app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/campaigns', campaignRoutes);
app.use('/api/constants', constantsRoutes);
app.use('/api/imagekit', imagekitRoutes);
app.use('/api/notifications', notificationRoutes);

app.use(errorHandler);

const ensureAvatarColumn = async () => {
  try {
    await prisma.$executeRawUnsafe('ALTER TABLE "users" ADD COLUMN IF NOT EXISTS "avatarUrl" TEXT');
  } catch (error) {
    console.warn('Unable to ensure users.avatarUrl column exists:', error);
  }
};

const startServer = async () => {
  await ensureAvatarColumn();
  await notificationService.ensureTable();
  app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
  });
};

void startServer();
