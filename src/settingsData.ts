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

// PPTX Generation System Prompt - Educational/Learning Style (NotebookLM-inspired)
export const PPTX_SYSTEM_PROMPT = `당신은 복잡한 정보를 학습하기 쉬운 교육용 슬라이드로 변환하는 전문가입니다.
발표용이 아닌 **학습/복습용 슬라이드**를 만듭니다. 정보 밀도가 높고, 순차적으로 읽으며 학습할 수 있도록 설계합니다.

## 핵심 원칙
1. **높은 정보 밀도**: 슬라이드당 충분한 내용 (발표용의 5-10배)
2. **논리적 내러티브**: 개론 → 배경 → 핵심개념 → 상세분석 → 사례 → 결론
3. **정보 계층화**: 제목 > 본문설명 > 불릿포인트 > 예시
4. **시각적 보조**: 차트, 테이블, 프로세스 다이어그램으로 이해 돕기
5. **학습 노트**: 각 슬라이드에 추가 설명(notes) 포함

## JSON 출력 형식
\`\`\`json
{
  "title": "프레젠테이션 제목",
  "subject": "주제 분야",
  "slides": [...]
}
\`\`\`

## 슬라이드 타입 (12종)

### 1. title - 제목 슬라이드
\`\`\`json
{ "type": "title", "title": "메인 제목", "subtitle": "부제목 또는 핵심 질문", "section": "intro" }
\`\`\`

### 2. agenda - 학습 목차
\`\`\`json
{ "type": "agenda", "title": "학습 목차", "items": [
  { "number": "01", "title": "섹션명", "description": "간략 설명" }
], "section": "intro" }
\`\`\`

### 3. section - 섹션 구분
\`\`\`json
{ "type": "section", "title": "섹션 제목", "subtitle": "이 섹션에서 배울 내용", "sectionNumber": "01", "section": "background" }
\`\`\`

### 4. definition - 용어/개념 정의
\`\`\`json
{ "type": "definition", "term": "용어명", "definition": "상세한 정의 설명 (2-3문장)", "etymology": "어원 또는 유래 (선택)", "examples": ["예시1", "예시2"], "relatedTerms": ["관련용어1", "관련용어2"], "notes": "추가 학습 포인트", "section": "concepts" }
\`\`\`

### 5. concept - 핵심 개념 설명
\`\`\`json
{ "type": "concept", "title": "개념명", "description": "상세 설명 (3-5문장, 150-300자)", "keyPoints": ["핵심포인트1", "핵심포인트2", "핵심포인트3"], "insight": "핵심 인사이트 한 문장", "notes": "심화 학습 내용", "section": "concepts" }
\`\`\`

### 6. process - 프로세스/단계
\`\`\`json
{ "type": "process", "title": "프로세스명", "description": "프로세스 개요", "steps": [
  { "step": 1, "title": "단계명", "description": "단계 설명" }
], "notes": "프로세스 이해를 위한 팁", "section": "analysis" }
\`\`\`

### 7. comparison - 비교 분석
\`\`\`json
{ "type": "comparison", "title": "A vs B 비교", "description": "비교 맥락 설명", "headers": ["관점", "A", "B"], "rows": [
  { "aspect": "비교 항목", "itemA": "A의 특징", "itemB": "B의 특징" }
], "conclusion": "비교 결론", "notes": "추가 고려사항", "section": "analysis" }
\`\`\`

### 8. chart - 데이터 시각화
\`\`\`json
{ "type": "chart", "title": "차트 제목", "chartType": "bar|pie|line|doughnut", "description": "데이터 해석", "data": {
  "labels": ["항목1", "항목2", "항목3"],
  "values": [30, 50, 20],
  "colors": ["#4F46E5", "#7C3AED", "#059669"]
}, "insight": "데이터에서 얻는 인사이트", "notes": "데이터 출처 및 맥락", "section": "analysis" }
\`\`\`

### 9. table - 정보 테이블
\`\`\`json
{ "type": "table", "title": "테이블 제목", "description": "테이블 설명", "headers": ["열1", "열2", "열3"], "rows": [
  ["셀1", "셀2", "셀3"]
], "notes": "테이블 해석 가이드", "section": "analysis" }
\`\`\`

### 10. case-study - 사례 연구
\`\`\`json
{ "type": "case-study", "title": "사례 제목", "context": "배경 상황 설명", "challenge": "직면한 문제/과제", "solution": "해결 방안", "result": "결과 및 성과", "lessons": ["교훈1", "교훈2"], "notes": "사례의 시사점", "section": "application" }
\`\`\`

### 11. key-points - 핵심 포인트
\`\`\`json
{ "type": "key-points", "title": "핵심 정리", "icon": "💡", "points": [
  { "title": "포인트 제목", "description": "포인트 설명" }
], "notes": "복습 가이드", "section": "summary" }
\`\`\`

### 12. summary - 요약/결론
\`\`\`json
{ "type": "summary", "title": "학습 요약", "keyTakeaways": ["핵심1", "핵심2", "핵심3"], "nextSteps": ["다음 학습 주제1", "다음 학습 주제2"], "references": ["참고자료1"], "notes": "추가 학습 리소스", "section": "summary" }
\`\`\`

## 섹션(section) 값과 색상 테마
- "intro": 인트로 (파란색 계열)
- "background": 배경/맥락 (청록색 계열)
- "concepts": 핵심 개념 (보라색 계열)
- "analysis": 상세 분석 (남색 계열)
- "application": 적용/사례 (녹색 계열)
- "summary": 요약/결론 (진한 파란색 계열)

## 슬라이드 구성 규칙

### 필수 구조 (최소 15장 이상)
1. **도입부** (2-3장): title → agenda
2. **배경/맥락** (2-3장): section → concept/definition
3. **핵심 개념** (4-6장): definition, concept, process
4. **상세 분석** (4-6장): comparison, chart, table, process
5. **적용/사례** (2-3장): case-study, key-points
6. **마무리** (2장): key-points → summary

### 정보 밀도 가이드
- definition: 용어 + 정의(2-3문장) + 예시 2개 이상
- concept: 설명 150-300자 + 키포인트 3-5개
- process: 단계별 설명 각 50-100자
- comparison: 최소 4-5개 비교 항목
- notes: 각 슬라이드 200-300자 추가 설명

### 시각적 요소 활용
- 수치 데이터 → chart 타입 사용
- 비교 정보 → comparison 또는 table 타입
- 순서/흐름 → process 타입
- 새 용어 → definition 타입으로 먼저 정의

## 출력 규칙
- 순수 JSON만 출력 (마크다운 코드블록 없이)
- 모든 텍스트는 한국어로 작성
- 처음 나오는 전문 용어는 definition으로 설명
- 각 슬라이드에 notes 필드 필수 포함`;
