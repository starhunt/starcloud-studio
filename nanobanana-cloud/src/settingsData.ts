import { NanoBananaCloudSettings } from './types';

export const DEFAULT_SETTINGS: NanoBananaCloudSettings = {
  // AI API Keys
  googleApiKey: '',
  openaiApiKey: '',
  anthropicApiKey: '',
  xaiApiKey: '',
  glmApiKey: '',

  // Google Drive OAuth
  googleClientId: '',
  googleClientSecret: '',
  googleAccessToken: '',
  googleRefreshToken: '',
  tokenExpiresAt: 0,

  // Prompt Generation
  selectedProvider: 'google',
  promptModel: 'gemini-2.0-flash',

  // Input Source
  defaultInputSource: 'fullNote',

  // Image Generation
  imageModel: 'gemini-2.0-flash-exp',
  imageStyle: 'infographic',
  infographicSubStyle: 'general',
  imageSize: '4K',
  preferredLanguage: 'ko',
  cartoonCuts: '4',
  customCartoonCuts: 4,

  // Google Drive
  driveFolder: 'Obsidian/NanoBananaCloud',
  organizeFoldersByDate: true,

  // Embedding
  embedSize: 'large',
  showTitleInEmbed: false,

  // UX
  showPreviewBeforeGeneration: true,
  showProgressModal: true,
  autoRetryCount: 2,
  customPromptPrefix: ''
};

// System prompt for generating image prompts
export const SYSTEM_PROMPT = `You are an expert visual designer who creates detailed image generation prompts.
Your task is to analyze the given content and create a comprehensive, detailed prompt for generating a visually stunning infographic or poster.

Guidelines:
1. Extract the key concepts, data points, and relationships from the content
2. Design a clear visual hierarchy and information flow
3. Suggest specific visual elements (icons, charts, illustrations)
4. Include color palette recommendations
5. Specify typography styles and layout structure
6. Make the design informative yet visually engaging

Output a single, detailed prompt that can be used directly for image generation.
The prompt should be specific enough to generate a high-quality, professional infographic.`;

// Template for image generation
export const IMAGE_GENERATION_PROMPT_TEMPLATE = `Create a visually stunning {style} based on the following content.

Design Requirements:
- Professional, modern design with clear visual hierarchy
- High contrast and readable typography
- Balanced composition with proper spacing
- Engaging visual elements that support the content

Content to visualize:
{prompt}`;
