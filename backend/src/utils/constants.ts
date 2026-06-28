const constants = {
  industries: [
    { value: 'saas', label: 'SaaS & Technology' },
    { value: 'ecommerce', label: 'E-Commerce' },
    { value: 'finance', label: 'Finance & Fintech' },
    { value: 'healthcare', label: 'Healthcare' },
    { value: 'other', label: 'Other (Specify)' },
  ],
  
  primaryGoals: [
    { value: 'awareness', label: 'Brand Awareness' },
    { value: 'lead_gen', label: 'Lead Generation' },
    { value: 'sales', label: 'Direct Sales' },
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
};

export const getConstants = () => constants;
