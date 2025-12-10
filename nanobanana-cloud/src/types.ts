// ============================================================
// AI Provider Types
// ============================================================

export type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai' | 'glm';

export interface ProviderConfig {
  name: string;
  endpoint: string;
  defaultModel: string;
  models: string[];
}

export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  openai: {
    name: 'OpenAI',
    endpoint: 'https://api.openai.com/v1/chat/completions',
    defaultModel: 'gpt-4o',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-3.5-turbo']
  },
  google: {
    name: 'Google Gemini',
    endpoint: 'https://generativelanguage.googleapis.com/v1beta/models',
    defaultModel: 'gemini-2.0-flash',
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro', 'gemini-1.5-flash']
  },
  anthropic: {
    name: 'Anthropic',
    endpoint: 'https://api.anthropic.com/v1/messages',
    defaultModel: 'claude-sonnet-4-20250514',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307']
  },
  xai: {
    name: 'xAI',
    endpoint: 'https://api.x.ai/v1/chat/completions',
    defaultModel: 'grok-4-1-fast',
    models: ['grok-4-1-fast', 'grok-beta', 'grok-2-latest']
  },
  glm: {
    name: 'GLM (智谱AI)',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4']
  }
};

// ============================================================
// Input Source Types
// ============================================================

export type InputSource = 'fullNote' | 'selection';

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

export type EmbedSize = 'compact' | 'medium' | 'large' | 'fullwidth';

export interface EmbedSizeConfig {
  name: string;
  width: string;
  height: string;
}

export const EMBED_SIZES: Record<EmbedSize, EmbedSizeConfig> = {
  compact: { name: 'Compact', width: '400px', height: '300px' },
  medium: { name: 'Medium', width: '600px', height: '450px' },
  large: { name: 'Large', width: '800px', height: '600px' },
  fullwidth: { name: 'Full Width', width: '100%', height: '600px' }
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

export interface NanoBananaCloudSettings {
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
}

// ============================================================
// Progress Types
// ============================================================

export type ProgressStep =
  | 'analyzing'
  | 'generating-prompt'
  | 'preview'
  | 'generating-image'
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
  imageStyle: ImageStyle;
  infographicSubStyle: InfographicSubStyle;
  imageSize: ImageSize;
  cartoonCuts: CartoonCuts;
  customCartoonCuts: number;
}

export interface PreviewModalResult {
  confirmed: boolean;
  prompt: string;
  regenerate: boolean;
}
