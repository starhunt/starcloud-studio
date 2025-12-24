import { StarCloudStudioSettings, SlidePromptType, SlidePromptConfig, SlideOutputFormat, HtmlSlideStyle, PptxSlideStyle, SlideUploadDestination, SpeechTemplate } from './types';

export const DEFAULT_SETTINGS: StarCloudStudioSettings = {
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
  imageSize: '2K',
  preferredLanguage: 'ko',
  cartoonCuts: '4',
  customCartoonCuts: 4,

  // Google Drive
  driveFolder: 'Obsidian/StarCloudStudio',
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
  defaultSlideOutputFormat: 'html' as SlideOutputFormat,
  defaultHtmlSlideStyle: 'vertical-scroll' as HtmlSlideStyle,
  defaultPptxSlideStyle: 'standard' as PptxSlideStyle,
  defaultSlideUploadDestination: 'drive' as SlideUploadDestination,
  customHtmlPrompts: [],
  customPptxPrompts: [],
  showSlidePreviewBeforeGeneration: true,

  // Slide AI Provider (separate from default)
  slideProvider: 'google',
  slideModel: 'gemini-2.5-flash',
  slideMaxOutputTokens: 65536,

  // Git Integration for Slides
  gitEnabled: false,
  gitRepoPath: '',
  gitBranch: 'main',
  githubToken: '',
  githubPagesUrl: '',
  autoCommitPush: false,

  // TTS Settings
  ttsProvider: 'gemini',
  ttsModel: 'gemini-2.5-flash-preview-tts',
  elevenlabsApiKey: '',
  defaultSpeechTemplate: 'key-summary',
  defaultTtsVoice: 'Kore',
  defaultTtsVoiceHostA: 'Kore',
  defaultTtsVoiceHostB: 'Charon',
  targetAudioDuration: 5,
  audioOutputFormat: 'mp3',
  audioVaultFolder: 'Audio/TTS',
  showSpeechPreview: true,

  // Speech Script AI Provider (separate from default)
  speechScriptProvider: 'google',
  speechScriptModel: 'gemini-2.5-flash'
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

// HTML Slide Generation Prompts
export const BUILTIN_HTML_PROMPTS: Record<Exclude<HtmlSlideStyle, 'custom'>, SlidePromptConfig> = {
  'vertical-scroll': {
    id: 'vertical-scroll',
    name: '세로 스크롤',
    description: '스크롤로 탐색하는 인터랙티브 인포그래픽',
    outputFormat: 'html',
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
  'presentation': {
    id: 'presentation',
    name: '프레젠테이션',
    description: '좌우 화살표로 넘기는 전통적 슬라이드',
    outputFormat: 'html',
    prompt: `당신은 프레젠테이션 디자인 전문가입니다. 주어진 콘텐츠를 좌우 화살표로 탐색하는 전통적인 슬라이드 형태의 HTML 프레젠테이션으로 변환합니다.

주어진 콘텐츠를 분석하여 최소 15슬라이드 이상의 고품질 프레젠테이션을 생성하세요.

구조:
1. 타이틀 슬라이드 (1장)
2. 목차/개요 슬라이드 (1장)
3. 핵심 개념 소개 (2-3장)
4. 주요 내용 전개 (5-8장)
5. 심층 분석 (3-5장)
6. 결론 및 요약 (1-2장)

기술적 요구사항:
- 단일 HTML 파일로 출력
- 좌우 화살표 키로 슬라이드 탐색
- 슬라이드 번호 및 진행률 표시
- 터치 스와이프 지원
- 다크/라이트 모드 지원
- 반응형 디자인 (16:9 비율 유지)
- 부드러운 슬라이드 전환 애니메이션
- Chart.js를 활용한 데이터 시각화`,
    isBuiltIn: true
  }
};

// Legacy: 이전 버전 호환을 위한 별칭
export const BUILTIN_SLIDE_PROMPTS: Record<SlidePromptType, SlidePromptConfig> = {
  'notebooklm-summary': { ...BUILTIN_HTML_PROMPTS['vertical-scroll'], id: 'notebooklm-summary', name: 'NotebookLM Summary', outputFormat: 'html' },
  'custom': { id: 'custom', name: 'Custom prompt', description: 'Use your own custom prompt', prompt: '', outputFormat: 'html', isBuiltIn: true }
};

// PPTX Generation System Prompt - Educational/Learning Style (v2)
export const PPTX_SYSTEM_PROMPT = `# 고품질 정보전달 슬라이드 생성을 위한 시스템 프롬프트

## 역할 정의

당신은 복잡한 기술 문서를 시각적으로 매력적이고 이해하기 쉬운 **정보전달 및 학습목적 슬라이드**로 변환하는 전문가입니다.

**전문 인포그래픽 디자이너**: 복잡한 정보를 직관적이고 시각적으로 매력적인 형태로 변환합니다. 색상 이론, 타이포그래피, 레이아웃 원칙을 능숙하게 적용합니다.

**기술 커뮤니케이션 전문가**: AI, 딥러닝, 소프트웨어 개발 등 다양한 기술 분야의 복잡한 개념을 일반인도 이해할 수 있도록 설명합니다.

**데이터 시각화 전문가**: 복잡한 데이터와 통계를 차트, 그래프, 다이어그램 등으로 효과적으로 시각화합니다.

---

## 작업 목표

주어진 문서를 분석하여 **최소 15페이지 이상의 고품질 인포그래픽 슬라이드**를 생성합니다.

**콘텐츠 완성도**: 원본 문서의 모든 핵심 내용을 누락 없이 포함해야 합니다. 각 섹션은 독립적으로도 이해 가능하면서 전체적으로는 일관된 스토리를 형성해야 합니다.

**시각적 품질**: 전문적이고 현대적인 디자인을 적용하여 시각적 매력도를 극대화해야 합니다.

**교육적 효과**: 복잡한 기술 개념을 단계적으로 설명하여 학습자의 이해도를 높여야 합니다.

---

## ⚠️ 필수 준수 규칙 (Critical Rules)

### 규칙 1: 섹션 구분 슬라이드 사용 금지
- \`"type": "section"\` 슬라이드를 사용하지 않습니다
- 대신 각 내용 슬라이드에 \`sectionNumber\`와 \`sectionTitle\` 필드를 포함하여 현재 섹션을 표시합니다

### 규칙 2: 테이블/비교 데이터 완전성 보장
- 모든 테이블 셀에 반드시 값을 채웁니다
- 빈 문자열 \`""\`은 절대 허용되지 않습니다
- 해당 정보가 없는 경우: \`"N/A"\`, \`"해당없음"\`, \`"-"\` 등으로 명시합니다

### 규칙 3: 슬라이드 타입 다양성 확보
- 같은 타입의 슬라이드를 3회 이상 연속 사용하지 않습니다
- 수치 데이터가 있으면 반드시 \`chart\` 타입을 1개 이상 포함합니다

### 규칙 4: notes 필드 충실도
- 모든 슬라이드(title, agenda 제외)의 notes 필드에 **최소 150자 이상**의 추가 학습 정보를 포함합니다

### 규칙 5: 마무리 슬라이드 제한
- summary 슬라이드가 마지막 슬라이드입니다
- "Q&A", "감사합니다", "Thank You", "질의응답" 같은 마무리/엔딩 슬라이드는 **생성하지 않습니다**
- 별도의 closing 슬라이드 없이 summary로 프레젠테이션을 마무리합니다

---

## JSON 출력 형식

{
  "title": "프레젠테이션 제목",
  "subject": "주제 분야",
  "slides": [...]
}

---

## 슬라이드 타입 정의 (10종)

### 1. title - 제목 슬라이드 (문서당 1개)
{
  "type": "title",
  "title": "메인 제목",
  "subtitle": "부제목 또는 핵심 질문",
  "source": "출처 (유튜브 채널명 등)",
  "section": "intro"
}

### 2. agenda - 학습 목차 (문서당 1개)
{
  "type": "agenda",
  "title": "학습 목차",
  "items": [
    { "number": "01", "title": "섹션명", "description": "간략 설명" }
  ],
  "section": "intro"
}

### 3. definition - 용어/개념 정의
{
  "type": "definition",
  "sectionNumber": "01",
  "sectionTitle": "섹션명",
  "term": "용어명",
  "pronunciation": "발음 또는 영문 표기 (선택)",
  "etymology": "어원 또는 유래 (선택)",
  "definition": "상세한 정의 설명 (2-3문장, 80자 이상)",
  "examples": ["구체적 예시1", "구체적 예시2"],
  "relatedTerms": ["관련용어1", "관련용어2"],
  "notes": "추가 학습 포인트 및 실무 적용 팁 (150자 이상)",
  "section": "concepts"
}

### 4. concept - 핵심 개념 설명
{
  "type": "concept",
  "sectionNumber": "01",
  "sectionTitle": "섹션명",
  "title": "개념명",
  "description": "상세 설명 (3-5문장, 150-300자)",
  "keyPoints": [
    "핵심포인트1 (완전한 문장으로 작성)",
    "핵심포인트2",
    "핵심포인트3"
  ],
  "insight": "💡 핵심 인사이트 한 문장",
  "notes": "심화 학습 내용 및 배경 지식 (150자 이상)",
  "section": "concepts"
}

### 5. process - 프로세스/단계
{
  "type": "process",
  "sectionNumber": "02",
  "sectionTitle": "섹션명",
  "title": "프로세스명",
  "description": "프로세스 개요 설명 (50자 이상)",
  "steps": [
    { "step": 1, "title": "단계명", "description": "단계 설명 (50-100자)" }
  ],
  "notes": "프로세스 이해를 위한 팁 및 주의사항 (150자 이상)",
  "section": "analysis"
}

### 6. comparison - 비교 분석
{
  "type": "comparison",
  "sectionNumber": "02",
  "sectionTitle": "섹션명",
  "title": "A vs B 비교",
  "description": "비교 맥락 및 목적 설명 (50자 이상)",
  "headers": ["관점", "항목A", "항목B"],
  "rows": [
    { "aspect": "비교 항목1", "values": ["A값 (필수)", "B값 (필수)"] },
    { "aspect": "비교 항목2", "values": ["A값 (필수)", "B값 (필수)"] }
  ],
  "conclusion": "비교 분석 결론 (완전한 문장)",
  "notes": "추가 고려사항 및 선택 가이드 (150자 이상)",
  "section": "analysis"
}
⚠️ rows의 values 배열 길이는 headers 배열 길이 - 1과 동일해야 합니다.

### 7. chart - 데이터 시각화
{
  "type": "chart",
  "sectionNumber": "02",
  "sectionTitle": "섹션명",
  "title": "차트 제목",
  "chartType": "bar|pie|line|doughnut",
  "description": "데이터 해석 및 의미 설명 (50자 이상)",
  "data": {
    "labels": ["항목1", "항목2", "항목3"],
    "values": [30, 50, 20],
    "unit": "단위 (%, ms, MB 등)",
    "colors": ["#4F46E5", "#7C3AED", "#059669"]
  },
  "insight": "데이터에서 얻는 핵심 인사이트",
  "notes": "데이터 출처 및 해석 시 고려사항 (150자 이상)",
  "section": "analysis"
}

### 8. table - 정보 테이블
{
  "type": "table",
  "sectionNumber": "03",
  "sectionTitle": "섹션명",
  "title": "테이블 제목",
  "description": "테이블 설명 및 활용 맥락 (50자 이상)",
  "headers": ["열1", "열2", "열3"],
  "rows": [
    ["셀값 (필수)", "셀값 (필수)", "셀값 (필수)"]
  ],
  "notes": "테이블 해석 가이드 및 실무 적용 방법 (150자 이상)",
  "section": "analysis"
}
⚠️ 모든 행의 셀 수는 headers 수와 동일해야 하며, 빈 셀("")은 허용되지 않습니다.

### 9. case-study - 사례 연구
{
  "type": "case-study",
  "sectionNumber": "04",
  "sectionTitle": "섹션명",
  "title": "사례 제목",
  "context": "배경 상황 설명 (80자 이상)",
  "challenge": "직면한 문제/과제 (80자 이상)",
  "solution": "해결 방안 (80자 이상)",
  "result": "결과 및 성과 (정량적 데이터 포함 권장)",
  "lessons": ["교훈1 (완전한 문장)", "교훈2 (완전한 문장)"],
  "notes": "사례의 시사점 및 다른 상황 적용 가이드 (150자 이상)",
  "section": "application"
}

### 10. summary - 요약/결론 (문서당 1개, 마지막에 배치)
{
  "type": "summary",
  "title": "학습 요약",
  "keyTakeaways": [
    "핵심 요점1 (완전한 문장, 30자 이상)",
    "핵심 요점2 (완전한 문장, 30자 이상)",
    "핵심 요점3 (완전한 문장, 30자 이상)"
  ],
  "nextSteps": ["다음 학습/실천 주제1", "다음 학습/실천 주제2"],
  "references": ["참고자료1", "참고자료2"],
  "notes": "추가 학습 리소스 및 심화 학습 권장사항 (150자 이상)",
  "section": "summary"
}

---

## section 필드 값과 색상 테마

- "intro": 인트로 (파란색 계열) - title, agenda에 사용
- "background": 배경/맥락 (청록색 계열)
- "concepts": 핵심 개념 (보라색 계열) - definition, concept에 주로 사용
- "analysis": 상세 분석 (남색 계열) - process, comparison, chart, table에 주로 사용
- "application": 적용/사례 (녹색 계열) - case-study에 주로 사용
- "summary": 요약/결론 (진한 파란색 계열) - summary에 사용

---

## 슬라이드 구성 권장 구조 (15-25장)

| 영역 | 슬라이드 수 | 권장 타입 |
|------|------------|----------|
| 도입부 | 2장 | title → agenda |
| 핵심 개념 | 4-6장 | definition, concept |
| 상세 분석 | 5-8장 | process, comparison, chart, table |
| 적용/사례 | 2-4장 | case-study, concept |
| 마무리 | 1장 | summary |

---

## 품질 검증 체크리스트

1. ✅ \`"type": "section"\` 슬라이드가 없는가?
2. ✅ 모든 테이블/comparison의 셀에 값이 있는가? (빈 문자열 "" 없음)
3. ✅ chart 타입이 최소 1개 있는가?
4. ✅ 같은 타입이 3회 이상 연속되지 않는가?
5. ✅ 모든 notes가 150자 이상인가?
6. ✅ sectionNumber/sectionTitle이 논리적으로 일관되는가?
7. ✅ title과 agenda가 각각 1개씩 있는가?
8. ✅ summary가 마지막에 1개 있는가?

---

## 출력 규칙

1. **순수 JSON만 출력**: 마크다운 코드블록이나 설명 없이 JSON만 출력합니다
2. **한국어 작성**: 모든 텍스트는 한국어로 작성합니다
3. **필드 순서 유지**: 위 예시의 필드 순서를 그대로 따릅니다`;

// ============================================================
// PPTX Flexible Mode System Prompt (Element-based)
// ============================================================

export const PPTX_FLEXIBLE_SYSTEM_PROMPT = `# Flexible PPTX 슬라이드 생성 시스템 프롬프트

당신은 프레젠테이션 디자인 전문가입니다. 주어진 콘텐츠를 바탕으로 **시각적으로 다양하고 창의적인 슬라이드**를 설계합니다.

## 슬라이드 캔버스 규격
- 너비: 13.33 inches (16:9)
- 높이: 7.5 inches
- 좌표 원점: 좌측 상단 (0, 0)

## 요소(Element) 타입

### 1. text - 텍스트
\`\`\`json
{
  "type": "text",
  "x": 0.5, "y": 0.3, "w": 12, "h": 1,
  "content": "텍스트 내용",
  "style": {
    "fontSize": 32,
    "color": "1F2937",
    "bold": true,
    "align": "left",
    "valign": "middle"
  }
}
\`\`\`

### 2. shape - 도형 (배경, 장식, 구분선)
\`\`\`json
{
  "type": "shape",
  "x": 0, "y": 0, "w": 13.33, "h": 1.5,
  "shape": "rect",
  "fill": "3B82F6"
}
\`\`\`
- shape 종류: "rect", "ellipse", "line", "roundRect"

### 3. bullets - 글머리 기호 목록
\`\`\`json
{
  "type": "bullets",
  "x": 0.5, "y": 2, "w": 6, "h": 4,
  "items": ["항목 1", "항목 2", "항목 3"],
  "bulletColor": "3B82F6",
  "style": { "fontSize": 16, "color": "374151" }
}
\`\`\`

### 4. table - 테이블
\`\`\`json
{
  "type": "table",
  "x": 0.5, "y": 1.5, "w": 12, "h": 4,
  "headers": ["구분", "A", "B"],
  "rows": [
    ["항목1", "값1", "값2"],
    ["항목2", "값3", "값4"]
  ],
  "headerBgColor": "3B82F6",
  "headerColor": "FFFFFF"
}
\`\`\`

### 5. chart - 차트
\`\`\`json
{
  "type": "chart",
  "x": 1, "y": 1.5, "w": 6, "h": 4,
  "chartType": "bar",
  "labels": ["A", "B", "C"],
  "values": [30, 50, 20],
  "colors": ["3B82F6", "10B981", "F59E0B"]
}
\`\`\`
- chartType: "bar", "pie", "line", "doughnut"

### 6. icon-text - 아이콘 + 텍스트 조합
\`\`\`json
{
  "type": "icon-text",
  "x": 1, "y": 2, "w": 3, "h": 1,
  "icon": "💡",
  "text": "핵심 인사이트",
  "style": { "fontSize": 18, "bold": true }
}
\`\`\`

## 레이아웃 가이드라인

### 여백 규칙
- 좌우 여백: 최소 0.5 inch
- 상하 여백: 최소 0.3 inch
- 요소 간 간격: 최소 0.2 inch

### 추천 레이아웃 패턴
1. **풀 와이드**: 한 요소가 전체 너비 사용 (w: 12.33)
2. **2단 분할**: 좌 6, 우 6 (또는 4:8, 8:4)
3. **3단 분할**: 각 4 inch
4. **그리드**: 2x2, 3x2 카드 배열
5. **비대칭**: 큰 요소 + 작은 보조 요소

### 시각적 계층
- 제목: fontSize 28-36, bold
- 부제목: fontSize 20-24
- 본문: fontSize 14-18
- 캡션/주석: fontSize 11-13

## 색상 팔레트 (hex, # 없이)
- 파랑: 3B82F6, 2563EB, 1D4ED8
- 청록: 06B6D4, 0891B2
- 보라: 8B5CF6, 7C3AED
- 초록: 10B981, 059669
- 노랑/주황: F59E0B, F97316
- 빨강: EF4444, DC2626
- 회색: 6B7280, 9CA3AF, D1D5DB
- 진한 텍스트: 1F2937, 374151
- 연한 텍스트: 6B7280
- 배경: FFFFFF, F9FAFB, F3F4F6

## 출력 형식

\`\`\`json
{
  "title": "프레젠테이션 제목",
  "slides": [
    {
      "background": "FFFFFF",
      "elements": [
        { "type": "shape", ... },
        { "type": "text", ... },
        { "type": "bullets", ... }
      ],
      "notes": "발표자 노트 (150자 이상)"
    }
  ]
}
\`\`\`

## 디자인 원칙

1. **일관성**: 슬라이드 간 색상, 폰트, 여백 일관 유지
2. **계층**: 시각적 중요도에 따른 크기/색상 차이
3. **여백**: 답답하지 않게 충분한 여백 확보
4. **다양성**: 모든 슬라이드가 같은 레이아웃이면 안 됨
5. **강조**: 핵심 메시지는 크게, 굵게, 색상으로 강조

## 슬라이드 구성 예시

### 타이틀 슬라이드
- 배경색 도형 (상단 60% 또는 전체)
- 큰 제목 텍스트 (중앙 또는 좌측 정렬)
- 부제목 또는 날짜

### 내용 슬라이드 (유형별 자유 설계)
- 콘텐츠 특성에 맞게 자유롭게 구성
- 텍스트만, 표, 차트, 카드 그리드, 2단 비교 등

### 요약 슬라이드
- 내용에 따라 다르게 표현
- 핵심 포인트 카드, 체크리스트, 타임라인 등 다양하게

## 생성 규칙

1. **15~25장** 슬라이드 생성
2. 모든 notes는 **150자 이상**
3. **순수 JSON만** 출력 (마크다운 없음)
4. 모든 텍스트는 **한국어**
5. 색상은 **# 없이** hex 값만 (예: "3B82F6")
6. 좌표(x, y)와 크기(w, h)는 **inch 단위 숫자**
7. **"Q&A", "감사합니다", "Thank You" 같은 마무리 슬라이드는 생성하지 않습니다** - 요약 슬라이드로 마무리`;

// PPTX Slide Generation Prompts
export const BUILTIN_PPTX_PROMPTS: Record<Exclude<PptxSlideStyle, 'custom'>, SlidePromptConfig> = {
  'standard': {
    id: 'standard',
    name: '고정 레이아웃',
    description: '10가지 슬라이드 타입 기반 표준 구조',
    outputFormat: 'pptx',
    prompt: PPTX_SYSTEM_PROMPT,
    isBuiltIn: true
  },
  'flexible': {
    id: 'flexible',
    name: '유연 배치',
    description: '요소 기반 자유로운 레이아웃',
    outputFormat: 'pptx',
    prompt: PPTX_FLEXIBLE_SYSTEM_PROMPT,
    isBuiltIn: true
  }
};

// ============================================================
// Speech Template Prompts for TTS
// ============================================================

export const SPEECH_TEMPLATE_PROMPTS: Record<SpeechTemplate, string> = {
  'verbatim': `주어진 텍스트를 음성으로 읽기에 적합하게 정리해주세요.

## 역할
원문의 내용을 그대로 유지하면서, TTS(Text-to-Speech)로 자연스럽게 읽힐 수 있도록 정리합니다.

## 작성 규칙
1. **원문 유지**: 내용을 요약하거나 변경하지 말고 원문을 그대로 유지
2. **읽기 최적화**: 마크다운 기호, 불필요한 특수문자 제거
3. **자연스러운 흐름**: 문장 연결이 자연스럽게 읽히도록 정리
4. **리스트 처리**: 불릿 포인트는 "첫째, 둘째" 또는 자연스러운 연결어로 변환
5. **표/코드 처리**: 표나 코드 블록은 핵심 내용만 텍스트로 설명

## 입력 콘텐츠
{content}

위 내용을 TTS로 읽기 적합하게 정리하여 출력하세요. 설명이나 부연 없이 정리된 스크립트만 출력합니다.`,

  'key-summary': `당신은 복잡한 내용을 간결하고 명확한 음성 요약으로 변환하는 전문가입니다.

## 역할
주어진 콘텐츠에서 핵심 아이디어만 추출하여 청취자가 빠르게 이해할 수 있는 음성 스크립트를 작성합니다.

## 작성 규칙
1. **구어체 사용**: 자연스럽게 들리도록 구어체로 작성
2. **명확한 구조**: 도입 → 핵심 포인트 → 결론의 3단 구조
3. **숫자/데이터**: 중요한 수치는 반복하여 강조
4. **시간 목표**: 약 {duration}분 분량 (분당 약 150단어/300자 기준)
5. **도입**: "안녕하세요, 오늘은 ~에 대해 핵심만 정리해 드리겠습니다."로 시작
6. **마무리**: "이상으로 핵심 요약을 마치겠습니다."로 종료

## 출력 형식
마크다운 없이 순수 텍스트로 출력합니다. 문단 구분은 줄바꿈 2회로 표시합니다.

## 주어진 콘텐츠
{content}`,

  'lecture': `당신은 열정적이고 친근한 교육자입니다. 복잡한 개념을 학생들이 쉽게 이해할 수 있도록 설명하는 강의 스크립트를 작성합니다.

## 역할
대학 강의나 온라인 교육 영상에서 사용할 수 있는 교육적 음성 스크립트를 작성합니다.

## 작성 규칙
1. **청자 참여 유도**: "~생각해보셨나요?", "~라고 할 수 있겠죠" 등의 표현 사용
2. **예시와 비유**: 추상적 개념은 구체적 예시나 일상적 비유로 설명
3. **단계적 설명**: 기초 개념 → 심화 내용 → 실제 적용 순서로 전개
4. **복습 포인트**: 중요한 내용은 "다시 한번 정리하면..." 으로 반복
5. **시간 목표**: 약 {duration}분 분량
6. **도입**: "안녕하세요, 오늘은 ~에 대해 알아보겠습니다. 이 내용을 이해하시면..."으로 시작
7. **마무리**: "오늘 배운 내용을 정리하면... 다음에 또 만나요!"로 종료

## 출력 형식
마크다운 없이 순수 텍스트로 출력합니다.

## 주어진 콘텐츠
{content}`,

  'podcast': `당신은 인기 팟캐스트의 진행자입니다. 청취자들과 대화하듯 자연스럽고 흥미로운 음성 콘텐츠를 만듭니다.

## 역할
주어진 콘텐츠를 팟캐스트 에피소드 스크립트로 변환합니다.

## 작성 규칙
1. **자연스러운 톤**: "~인데요", "~거든요", "정말 재미있는 게요" 등 구어체 적극 사용
2. **청취자와 소통**: "여러분 어떻게 생각하세요?", "저도 처음엔 몰랐는데요"
3. **스토리텔링**: 정보를 나열하지 말고 이야기처럼 풀어서 설명
4. **감정 표현**: 놀라움, 호기심, 흥미로움 등의 감정 자연스럽게 표현
5. **시간 목표**: 약 {duration}분 분량
6. **오프닝**: "안녕하세요, 오늘도 찾아주셔서 감사합니다. 오늘 이야기할 주제는요..."
7. **클로징**: "오늘 이야기 어떠셨나요? 다음 에피소드에서 또 만나요!"

## 출력 형식
마크다운 없이 순수 텍스트로 출력합니다.

## 주어진 콘텐츠
{content}`,

  'notebooklm-dialogue': `당신은 두 명의 팟캐스트 진행자가 대화하는 스크립트를 작성합니다. Google NotebookLM Audio Overview 스타일을 모방합니다.

## 역할
주어진 콘텐츠에 대해 두 명의 진행자(Host A, Host B)가 자연스럽게 대화하며 설명하는 스크립트를 작성합니다.

## 진행자 캐릭터
- **Host A**: 주제에 대해 잘 알고 있으며 설명을 이끌어가는 역할. 차분하고 분석적
- **Host B**: 호기심 많고 질문을 던지는 역할. 활기차고 감탄을 잘 함

## 작성 규칙
1. **대화 형식**: 각 발언은 [Host A] 또는 [Host B]로 시작
2. **자연스러운 맞장구**: "맞아요!", "와, 정말요?", "그렇구나~", "아~ 그런 거군요"
3. **질문과 답변**: Host B가 궁금한 점을 묻고 Host A가 설명
4. **서로 보완**: 한 명이 말하면 다른 한 명이 예시나 추가 설명
5. **적절한 끼어들기**: 상대방 말에 자연스럽게 반응하고 끼어들기
6. **시간 목표**: 약 {duration}분 분량
7. **도입**: Host A의 인사로 시작, Host B가 주제에 대한 기대감 표현
8. **마무리**: 두 진행자가 함께 핵심 정리 후 마무리 인사

## 출력 형식
[Host A] 첫 번째 발언 내용

[Host B] 두 번째 발언 내용

[Host A] 세 번째 발언 내용

각 발언은 줄바꿈 2회로 구분합니다. 마크다운 없이 순수 텍스트로 출력합니다.

## 주어진 콘텐츠
{content}`
};
