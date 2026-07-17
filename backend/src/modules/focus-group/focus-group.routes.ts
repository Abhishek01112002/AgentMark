import { Router } from 'express';
import { authMiddleware } from '../../middlewares/auth.middleware';
import axios from 'axios';
import prisma from '../../db';

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

/**
 * POST /api/focus-group/simulate
 * Proxies the request to the Python AI service to execute the focus group critiques.
 */
router.post('/simulate', async (req, res, next) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/focus-group/simulate`,
      req.body,
      {
        headers: getHeaders(),
        timeout: 90000, // Fix #14: increased from 45s to 90s to cover retry scenarios
      }
    );

    // Save the simulation report to Postgres in the campaign's aiOutputs column
    const campaignId = req.body.campaign_id;
    const copyText = req.body.copy_text || '';
    if (campaignId && copyText) {
      try {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
        if (campaign) {
          const currentOutputs = campaign.aiOutputs
            ? (typeof campaign.aiOutputs === 'string'
              ? JSON.parse(campaign.aiOutputs)
              : campaign.aiOutputs) as Record<string, any>
            : {};
          
          // Compute simple hash
          let hashNum = 0;
          for (let i = 0; i < copyText.length; i++) {
            const chr = copyText.charCodeAt(i);
            hashNum = ((hashNum << 5) - hashNum) + chr;
            hashNum |= 0;
          }
          const hashKey = 'h_' + Math.abs(hashNum).toString(36);

          const currentOutputsMap = currentOutputs.focus_group_outputs || {};
          const updatedOutputsMap = {
            ...currentOutputsMap,
            [hashKey]: response.data
          };

          const updatedOutputs = {
            ...currentOutputs,
            focus_group_output: response.data, // Fallback active report
            focus_group_output_hash: hashKey,
            focus_group_outputs: updatedOutputsMap
          };

          await prisma.campaign.update({
            where: { id: campaignId },
            data: { aiOutputs: updatedOutputs },
          });
          console.log(`[FocusGroupProxy] Successfully persisted focus group report under hash ${hashKey} to DB for campaign: ${campaignId}`);
        }
      } catch (dbErr: any) {
        console.error('[FocusGroupProxy] Failed to save simulation report to DB:', dbErr.message);
      }
    }

    // Forward the simulation results and any custom headers
    if (response.headers['x-simulation-cost-estimate']) {
      res.setHeader('X-Simulation-Cost-Estimate', response.headers['x-simulation-cost-estimate']);
    }
    res.json(response.data);
  } catch (err: any) {
    console.error('[FocusGroupProxy] Simulation request failed:', err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      next(err);
    }
  }
});

/**
 * POST /api/focus-group/interview
 * Proxies the custom question query to the Python AI service for deterministic panel responses.
 */
router.post('/interview', async (req, res, next) => {
  try {
    const response = await axios.post(
      `${AI_SERVICE_URL}/focus-group/interview`,
      req.body,
      {
        headers: getHeaders(),
        timeout: 35000, // 35 seconds timeout
      }
    );

    // Fix #8: Persist interview Q&A to DB under aiOutputs.focus_group_interviews[]
    const campaignId = req.body.campaign_id;
    const question = req.body.question || '';
    if (campaignId && question) {
      try {
        const campaign = await prisma.campaign.findUnique({ where: { id: campaignId } });
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
          console.log(`[FocusGroupProxy] Persisted interview Q&A to DB for campaign: ${campaignId}`);
        }
      } catch (dbErr: any) {
        console.error('[FocusGroupProxy] Failed to save interview to DB:', dbErr.message);
      }
    }

    res.json(response.data);
  } catch (err: any) {
    console.error('[FocusGroupProxy] Interview request failed:', err.message);
    if (err.response) {
      res.status(err.response.status).json(err.response.data);
    } else {
      next(err);
    }
  }
});

export default router;
