import { Router, Response, NextFunction } from 'express';
import logger from '../../utils/logger';
import { authMiddleware, AuthRequest } from '../../middlewares/auth.middleware';
import axios from 'axios';
import prisma from '../../db';
import fs from 'fs';
import path from 'path';
import { getIO } from '../campaigns/campaign.controller';

const router = Router();
const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://127.0.0.1:5002';

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };
  if (process.env.INTERNAL_SERVICE_SECRET) {
    headers['X-Internal-Secret'] = process.env.INTERNAL_SERVICE_SECRET;
  }
  return headers;
};

// Protect all focus group simulation endpoints with authMiddleware
router.use(authMiddleware);

let activeSimulations = 0;
const MAX_CONCURRENT_SIMULATIONS = parseInt(process.env.MAX_CONCURRENT_SIMULATIONS || '20', 10);

/**
 * POST /api/focus-group/simulate
 * Proxies the request to the Python AI service to execute the focus group critiques.
 */
router.post('/simulate', async (req: AuthRequest, res, next) => {
  const campaignId = req.body.campaign_id;
  if (!campaignId || typeof campaignId !== 'string') {
    res.status(400).json({ error: 'campaign_id is required' });
    return;
  }

  if (activeSimulations >= MAX_CONCURRENT_SIMULATIONS) {
    res.status(429).json({ error: 'Server busy: Too many concurrent focus group simulations are running. Please retry in a few seconds.' });
    return;
  }

  activeSimulations++;
  try {
    // Secure Check: Campaign must exist and belong to the authenticated user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { project: { select: { userId: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/focus-group/simulate`,
      req.body,
      {
        headers: getHeaders(),
        timeout: 300000, // Increased to 300s (5m) for heavy multi-agent focus group simulations and failovers
      }
    );

    // Save the simulation report to Postgres in the campaign's aiOutputs column
    const copyText = req.body.copy_text || '';
    if (copyText) {
      try {
        if (campaign) {
          const currentOutputs = campaign.aiOutputs
            ? (typeof campaign.aiOutputs === 'string'
              ? JSON.parse(campaign.aiOutputs)
              : campaign.aiOutputs) as Record<string, any>
            : {};
          
          // Normalize Unicode (NFC) and Unix newlines (\n) to ensure identical hash matching
          const normalizedCopy = copyText.normalize('NFC').replace(/\r\n/g, '\n').replace(/\r/g, '\n');

          // Compute simple hash
          let hashNum = 0;
          for (let i = 0; i < normalizedCopy.length; i++) {
            const chr = normalizedCopy.charCodeAt(i);
            hashNum = ((hashNum << 5) - hashNum) + chr;
            hashNum |= 0;
          }
          const hashKey = 'h_' + Math.abs(hashNum).toString(36);

          const currentOutputsMap = currentOutputs.focus_group_outputs || {};
          const updatedOutputsMap = {
            ...currentOutputsMap,
            [hashKey]: response.data
          };

          const rawScore = response.data?.overall_score;
          const fgScore = rawScore != null && !isNaN(Number(rawScore)) ? Math.round(Number(rawScore)) : null;

          let updatedVersions = (currentOutputs.copy_versions as any[]) || [];
          if (fgScore != null) {
            if (updatedVersions.length > 0) {
              const lastIdx = updatedVersions.length - 1;
              updatedVersions = [
                ...updatedVersions.slice(0, lastIdx),
                {
                  ...updatedVersions[lastIdx],
                  focus_group_score: fgScore,
                }
              ];
            } else if (currentOutputs.copy_output) {
              updatedVersions = [{
                version: 1,
                timestamp: new Date().toISOString(),
                copy: currentOutputs.copy_output,
                focus_group_score: fgScore,
                copy_score: null,
                feedback_used: 'Initial Version',
              }];
            }
          }

          const updatedOutputs = {
            ...currentOutputs,
            focus_group_output: response.data, // Fallback active report
            focus_group_output_hash: hashKey,
            focus_group_outputs: updatedOutputsMap,
            copy_versions: updatedVersions,
          };

          await prisma.campaign.update({
            where: { id: campaignId },
            data: { aiOutputs: updatedOutputs },
          });
          logger.info(`[FocusGroupProxy] Successfully persisted focus group report under hash ${hashKey} to DB for campaign: ${campaignId}`);

          // Emit real-time socket events so the frontend updates instantly
          const io = getIO();
          if (io) {
            const eventPayload = {
              campaignId,
              report: response.data,
              hashKey,
              score: response.data?.overall_score ?? null,
              timestamp: new Date().toISOString(),
            };
            io.to(`campaign:${campaignId}`).emit('focus_group_complete', eventPayload);
            io.to(`campaign:${campaignId}`).emit('campaign_data_updated', {
              campaignId,
              updatedField: 'focus_group',
              timestamp: new Date().toISOString(),
            });
          }
        }
      } catch (dbErr: any) {
        logger.error('[FocusGroupProxy] Failed to save simulation report to DB:', dbErr.message);
      }
    }

    // Forward the simulation results and any custom headers
    if (response.headers['x-simulation-cost-estimate']) {
      res.setHeader('X-Simulation-Cost-Estimate', response.headers['x-simulation-cost-estimate']);
    }
    res.json(response.data);
  } catch (err: any) {
    logger.error('[FocusGroupProxy] Simulation request failed:', err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      next(err);
    }
  } finally {
    activeSimulations--;
  }
});

/**
 * POST /api/focus-group/interview
 * Proxies the custom question query to the Python AI service for deterministic panel responses.
 */
router.post('/interview', async (req: AuthRequest, res, next) => {
  try {
    const campaignId = req.body.campaign_id;
    if (!campaignId || typeof campaignId !== 'string') {
      res.status(400).json({ error: 'campaign_id is required' });
      return;
    }

    // Secure Check: Campaign must exist and belong to the authenticated user
    const campaign = await prisma.campaign.findUnique({
      where: { id: campaignId },
      include: { project: { select: { userId: true } } },
    });

    if (!campaign) {
      res.status(404).json({ error: 'Campaign not found' });
      return;
    }
    if (campaign.project.userId !== req.userId) {
      res.status(403).json({ error: 'Access denied' });
      return;
    }

    const response = await axios.post(
      `${AI_SERVICE_URL}/focus-group/interview`,
      req.body,
      {
        headers: getHeaders(),
        timeout: 60000, // Increased to 60s for interviews
      }
    );

    // Fix #8: Persist interview Q&A to DB under aiOutputs.focus_group_interviews[]
    const question = req.body.question || '';
    if (question) {
      try {
        if (campaign) {
          const currentOutputs = campaign.aiOutputs
            ? (typeof campaign.aiOutputs === 'string'
              ? JSON.parse(campaign.aiOutputs)
              : campaign.aiOutputs) as Record<string, any>
            : {};

          const existingInterviews: any[] = currentOutputs.focus_group_interviews || [];
          const newEntry = {
            timestamp: new Date().toISOString(),
            question,
            answers: response.data.answers || [],
          };
          // Keep last 20 interview sessions to avoid unbounded growth
          const updatedInterviews = [...existingInterviews, newEntry].slice(-20);

          await prisma.campaign.update({
            where: { id: campaignId },
            data: {
              aiOutputs: {
                ...currentOutputs,
                focus_group_interviews: updatedInterviews,
              },
            },
          });
          logger.info(`[FocusGroupProxy] Persisted interview Q&A to DB for campaign: ${campaignId}`);
        }
      } catch (dbErr: any) {
        logger.error('[FocusGroupProxy] Failed to save interview to DB:', dbErr.message);
      }
    }

    res.json(response.data);
  } catch (err: any) {
    logger.error('[FocusGroupProxy] Interview request failed:', err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      next(err);
    }
  }
});

/**
 * GET /api/focus-group/personas
 * Returns unique focus group personas used in previous campaigns, or falls back
 * to a high-quality default roster.
 */
router.get('/personas', async (req: AuthRequest, res: Response, next: NextFunction) => {
  try {
    // Attempt to extract simulated personas from recent completed campaigns in PostgreSQL
    const campaigns = await prisma.campaign.findMany({
      where: {
        status: 'completed',
        project: { userId: req.userId! },
      },
      take: 5,
      orderBy: { updatedAt: 'desc' }
    });

    const uniquePersonas: Record<string, any> = {};

    for (const c of campaigns) {
      const outputs = c.aiOutputs as any;
      if (outputs && outputs.focus_group_output && Array.isArray(outputs.focus_group_output.persona_critiques)) {
        for (const crit of outputs.focus_group_output.persona_critiques) {
          const id = crit.persona_id;
          if (id && !uniquePersonas[id]) {
            // Reconstruct a realistic profile matching schema/simulation.py specifications
            const nameParts = id.split('-');
            const age = parseInt(nameParts[1]) || 28;
            const occupation = nameParts.slice(2).join(' ') || 'Professional';
            uniquePersonas[id] = {
              id,
              name: nameParts[0].charAt(0).toUpperCase() + nameParts[0].slice(1),
              age,
              occupation: occupation.charAt(0).toUpperCase() + occupation.slice(1),
              description: crit.verdict || `Objection: ${crit.objection}`
            };
          }
        }
      }
    }

    let personasList = Object.values(uniquePersonas);

    // Fallback to default high-quality consumer personas if no simulations have been run yet
    if (personasList.length === 0) {
      try {
        const sharedJsonPath = path.resolve(process.cwd(), '../default_personas.json');
        if (fs.existsSync(sharedJsonPath)) {
          const rawData = fs.readFileSync(sharedJsonPath, 'utf-8');
          personasList = JSON.parse(rawData);
        }
      } catch (err: any) {
        logger.error('[FocusGroupRoutes] Failed to read default_personas.json:', err.message);
      }
    }

    res.json({ personas: personasList });
  } catch (error: any) {
    next(error);
  }
});

export default router;
