const constants = {
  industries: [
    { value: 'saas', label: 'SaaS & Technology' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'finance', label: 'Finance & Fintech' },
    { value: 'edtech', label: 'EdTech & Education' },
    { value: 'real_estate', label: 'Real Estate & Property' },
    { value: 'other', label: 'Other (Specify)' },
  ],
  
  primaryGoals: [
    { value: 'awareness', label: 'Brand Awareness' },
    { value: 'lead_gen', label: 'Lead Generation' },
    { value: 'sales', label: 'Sales' },
    { value: 'engagement', label: 'User Engagement' },
    { value: 'retention', label: 'Customer Retention' },
    { value: 'other', label: 'Other (Specify)' },
  ],
  
  brandVoices: [
    { value: 'professional', label: 'Professional' },
    { value: 'friendly', label: 'Friendly' },
    { value: 'bold', label: 'Bold' },
    { value: 'luxury', label: 'Luxury' },
    { value: 'casual', label: 'Casual' },
    { value: 'inspirational', label: 'Inspirational' },
    { value: 'empathetic', label: 'Empathetic' },
    { value: 'trustworthy', label: 'Trustworthy' },
    { value: 'other', label: 'Other (Specify)' },
  ],
  featureFlags: {
    creativeHookMatrix: process.env.ENABLE_CREATIVE_HOOK_MATRIX !== 'false' && process.env.ENABLE_CREATIVE_HOOK_MATRIX !== '0',
  },
};

export const getConstants = () => constants;
