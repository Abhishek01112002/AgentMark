// import { Response } from 'express';
// import prisma from '../../db';
// import { AuthRequest } from '../../middlewares/auth';

// export const getResearchData = async (req: AuthRequest, res: Response): Promise<void> => {
//   try {
//     const { type } = req.query;
//     const where: any = { userId: req.userId };
//     if (type) where.type = type;
//     const data = await prisma.researchData.findMany({
//       where,
//       orderBy: { createdAt: 'desc' },
//     });
//     const trends = data.filter((d: { type: string }) => d.type === 'trend');
//     const competitors = data.filter((d: { type: string }) => d.type === 'competitor');
//     const audiences = data.filter((d: { type: string }) => d.type === 'audience');
//     const keywords = data.filter((d: { type: string }) => d.type === 'keyword');
//     if (data.length === 0) {
//       res.json({
//         data: {
//           trends: [
//             { id: 'mock-1', title: 'AI Automation Integration', content: 'High adoption in enterprise workflows reducing operational drag.' },
//             { id: 'mock-2', title: 'Zero-Party Data Collection', content: 'Shift towards direct consumer engagement for privacy compliance.' },
//             { id: 'mock-3', title: 'Hyper-Personalization', content: 'Dynamic content generation based on real-time user behavior.' },
//           ],
//           competitors: [
//             { id: 'mock-4', title: 'Globex', content: 'Enterprise all-in-one solution. High trust, complex onboarding. Weakness: Slow feature velocity, outdated UI, expensive entry tier.' },
//             { id: 'mock-5', title: 'Acme Corp', content: 'AI-first, niche focus. Fast growth, aggressive pricing. Weakness: Shallow integrations, buggy core features, poor support.' },
//           ],
//           audience: {
//             painPoints: ['Time scarcity', 'Data silos', 'Inconsistent ROI'],
//             motivations: ['Workflow automation', 'Predictable growth'],
//             preferredChannels: ['LinkedIn', 'Email', 'Twitter'],
//             languageStyle: 'Professional, data-driven, concise, focusing on outcomes and efficiency.',
//           },
//           keywords: ['marketing automation', 'ai tools', 'b2b lead gen', 'email sequences', 'predictive analytics', 'crm integration', 'growth hacking', 'content roi'],
//         },
//       });
//       return;
//     }
//     res.json({ data: { trends, competitors, audiences, keywords } });
//   } catch (error) {
//     console.error('Get research data error:', error);
//     res.status(500).json({ message: 'Internal server error.' });
//   }
// };
