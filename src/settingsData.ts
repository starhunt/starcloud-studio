import { NanoBananaCloudSettings, SlidePromptType, SlidePromptConfig, SlideOutputFormat } from './types';

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
  imageModel: 'gemini-3-pro-image-preview',
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
  embedSize: 'medium',
  showTitleInEmbed: false,

  // UX
  showPreviewBeforeGeneration: true,
  showProgressModal: true,
  autoRetryCount: 2,
  customPromptPrefix: '',

  // Slide Generation
  slidesRootPath: '999-Slides',
  defaultSlidePromptType: 'notebooklm-summary',
  customSlidePrompts: [],
  showSlidePreviewBeforeGeneration: true,
  defaultSlideOutputFormat: 'html' as SlideOutputFormat,

  // Git Integration for Slides
  gitEnabled: false,
  gitRepoPath: '',
  gitBranch: 'main',
  githubToken: '',
  githubPagesUrl: '',
  autoCommitPush: false
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

// Slide Generation Prompts
export const BUILTIN_SLIDE_PROMPTS: Record<SlidePromptType, SlidePromptConfig> = {
  'notebooklm-summary': {
    id: 'notebooklm-summary',
    name: 'NotebookLM Summary',
    description: 'Generate scroll-based interactive HTML infographic slides',
    prompt: `당신은 복잡한 기술 문서를 시각적으로 매력적이고 이해하기 쉬운 스크롤형 인터랙티브 인포그래픽 슬라이드로 변환하는 전문가입니다.

주어진 콘텐츠를 분석하여 최소 15페이지 이상의 고품질 스크롤형 인터랙티브 인포그래픽 슬라이드를 생성하세요.

구조:
1. 타이틀 섹션 (1페이지)
2. 개요 섹션 (1페이지)
3. 핵심 개념 소개 (2-3페이지)
4. 주요 내용 전개 (4-5페이지)
5. 심층분석 파트 (4-8페이지)
6. 종합 정리 및 시사점 (1페이지)

기술적 요구사항:
- 단일 HTML 파일로 출력
- Chart.js 사용 가능
- Intersection Observer를 활용한 스크롤 애니메이션
- 다크/라이트 모드 지원
- 반응형 디자인`,
    isBuiltIn: true
  },
  'custom': {
    id: 'custom',
    name: 'Custom prompt',
    description: 'Use your own custom prompt',
    prompt: '',
    isBuiltIn: true
  }
};

// PPTX Generation System Prompt
export const PPTX_SYSTEM_PROMPT = `당신은 프레젠테이션 전문가입니다. 주어진 콘텐츠를 분석하여 PowerPoint 슬라이드용 구조화된 JSON 데이터를 생성합니다.

반드시 다음 JSON 형식으로만 응답하세요:
{
  "title": "프레젠테이션 제목",
  "author": "작성자 (선택사항)",
  "slides": [
    { "type": "title", "title": "메인 제목", "subtitle": "부제목" },
    { "type": "content", "title": "슬라이드 제목", "bullets": ["포인트 1", "포인트 2", "포인트 3"], "notes": "발표자 노트" },
    { "type": "two-column", "title": "비교", "leftColumn": { "header": "장점", "items": ["항목1", "항목2"] }, "rightColumn": { "header": "단점", "items": ["항목1", "항목2"] } },
    { "type": "section", "title": "섹션 제목", "subtitle": "섹션 설명" },
    { "type": "quote", "quote": "인용문 내용", "author": "인용 출처" }
  ]
}

지원되는 슬라이드 타입:
1. title: 제목 슬라이드 (title, subtitle)
2. content: 본문 슬라이드 (title, bullets, notes)
3. two-column: 2단 비교 슬라이드 (title, leftColumn, rightColumn)
4. section: 섹션 구분 슬라이드 (title, subtitle)
5. quote: 인용문 슬라이드 (quote, author)

규칙:
- 최소 10장 이상의 슬라이드를 생성하세요
- 첫 번째 슬라이드는 반드시 "title" 타입이어야 합니다
- 한 슬라이드당 bullet은 3-5개가 적절합니다
- 주요 섹션 전환 시 "section" 타입을 사용하세요
- 중요한 인사이트는 "quote" 타입으로 강조하세요
- 비교가 필요한 내용은 "two-column" 타입을 활용하세요
- JSON 형식 외 다른 텍스트를 출력하지 마세요
- 마크다운 코드블록 없이 순수 JSON만 출력하세요`;
