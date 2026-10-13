export type RepairGuideFamily = 'PlayStation' | 'Nintendo' | 'Xbox' | 'Sega' | 'Steam Deck';

export type RepairGuide = {
  slug: string;
  title: string;
  description: string;
  family: RepairGuideFamily;
  model: string;
  difficulty: string;
  introduction: string;
  symptoms: string[];
  tools: string[];
  steps: {title: string; body: string}[];
  checks: string[];
  stop: string[];
  examples: {title: string; body: string}[];
  faq: {question: string; answer: string}[];
  sources: {title: string; url: string}[];
};
