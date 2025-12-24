// ============================================================
// AI Provider Types
// ============================================================

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai' | 'glm';

export interface ProviderConfig {
  name: string;
  endpoint: string;
  defaultModel: string;
  suggestedModels: string; // Comma-separated list of suggested models for display
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    suggestedModels: 'gpt-4o, gpt-4o-mini, gpt-4-turbo, gpt-3.5-turbo'
  },
  google: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash',
    suggestedModels: 'gemini-2.0-flash, gemini-2.5-flash, gemini-2.0-flash-exp, gemini-1.5-pro, gemini-1.5-flash'
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    suggestedModels: 'claude-sonnet-4-20250514, claude-3-5-sonnet-20241022, claude-3-haiku-20240307'
  },
  xai: {
    name: 'xAI',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-4-1-fast',
    suggestedModels: 'grok-4-1-fast, grok-beta, grok-2-latest'
  },
  glm: {
    name: 'GLM (z.ai)',
    endpoint: 'https://api.z.ai/api/coding/paas/v4/chat/completions',
    defaultModel: 'glm-4.6',
    suggestedModels: 'glm-4.6, glm-4-flash, glm-4-plus, glm-4-air, glm-4'
  }
};

// Suggested image generation models for display
export const SUGGESTED_IMAGE_MODELS = 'gemini-2.0-flash-exp, gemini-2.0-flash, imagen-3.0-generate-002';

// ============================================================
// Input Source Types
// ============================================================

export type InputSource = 'fullNote' | 'selection' | 'clipboard' | 'custom';

// ============================================================
// Image Style Types
// ============================================================

export type ImageStyle = 'infographic' | 'poster' | 'diagram' | 'mindmap' | 'timeline' | 'cartoon';

export const IMAGE_STYLES: Record<ImageStyle, string> = {
  infographic: 'Modern infographic with icons, charts, and visual hierarchy',
  poster: 'Bold poster design with strong typography and imagery',
  diagram: 'Technical diagram with clear connections and labels',
  mindmap: 'Mind map style with central concept and branches',
  timeline: 'Timeline format showing progression and milestones',
  cartoon: 'Comic strip style with sequential panels telling a visual story'
};

// ============================================================
// Infographic Sub-Style Types
// ============================================================

export type InfographicSubStyle =
  | 'general'
  | 'visualStory'
  | 'tedEd'
  | 'journalism'
  | 'gamification'
  | 'vcPitch';

export interface InfographicSubStyleConfig {
  name: string;
  nameEn: string;
  description: string;
  systemPrompt: string;
}

export const INFOGRAPHIC_SUB_STYLES: Record<InfographicSubStyle, InfographicSubStyleConfig> = {
  general: {
    name: '일반',
    nameEn: 'General',
    description: '기본 인포그래픽 스타일',
    systemPrompt: 'Modern infographic with icons, charts, and visual hierarchy'
  },
  visualStory: {
    name: '비주얼 스토리텔링',
    nameEn: 'Visual Storytelling',
    description: '카드뉴스, SNS 홍보, 대중 강연 자료',
    systemPrompt: `당신은 복잡한 정보를 대중이 이해하기 쉬운 '한 장의 비주얼 인포그래픽'으로 기획하는 전문 비주얼 스토리텔러입니다.

[디자인 지침]
스타일: 손으로 그린 듯한(Sketch Note), 친근하지만 신뢰감 있는 톤앤매너.
구조: 전체 내용을 **Why(배경/문제) -> Who/What(주체/정의) -> How(해결책/작동원리)**의 3단 흐름으로 재구성하세요.
헤드라인: 각 섹션의 제목은 독자의 호기심을 자극하는 **'질문 형태'**로 뽑아주세요. (예: 왜 지금 필요한가?)`
  },
  tedEd: {
    name: 'TED-Ed 교육',
    nameEn: 'TED-Ed Style',
    description: '교육 자료, 튜토리얼, 사내 매뉴얼',
    systemPrompt: `당신은 TED-Ed의 교육 콘텐츠 디자이너입니다. 어려운 개념을 누구나 이해할 수 있는 '친근하고 매력적인 학습 인포그래픽'으로 풀어내세요.

[디자인 지침]
스타일: 일러스트 중심, 밝고 따뜻한 컬러 팔레트(노랑, 청록, 코랄), 둥근 모서리와 유기적 형태.
스토리텔링 구조: "궁금증 유발(Hook) → 개념 설명(Teach) → 실생활 연결(Apply)" 3단계로 구성.
은유와 비유: 추상적 개념은 반드시 일상적 사물이나 상황에 빗대어 설명하세요.
톤앤매너: 친구가 설명해주듯 편안하면서도, 정확한 지식을 전달하는 신뢰감 있는 어조.`
  },
  journalism: {
    name: '저널리즘',
    nameEn: 'Journalism',
    description: '보도자료, 분석 리포트, 연구 결과',
    systemPrompt: `당신은 뉴욕타임스의 데이터 비주얼라이제이션 팀 소속 정보 디자이너입니다. 복잡한 데이터를 대중이 단번에 이해할 수 있는 '설득력 있는 인포그래픽 스토리'로 변환하세요.

[디자인 지침]
스타일: 신문 인포그래픽의 정석. 검은색-회색-강조색(빨강 또는 파랑) 3색 체계. 깔끔한 라인과 그리드 시스템.
데이터 우선: 모든 주장은 반드시 구체적인 수치나 비교 데이터로 뒷받침되어야 합니다.
내러티브 흐름: 독자가 위에서 아래로 읽으며 자연스럽게 "문제 인식 → 데이터 확인 → 통찰 도출"의 여정을 따라가도록 구성하세요.
톤앤매너: 객관적이고 분석적이며, 과장 없이 사실만을 전달하는 권위 있는 어조.`
  },
  gamification: {
    name: '게이미피케이션',
    nameEn: 'Gamification',
    description: '이벤트 안내, 동기부여, 프로세스 설명',
    systemPrompt: `당신은 게임 UI/UX의 대가입니다. 정보 전달을 '레벨업 과정'으로 게이미피케이션하여, 독자가 마치 튜토리얼을 클리어하듯 내용을 흡수하게 만드세요.

[디자인 지침]
스타일: 게임 HUD(Heads-Up Display) 느낌. 진행 바, 배지, 경험치 게이지, 네온 컬러 포인트.
구조: "튜토리얼(기본 개념) → 미션(문제/과제) → 보상(해결책/혜택)" 3단계 진행.
진행도 표시: 독자가 지금 어디까지 왔는지 시각적으로 보여주세요. (예: "1/3 완료")
톤앤매너: 동기부여가 넘치고, 도전적이며, 성취감을 주는 활기찬 어조.`
  },
  vcPitch: {
    name: 'VC 피칭',
    nameEn: 'VC Pitch',
    description: '투자 제안서, 비즈니스 피칭',
    systemPrompt: `당신은 실리콘밸리 최고의 벤처 캐피털(VC) 전문 프레젠테이션 디자이너이자 전략가입니다. 비즈니스 파트너를 단번에 설득할 수 있는 모던하고 세련된 '테크 스타트업 스타일'의 인포그래픽을 구성하세요.

[디자인 지침]
스타일: '애플(Apple)' 키노트나 '토스(Toss)' 앱처럼 극도로 절제된 미니멀리즘과 벤토 그리드(Bento Grid) 레이아웃을 사용합니다.
텍스트 원칙: "Less is More." 모든 문장은 명사형으로 종결하고, 불필요한 수식어를 제거하세요.
시각적 강조: 감성적인 설명 대신, **압도적인 성장률(J-Curve)이나 핵심 지표(Metric)**를 가장 크게 부각시키세요.
톤앤매너: 혁신적이고, 데이터 중심적이며, 확신에 찬 어조를 사용합니다.`
  }
};

// ============================================================
// Image Size Types
// ============================================================

export type ImageSize = '1K' | '2K' | '4K';

export type ImageOrientation = 'horizontal' | 'vertical';

export type CartoonCuts = '4' | '6' | '8' | 'custom';

// ============================================================
// Language Types
// ============================================================

export type PreferredLanguage = 'ko' | 'en' | 'ja' | 'zh' | 'es' | 'fr' | 'de';

export const LANGUAGE_NAMES: Record<PreferredLanguage, string> = {
  ko: '한국어 (Korean)',
  en: 'English',
  ja: '日本語 (Japanese)',
  zh: '中文 (Chinese)',
  es: 'Español (Spanish)',
  fr: 'Français (French)',
  de: 'Deutsch (German)'
};

// ============================================================
// Embed Types
// ============================================================

export type EmbedSize = 'small' | 'medium' | 'large' | 'fullwidth';

export interface EmbedSizeConfig {
  name: string;
  width: string;
}

export const EMBED_SIZES: Record<EmbedSize, EmbedSizeConfig> = {
  small: { name: '400px', width: '400px' },
  medium: { name: '800px', width: '800px' },
  large: { name: '1200px', width: '1200px' },
  fullwidth: { name: '100%', width: '100%' }
};

export interface EmbedPosition {
  type: 'cursor' | 'afterSelection';
  line: number;
}

export interface EmbedOptions {
  size: EmbedSize;
  showTitle: boolean;
}

// ============================================================
// Settings Interface
// ============================================================

export interface StarCloudStudioSettings {
  // AI API Keys
  googleApiKey: string;
  openaiApiKey: string;
  anthropicApiKey: string;
  xaiApiKey: string;
  glmApiKey: string;

  // Google Drive OAuth
  googleClientId: string;
  googleClientSecret: string;
  googleAccessToken: string;
  googleRefreshToken: string;
  tokenExpiresAt: number;

  // Prompt Generation
  selectedProvider: AIProvider;
  promptModel: string;

  // Input Source
  defaultInputSource: InputSource;

  // Image Generation
  imageModel: string;
  imageStyle: ImageStyle;
  infographicSubStyle: InfographicSubStyle;
  imageSize: ImageSize;
  preferredLanguage: PreferredLanguage;
  cartoonCuts: CartoonCuts;
  customCartoonCuts: number;

  // Google Drive
  driveFolder: string;
  organizeFoldersByDate: boolean;

  // Embedding
  embedSize: EmbedSize;
  showTitleInEmbed: boolean;

  // UX
  showPreviewBeforeGeneration: boolean;
  showProgressModal: boolean;
  autoRetryCount: number;
  customPromptPrefix: string;

  // Slide Generation
  slidesRootPath: string;
  defaultSlideOutputFormat: SlideOutputFormat;
  defaultHtmlSlideStyle: HtmlSlideStyle;
  defaultPptxSlideStyle: PptxSlideStyle;
  defaultSlideUploadDestination: SlideUploadDestination;
  customHtmlPrompts: SlidePromptConfig[];
  customPptxPrompts: SlidePromptConfig[];
  showSlidePreviewBeforeGeneration: boolean;

  // Slide AI Provider (separate from default)
  slideProvider: AIProvider;
  slideModel: string;
  slideMaxOutputTokens: number;

  // Git Integration for Slides
  gitEnabled: boolean;
  gitRepoPath: string;
  gitBranch: string;
  githubToken: string;
  githubPagesUrl: string;
  autoCommitPush: boolean;

  // TTS Settings
  ttsProvider: TTSProvider;
  ttsModel: string;
  elevenlabsApiKey: string;
  defaultSpeechTemplate: SpeechTemplate;
  defaultTtsVoice: string;
  defaultTtsVoiceHostA: string;
  defaultTtsVoiceHostB: string;
  targetAudioDuration: number;
  audioOutputFormat: AudioFormat;
  audioVaultFolder: string;
  showSpeechPreview: boolean;

  // Speech Script AI Provider (separate from default)
  speechScriptProvider: AIProvider;
  speechScriptModel: string;
}

// ============================================================
// Progress Types
// ============================================================

export type ProgressStep =
  | 'analyzing'
  | 'generating-prompt'
  | 'preview'
  | 'generating-image'
  | 'generating-slide'
  | 'generating-speech-script'
  | 'generating-audio'
  | 'processing-audio'
  | 'saving'
  | 'uploading'
  | 'embedding'
  | 'complete'
  | 'error';

export interface ProgressState {
  step: ProgressStep;
  progress: number;
  message: string;
  details?: string;
}

// ============================================================
// Error Types
// ============================================================

export type ErrorType =
  | 'INVALID_API_KEY'
  | 'RATE_LIMIT'
  | 'NETWORK_ERROR'
  | 'GENERATION_FAILED'
  | 'CONTENT_FILTERED'
  | 'NO_CONTENT'
  | 'UPLOAD_ERROR'
  | 'SAVE_ERROR'
  | 'OAUTH_ERROR'
  | 'UNKNOWN';

export interface GenerationError {
  type: ErrorType;
  message: string;
  details?: string;
  retryable: boolean;
}

export class GenerationErrorClass extends Error {
  type: ErrorType;
  details?: string;
  retryable: boolean;

  constructor(type: ErrorType, message: string, retryable = false, details?: string) {
    super(message);
    this.name = 'GenerationError';
    this.type = type;
    this.details = details;
    this.retryable = retryable;
  }
}

// ============================================================
// API Response Types
// ============================================================

export interface PromptGenerationResult {
  prompt: string;
  model: string;
  provider: AIProvider;
}

export interface ImageGenerationResult {
  imageData: string; // base64
  mimeType: string;
  model: string;
}

// ============================================================
// Google Drive Types
// ============================================================

export interface OAuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  expiresAt: number;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink: string;
  fileName: string;
  mimeType: string;
}

export interface UploadProgress {
  stage: 'preparing' | 'uploading' | 'setting-permission' | 'complete' | 'error';
  message: string;
  progress: number;
  error?: string;
}

// ============================================================
// Drive Embedder Types
// ============================================================

export type ContentCategory = 'video' | 'document' | 'image' | 'audio';

export interface SizeOption {
  id: string;
  name: string;
  width: string;
  height: string;
  recommended?: boolean;
}

export interface FileTypeInfo {
  category: ContentCategory;
  extension: string;
  mimeType: string;
}

export interface DriveEmbedOptions {
  size: SizeOption;
  showTitle: boolean;
}

export interface UploadModalResult {
  file: File;
  uploadResult: DriveUploadResult;
  embedOptions: DriveEmbedOptions;
}

// ============================================================
// Gemini API Response Types
// ============================================================

export interface GeminiInlineData {
  data: string;
  mime_type?: string;
  mimeType?: string;
}

export interface GeminiPart {
  text?: string;
  inline_data?: GeminiInlineData;
  inlineData?: GeminiInlineData;
}

export interface GeminiContent {
  parts?: GeminiPart[];
  role?: string;
}

export interface GeminiSafetyRating {
  category: string;
  probability: string;
}

export interface GeminiCandidate {
  content?: GeminiContent;
  safetyRatings?: GeminiSafetyRating[];
  finishReason?: string;
}

export interface GeminiApiResponse {
  candidates?: GeminiCandidate[];
  promptFeedback?: {
    safetyRatings?: GeminiSafetyRating[];
  };
}

// ============================================================
// Modal Result Types
// ============================================================

export interface QuickOptionsResult {
  confirmed: boolean;
  inputSource: InputSource;
  customInputText: string; // Custom input text when inputSource is 'custom'
  imageStyle: ImageStyle;
  infographicSubStyle: InfographicSubStyle;
  imageSize: ImageSize;
  imageOrientation: ImageOrientation;
  cartoonCuts: CartoonCuts;
  customCartoonCuts: number;
}

export interface PreviewModalResult {
  confirmed: boolean;
  prompt: string;
  regenerate: boolean;
}

// ============================================================
// Slide Generation Types
// ============================================================

export type SlidePromptType = 'notebooklm-summary' | 'custom';
export type SlideInputSource = 'fullNote' | 'selection' | 'custom';
export type HtmlSlideStyle = 'vertical-scroll' | 'presentation' | 'custom';
export type PptxSlideStyle = 'standard' | 'flexible' | 'custom';
export type SlideUploadDestination = 'none' | 'drive' | 'github';

export interface SlidePromptConfig {
  id: string;
  name: string;
  description: string;
  prompt: string;
  outputFormat: SlideOutputFormat;
  isBuiltIn: boolean;
}

export interface SlideGenerationResult {
  htmlContent: string;
  model: string;
  provider: AIProvider;
  title: string;
}

export interface SlideOptionsResult {
  confirmed: boolean;
  inputSource: SlideInputSource;
  customText: string;
  outputFormat: SlideOutputFormat;
  htmlStyle: HtmlSlideStyle;
  pptxStyle: PptxSlideStyle;
  selectedPrompt: string;
  uploadDestination: SlideUploadDestination;
}

// ============================================================
// PPTX Generation Types
// ============================================================

export type SlideOutputFormat = 'html' | 'pptx';

export type PptxSlideType =
  | 'title'
  | 'agenda'
  | 'section'
  | 'definition'
  | 'concept'
  | 'process'
  | 'comparison'
  | 'chart'
  | 'table'
  | 'case-study'
  | 'key-points'
  | 'summary'
  | 'content'      // legacy support
  | 'two-column'   // legacy support
  | 'quote'        // legacy support
  | 'image';       // legacy support

export type PptxSectionTheme = 'intro' | 'background' | 'concepts' | 'analysis' | 'application' | 'summary';

export interface PptxSlideData {
  type: PptxSlideType;
  section?: PptxSectionTheme | string;  // Allow any string for flexible section names
  notes?: string;
  storyPoint?: string;  // New field from v3 prompt

  // Common fields
  title?: string;
  subtitle?: string;
  description?: string;

  // title, section - used for inline section indication on content slides
  sectionNumber?: string;
  sectionTitle?: string;

  // agenda
  items?: Array<{ number: string; title: string; description: string }>;

  // definition
  term?: string;
  definition?: string;
  etymology?: string;
  examples?: string[];
  relatedTerms?: string[];

  // concept
  keyPoints?: string[];
  insight?: string;

  // process
  steps?: Array<{ step: number; title: string; description: string }>;

  // comparison
  headers?: string[];
  rows?: Array<{ aspect: string; values: string[] }> | Array<{ aspect: string; itemA: string; itemB: string }> | string[][];
  conclusion?: string;

  // chart
  chartType?: 'bar' | 'pie' | 'line' | 'doughnut';
  data?: {
    labels: string[];
    values: number[];
    colors?: string[];
  };

  // case-study
  context?: string;
  challenge?: string;
  solution?: string;
  result?: string;
  lessons?: string[];

  // key-points
  icon?: string;
  points?: Array<{ title: string; description: string }>;

  // summary
  keyTakeaways?: string[];
  nextSteps?: string[];
  references?: string[];

  // Legacy fields
  bullets?: string[];
  leftColumn?: { header: string; items: string[] };
  rightColumn?: { header: string; items: string[] };
  imageUrl?: string;
  caption?: string;
  quote?: string;
  author?: string;
}

export interface PptxPresentationData {
  title: string;
  author?: string;
  subject?: string;
  slides: PptxSlideData[];
}

export interface PptxGenerationResult {
  pptxBuffer: ArrayBuffer;
  title: string;
  slideCount: number;
}

// ============================================================
// PPTX Generation Style (Standard vs Flexible)
// ============================================================

export type PptxGenerationStyle = 'standard' | 'flexible';

// ============================================================
// Generic Element Types for Flexible Mode
// ============================================================

export type PptxElementType = 'text' | 'shape' | 'bullets' | 'table' | 'chart' | 'icon-text';

export interface PptxTextStyle {
  fontSize?: number;
  fontFace?: string;
  color?: string;
  bold?: boolean;
  italic?: boolean;
  align?: 'left' | 'center' | 'right';
  valign?: 'top' | 'middle' | 'bottom';
}

export interface PptxBaseElement {
  type: PptxElementType;
  x: number;      // inches from left (0-13.33)
  y: number;      // inches from top (0-7.5)
  w: number;      // width in inches
  h: number;      // height in inches
}

export interface PptxTextElement extends PptxBaseElement {
  type: 'text';
  content: string;
  style?: PptxTextStyle;
}

export interface PptxShapeElement extends PptxBaseElement {
  type: 'shape';
  shape: 'rect' | 'ellipse' | 'line' | 'roundRect';
  fill?: string;        // hex color
  line?: string;        // border color
  lineWidth?: number;
}

export interface PptxBulletsElement extends PptxBaseElement {
  type: 'bullets';
  items: string[];
  style?: PptxTextStyle;
  bulletColor?: string;
}

export interface PptxTableElement extends PptxBaseElement {
  type: 'table';
  headers: string[];
  rows: string[][];
  headerColor?: string;
  headerBgColor?: string;
}

export interface PptxChartElement extends PptxBaseElement {
  type: 'chart';
  chartType: 'bar' | 'pie' | 'line' | 'doughnut';
  labels: string[];
  values: number[];
  colors?: string[];
}

export interface PptxIconTextElement extends PptxBaseElement {
  type: 'icon-text';
  icon: string;         // emoji
  text: string;
  style?: PptxTextStyle;
}

export type PptxElement =
  | PptxTextElement
  | PptxShapeElement
  | PptxBulletsElement
  | PptxTableElement
  | PptxChartElement
  | PptxIconTextElement;

export interface PptxFlexibleSlideData {
  background?: string;  // hex color or 'white'
  elements: PptxElement[];
  notes?: string;
}

export interface PptxFlexiblePresentationData {
  title: string;
  author?: string;
  slides: PptxFlexibleSlideData[];
}

// ============================================================
// TTS Provider Types
// ============================================================

export type TTSProvider = 'gemini' | 'elevenlabs';

export interface TTSProviderConfig {
  name: string;
  endpoint: string;
  defaultVoice: string;
  defaultModel: string;
  suggestedModels: string;
}

export const TTS_PROVIDER_CONFIGS: Record<TTSProvider, TTSProviderConfig> = {
  gemini: {
    name: 'Google Gemini TTS',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultVoice: 'Kore',
    defaultModel: 'gemini-2.5-flash-preview-tts',
    suggestedModels: 'gemini-2.5-flash-preview-tts, gemini-2.0-flash-preview-image-generation'
  },
  elevenlabs: {
    name: 'ElevenLabs',
    endpoint: 'https://api.elevenlabs.io/v1/text-to-speech',
    defaultVoice: 'rachel',
    defaultModel: 'eleven_multilingual_v2',
    suggestedModels: 'eleven_multilingual_v2, eleven_flash_v2_5, eleven_turbo_v2'
  }
};

// Gemini TTS available voices
export const GEMINI_TTS_VOICES = [
  { id: 'Zephyr', name: 'Zephyr', gender: 'female' as const, description: 'Bright' },
  { id: 'Puck', name: 'Puck', gender: 'male' as const, description: 'Upbeat' },
  { id: 'Charon', name: 'Charon', gender: 'male' as const, description: 'Informative' },
  { id: 'Kore', name: 'Kore', gender: 'female' as const, description: 'Firm' },
  { id: 'Fenrir', name: 'Fenrir', gender: 'male' as const, description: 'Excitable' },
  { id: 'Leda', name: 'Leda', gender: 'female' as const, description: 'Youthful' },
  { id: 'Orus', name: 'Orus', gender: 'male' as const, description: 'Firm' },
  { id: 'Aoede', name: 'Aoede', gender: 'female' as const, description: 'Breezy' }
];

// ============================================================
// Speech Template Types
// ============================================================

export type SpeechTemplate = 'verbatim' | 'key-summary' | 'lecture' | 'podcast' | 'notebooklm-dialogue';

export interface SpeechTemplateConfig {
  id: SpeechTemplate;
  name: string;
  nameKo: string;
  description: string;
  descriptionKo: string;
  icon: string;
  requiresDialogue: boolean;
  targetDurationMinutes: { min: number; max: number };
}

export const SPEECH_TEMPLATE_CONFIGS: Record<SpeechTemplate, SpeechTemplateConfig> = {
  'verbatim': {
    id: 'verbatim',
    name: 'Verbatim',
    nameKo: '원문 그대로',
    description: 'Read the original text as-is without summarization',
    descriptionKo: '요약 없이 원문을 그대로 읽기',
    icon: '📄',
    requiresDialogue: false,
    targetDurationMinutes: { min: 1, max: 30 }
  },
  'key-summary': {
    id: 'key-summary',
    name: 'Key Summary',
    nameKo: '핵심 요약',
    description: 'Concise, to-the-point summary focusing on main ideas',
    descriptionKo: '핵심 내용만 간결하게 요약',
    icon: '📝',
    requiresDialogue: false,
    targetDurationMinutes: { min: 3, max: 5 }
  },
  'lecture': {
    id: 'lecture',
    name: 'Lecture Style',
    nameKo: '강의식 설명',
    description: 'Educational explanation as if teaching to students',
    descriptionKo: '학생들에게 설명하듯 교육적인 설명',
    icon: '🎓',
    requiresDialogue: false,
    targetDurationMinutes: { min: 5, max: 10 }
  },
  'podcast': {
    id: 'podcast',
    name: 'Podcast Style',
    nameKo: '팟캐스트 스타일',
    description: 'Natural conversational tone like a podcast host',
    descriptionKo: '자연스러운 대화체의 팟캐스트 스타일',
    icon: '🎙️',
    requiresDialogue: false,
    targetDurationMinutes: { min: 5, max: 10 }
  },
  'notebooklm-dialogue': {
    id: 'notebooklm-dialogue',
    name: 'NotebookLM Style',
    nameKo: 'NotebookLM 스타일',
    description: 'Two hosts having a natural conversation discussing the content',
    descriptionKo: '두 명의 진행자가 대화하며 내용을 설명',
    icon: '👥',
    requiresDialogue: true,
    targetDurationMinutes: { min: 7, max: 12 }
  }
};

// ============================================================
// Voice Types
// ============================================================

export interface VoiceOption {
  id: string;
  name: string;
  gender: 'male' | 'female' | 'neutral';
  description?: string;
}

export interface DialogueVoices {
  hostA: VoiceOption;
  hostB: VoiceOption;
}

export interface DialogueSegment {
  speaker: 'hostA' | 'hostB';
  text: string;
}

// ============================================================
// Speech Generation Types
// ============================================================

export interface SpeechGenerationResult {
  script: string;
  dialogueSegments?: DialogueSegment[];
  estimatedDuration: number;  // in minutes
  wordCount: number;
  model: string;
  provider: AIProvider;
}

export interface TTSGenerationResult {
  audioData: ArrayBuffer;
  mimeType: string;
  duration: number;  // in seconds
  model: string;
  provider: TTSProvider;
}

export type AudioFormat = 'mp3' | 'wav';

// ============================================================
// Speech Modal Result Types
// ============================================================

export interface SpeechOptionsResult {
  confirmed: boolean;
  inputSource: InputSource;
  customInputText: string;
  template: SpeechTemplate;
  language: PreferredLanguage;
  ttsProvider: TTSProvider;
  ttsModel: string;
  voice: VoiceOption;
  dialogueVoices?: DialogueVoices;
  targetDuration: number;  // in minutes
  uploadToDrive: boolean;
  customPrompt?: string;  // custom prompt for script generation
}

export interface SpeechPreviewResult {
  confirmed: boolean;
  script: string;
  regenerate: boolean;
}
