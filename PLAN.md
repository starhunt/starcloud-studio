# NanoBanana Cloud - 통합 플러그인 개발 계획

## 개요

NanoBanana PRO와 Drive Embedder의 핵심 기능을 통합하여, 노트 내용을 기반으로 AI 인포그래픽을 생성하고 Google Drive에 업로드 후 노트에 임베딩하는 Obsidian 플러그인을 개발합니다.

## 플러그인 이름 후보

- **NanoBanana Cloud** (추천)
- NanoBanana Drive
- Infographic Cloud
- AI Poster Cloud

## 워크플로우

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         NanoBanana Cloud 워크플로우                          │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  1. 사용자 입력                                                              │
│     └─ 노트 선택 → QuickOptionsModal (스타일/사이즈/입력소스 선택)              │
│                    ├─ 전체 노트 (기본값) → 커서 위치에 임베딩                   │
│                    └─ 선택 영역 → 선택 영역 다음 라인에 임베딩                  │
│                                                                             │
│  2. 프롬프트 생성 (PromptService)                                            │
│     └─ 노트 내용 → AI Provider (OpenAI/Gemini/Anthropic/xAI/GLM)             │
│                    → 이미지 프롬프트                                         │
│                                                                             │
│  3. 프롬프트 미리보기 (선택사항)                                               │
│     └─ PreviewModal → 편집/확인/재생성                                       │
│                                                                             │
│  4. 이미지 생성 (ImageService)                                               │
│     └─ 프롬프트 → Google Gemini → base64 이미지                              │
│                                                                             │
│  5. Google Drive 업로드 (DriveUploadService) ⭐ NEW                          │
│     └─ base64 → File 객체 → Google Drive API                                │
│     └─ 폴더 구조: {basePath}/{YYYY}/{MM}/                                   │
│     └─ 중복 파일명 처리: filename-1.png, filename-2.png ...                  │
│                                                                             │
│  6. 노트에 임베딩 (EmbedService) ⭐ MODIFIED                                  │
│     └─ fileId → iframe/img 태그 생성                                        │
│     └─ 전체 노트: 커서 위치에 삽입                                            │
│     └─ 선택 영역: 선택 영역 끝 다음 라인에 삽입                                │
│                                                                             │
│  7. 완료                                                                    │
│     └─ ProgressModal → 성공 메시지                                          │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

## 프로젝트 구조

```
nanobanana-cloud/
├── manifest.json
├── package.json
├── tsconfig.json
├── esbuild.config.mjs
├── styles.css
├── README.md
└── src/
    ├── main.ts                    # 플러그인 메인 클래스
    ├── types.ts                   # 타입 정의
    ├── settings.ts                # 설정 탭 UI
    ├── settingsData.ts            # 기본 설정값
    ├── i18n.ts                    # 다국어 지원
    │
    ├── modals/
    │   ├── quickOptionsModal.ts   # 스타일/사이즈 선택
    │   ├── previewModal.ts        # 프롬프트 미리보기
    │   └── progressModal.ts       # 진행 상황 표시
    │
    └── services/
        ├── promptService.ts       # AI 프롬프트 생성
        ├── imageService.ts        # 이미지 생성 (Gemini)
        ├── googleOAuthFlow.ts     # Google OAuth 인증
        ├── driveUploadService.ts  # Google Drive 업로드
        └── embedService.ts        # 임베딩 코드 생성 + 노트 삽입
```

## 설정 (Settings) 구조

```typescript
// AI Provider 타입 (GLM 추가)
type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai' | 'glm';

// 입력 소스 타입
type InputSource = 'fullNote' | 'selection';

// 이미지 스타일 타입
type ImageStyle = 'infographic' | 'poster' | 'diagram' | 'mindmap' | 'timeline' | 'cartoon';

// 인포그래픽 서브 스타일 타입 (infographic 선택시)
type InfographicSubStyle =
  | 'general'        // 일반 (기본값)
  | 'visualStory'    // 비주얼 스토리텔링 (카드뉴스, SNS)
  | 'tedEd'          // TED-Ed 스타일 (교육용)
  | 'journalism'     // 저널리즘 스타일 (보도자료, 분석)
  | 'gamification'   // 게이미피케이션 스타일 (이벤트, 프로세스)
  | 'vcPitch';       // VC 피칭 스타일 (제안서, 투자유치)

interface NanoBananaCloudSettings {
  // === AI API Keys ===
  googleApiKey: string;           // Gemini (프롬프트 + 이미지 생성)
  openaiApiKey: string;           // OpenAI (프롬프트 생성용)
  anthropicApiKey: string;        // Anthropic (프롬프트 생성용)
  xaiApiKey: string;              // xAI (프롬프트 생성용)
  glmApiKey: string;              // GLM/智谱AI (프롬프트 생성용) ⭐ NEW

  // === Google Drive OAuth ===
  googleClientId: string;         // OAuth Client ID
  googleClientSecret: string;     // OAuth Client Secret
  googleAccessToken: string;      // Access Token
  googleRefreshToken: string;     // Refresh Token
  tokenExpiresAt: number;         // Token 만료 시간

  // === 프롬프트 생성 설정 ===
  selectedProvider: AIProvider;   // 'openai' | 'google' | 'anthropic' | 'xai' | 'glm'
  promptModel: string;            // 프롬프트 생성 모델

  // === 입력 소스 설정 ===
  defaultInputSource: InputSource; // 'fullNote' (기본값) | 'selection'

  // === 이미지 생성 설정 ===
  imageModel: string;             // 이미지 생성 모델 (Gemini)
  imageStyle: ImageStyle;         // 'infographic' | 'poster' | 'diagram' | ...
  infographicSubStyle: InfographicSubStyle;  // 인포그래픽 서브 스타일 (imageStyle이 'infographic'일 때)
  imageSize: ImageSize;           // '1K' | '2K' | '4K'
  preferredLanguage: PreferredLanguage;
  cartoonCuts: CartoonCuts;       // 만화 스타일 컷 수

  // === Google Drive 설정 ===
  driveFolder: string;            // 업로드 기본 폴더 (기본: 'Obsidian/NanoBananaCloud')
  organizeFoldersByDate: boolean; // 년/월 하위폴더 생성 여부 (기본: true)

  // === 임베딩 설정 ===
  embedSize: EmbedSize;           // 임베딩 크기 프리셋
  showTitleInEmbed: boolean;      // 파일명 표시 여부

  // === UX 설정 ===
  showPreviewBeforeGeneration: boolean;  // 프롬프트 미리보기
  showProgressModal: boolean;            // 진행 모달 표시
  autoRetryCount: number;                // 자동 재시도 횟수
  customPromptPrefix: string;            // 커스텀 프롬프트 접두어
}

// Provider 설정 (GLM 추가)
const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
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
    models: ['gemini-2.0-flash', 'gemini-2.5-flash', 'gemini-2.0-flash-exp', 'gemini-1.5-pro']
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
  glm: {  // ⭐ NEW
    name: 'GLM (智谱AI)',
    endpoint: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
    defaultModel: 'glm-4-flash',
    models: ['glm-4-flash', 'glm-4-plus', 'glm-4-air', 'glm-4']
  }
};
```

## 핵심 서비스 설계

### 1. DriveUploadService (신규)

NanoBanana PRO의 `FileService`와 Drive Embedder의 `GoogleDriveUploader`를 결합:

```typescript
class DriveUploadService {
  // base64 이미지 데이터를 Google Drive에 업로드
  async uploadImage(
    imageData: string,          // base64 인코딩 이미지
    mimeType: string,           // 'image/png' 등
    fileName: string,           // 파일명
    baseFolderPath: string,     // Drive 기본 폴더 경로
    organizeFoldersByDate: boolean,  // 년/월 폴더 구성 여부
    onProgress?: (progress: UploadProgress) => void
  ): Promise<DriveUploadResult>

  // OAuth 토큰 관리
  private async ensureValidToken(): Promise<string>

  // 폴더 생성/검색 (년/월 하위폴더 포함)
  private async ensureFolder(basePath: string, organizeByDate: boolean): Promise<string>

  // 중복 파일명 처리
  private async getUniqueFileName(folderId: string, originalName: string): Promise<string>
}

// 폴더 구조 예시:
// organizeFoldersByDate = true 인 경우:
//   Obsidian/NanoBananaCloud/2025/12/note-poster-1234567890.png
//   Obsidian/NanoBananaCloud/2025/12/note-poster-1234567890-1.png (중복시)
//   Obsidian/NanoBananaCloud/2025/12/note-poster-1234567890-2.png (중복시)
//
// organizeFoldersByDate = false 인 경우:
//   Obsidian/NanoBananaCloud/note-poster-1234567890.png
```

### 2. EmbedService (수정된 FileService)

로컬 저장 대신 Google Drive 임베딩 코드 생성 + 위치 기반 삽입:

```typescript
interface EmbedPosition {
  type: 'cursor' | 'afterSelection';
  // cursor: 현재 커서 위치에 삽입 (전체 노트 모드)
  // afterSelection: 선택 영역 끝 다음 라인에 삽입 (선택 영역 모드)
  cursorLine?: number;
  selectionEndLine?: number;
}

class EmbedService {
  // Google Drive 이미지를 노트에 임베딩
  async embedDriveImageInNote(
    editor: Editor,             // 에디터 인스턴스
    noteFile: TFile,
    uploadResult: DriveUploadResult,
    options: EmbedOptions,
    position: EmbedPosition     // 삽입 위치 정보
  ): Promise<void>

  // 임베딩 HTML 생성 (iframe 또는 img 태그)
  generateImageEmbed(
    uploadResult: DriveUploadResult,
    size: EmbedSize,
    showTitle: boolean
  ): string

  // 삽입 위치 결정
  private getInsertPosition(editor: Editor, inputSource: InputSource): EmbedPosition
}

// 삽입 위치 로직:
// - inputSource === 'fullNote': 커서 위치에 삽입
// - inputSource === 'selection': 선택 영역 끝 다음 라인에 삽입
```

### 3. PromptService (수정 - GLM 추가)

NanoBanana PRO에서 가져오고 GLM 지원 추가:

```typescript
class PromptService {
  // ... 기존 메서드들 ...

  // GLM API 호출 추가
  private async callGLM(model: string, apiKey: string, content: string): Promise<string> {
    const response = await requestUrl({
      url: 'https://open.bigmodel.cn/api/paas/v4/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: model,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'user', content: `Create an image prompt for the following content:\n\n${content}` }
        ],
        temperature: 0.7
      })
    });

    const data = response.json;
    return data.choices[0]?.message?.content?.trim() || '';
  }
}
```

### 4. 인포그래픽 서브 스타일 프롬프트 (settingsData.ts)

```typescript
// 인포그래픽 서브 스타일별 프롬프트 템플릿
const INFOGRAPHIC_SUB_STYLE_PROMPTS: Record<InfographicSubStyle, {
  name: string;
  nameEn: string;
  description: string;
  systemPrompt: string;
}> = {
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
```

### 5. 기존 서비스 재사용

- **ImageService**: NanoBanana PRO에서 그대로 가져옴 (인포그래픽 서브스타일 프롬프트 적용 로직 추가)
- **GoogleOAuthFlow**: Drive Embedder에서 그대로 가져옴

## 메인 플로우 구현

```typescript
// main.ts
async generatePoster(editor: Editor): Promise<void> {
  // 1. 노트 및 에디터 확인
  const noteFile = this.getActiveNote();

  // 2. Google Drive 연결 확인
  if (!this.isGoogleDriveConnected()) {
    new Notice('Google Drive에 먼저 연결해주세요.');
    return;
  }

  // 3. 옵션 선택 (QuickOptionsModal) - 입력 소스 선택 포함
  const options = await this.showQuickOptionsModal();
  if (!options.confirmed) return;

  // 4. 입력 소스에 따른 콘텐츠 추출
  let content: string;
  let embedPosition: EmbedPosition;

  if (options.inputSource === 'selection') {
    // 선택 영역 모드
    const selection = editor.getSelection();
    if (!selection || selection.trim() === '') {
      new Notice('텍스트를 선택해주세요.');
      return;
    }
    content = selection;
    embedPosition = {
      type: 'afterSelection',
      selectionEndLine: editor.getCursor('to').line
    };
  } else {
    // 전체 노트 모드 (기본값)
    content = await this.app.vault.read(noteFile);
    embedPosition = {
      type: 'cursor',
      cursorLine: editor.getCursor().line
    };
  }

  // 5. 프롬프트 생성
  progressModal.update('프롬프트 생성 중...', 20);
  const promptResult = await this.promptService.generatePrompt(
    content, provider, model, apiKey  // content: 전체 노트 또는 선택 영역
  );

  // 6. 프롬프트 미리보기 (선택사항)
  if (this.settings.showPreviewBeforeGeneration) {
    const previewResult = await this.showPreviewModal(promptResult.prompt);
    if (!previewResult.confirmed) return;
    finalPrompt = previewResult.prompt;
  }

  // 7. 이미지 생성
  progressModal.update('이미지 생성 중...', 50);
  const imageResult = await this.imageService.generateImage(
    finalPrompt, googleApiKey, imageModel, style, language, size
  );

  // 8. Google Drive 업로드 (년/월 폴더 구조 + 중복 처리)
  progressModal.update('Google Drive에 업로드 중...', 70);
  const fileName = `${noteFile.basename}-poster-${Date.now()}.png`;
  const uploadResult = await this.driveUploadService.uploadImage(
    imageResult.imageData,
    imageResult.mimeType,
    fileName,
    this.settings.driveFolder,
    this.settings.organizeFoldersByDate  // 년/월 폴더 생성 여부
  );

  // 9. 노트에 임베딩 (위치에 따라 삽입)
  progressModal.update('노트에 삽입 중...', 90);
  await this.embedService.embedDriveImageInNote(
    editor,
    noteFile,
    uploadResult,
    { size: embedSize, showTitle: showTitleInEmbed },
    embedPosition  // cursor 또는 afterSelection
  );

  // 10. 완료
  progressModal.showSuccess();
}
```

## QuickOptionsModal UI 설계

```
┌─────────────────────────────────────────────────────────────────┐
│  🎨 Knowledge Poster 생성                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│  📄 입력 소스                                                    │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● 전체 노트 (기본값)     ○ 선택 영역                     │   │
│  └─────────────────────────────────────────────────────────┘   │
│  ℹ️ 전체 노트: 커서 위치에 삽입 / 선택 영역: 선택 끝에 삽입      │
│                                                                 │
│  🎨 이미지 스타일                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  📊 Infographic  │  🎨 Poster  │  📐 Diagram            │   │
│  │  🧠 Mind Map     │  📅 Timeline │  🎬 Cartoon           │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📊 인포그래픽 서브 스타일 (Infographic 선택시 표시)              │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ● 일반          - 기본 인포그래픽                        │   │
│  │  ○ 스토리텔링    - 카드뉴스, SNS 홍보                     │   │
│  │  ○ TED-Ed       - 교육 자료, 튜토리얼                    │   │
│  │  ○ 저널리즘     - 보도자료, 분석 리포트                   │   │
│  │  ○ 게이미피케이션 - 이벤트, 프로세스 설명                 │   │
│  │  ○ VC 피칭      - 투자 제안서, 비즈니스 피칭              │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  📐 이미지 해상도                                                │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ 1K (1024px)  │  ○ 2K (2048px)  │  ● 4K (4096px)     │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│  🎬 만화 컷 수 (Cartoon 스타일 선택시 표시)                       │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │  ○ 4컷  │  ○ 6컷  │  ● 8컷  │  ○ 커스텀: [__]          │   │
│  └─────────────────────────────────────────────────────────┘   │
│                                                                 │
│                            [취소]  [생성하기]                     │
└─────────────────────────────────────────────────────────────────┘
```

### QuickOptionsResult 타입

```typescript
interface QuickOptionsResult {
  confirmed: boolean;
  inputSource: InputSource;           // 'fullNote' | 'selection'
  imageStyle: ImageStyle;             // 'infographic' | 'poster' | ...
  infographicSubStyle?: InfographicSubStyle;  // imageStyle이 'infographic'일 때만
  imageSize: ImageSize;               // '1K' | '2K' | '4K'
  cartoonCuts?: CartoonCuts;          // imageStyle이 'cartoon'일 때만
  customCartoonCuts?: number;
}
```

## 중복 파일명 처리 로직

```typescript
// DriveUploadService 내 중복 처리 메서드
private async getUniqueFileName(folderId: string, originalName: string): Promise<string> {
  const accessToken = await this.ensureValidToken();

  // 파일명과 확장자 분리
  const lastDotIndex = originalName.lastIndexOf('.');
  const baseName = lastDotIndex > 0 ? originalName.slice(0, lastDotIndex) : originalName;
  const extension = lastDotIndex > 0 ? originalName.slice(lastDotIndex) : '';

  // 동일 이름 파일 검색
  let fileName = originalName;
  let counter = 1;

  while (await this.fileExists(folderId, fileName, accessToken)) {
    fileName = `${baseName}-${counter}${extension}`;
    counter++;
  }

  return fileName;
}

private async fileExists(folderId: string, fileName: string, accessToken: string): Promise<boolean> {
  const query = `name='${fileName}' and '${folderId}' in parents and trashed=false`;

  const response = await requestUrl({
    url: `${this.API_URL}/files?q=${encodeURIComponent(query)}&fields=files(id)`,
    method: 'GET',
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });

  return response.json.files && response.json.files.length > 0;
}

// 예시:
// 원본: note-poster-1734012345678.png
// 중복시: note-poster-1734012345678-1.png
// 또 중복: note-poster-1734012345678-2.png
```

## 년/월 폴더 구조 생성 로직

```typescript
// DriveUploadService 내 폴더 구조 생성
private async ensureFolderWithDateStructure(
  basePath: string,
  organizeByDate: boolean
): Promise<string> {
  // 기본 폴더 경로 생성
  let folderId = await this.ensureFolder(basePath);

  if (organizeByDate) {
    const now = new Date();
    const year = now.getFullYear().toString();        // "2025"
    const month = (now.getMonth() + 1).toString().padStart(2, '0');  // "12"

    // 년도 폴더 생성/확인
    folderId = await this.ensureSubfolder(folderId, year);

    // 월 폴더 생성/확인
    folderId = await this.ensureSubfolder(folderId, month);
  }

  return folderId;
}

// 결과 폴더 구조:
// Obsidian/NanoBananaCloud/2025/12/
```

## 개발 단계

### Phase 1: 프로젝트 초기화 (1일)
- [ ] 새 플러그인 프로젝트 생성 (package.json, tsconfig.json, esbuild.config.mjs)
- [ ] 기본 파일 구조 설정
- [ ] 타입 정의 (types.ts) - GLM, InputSource 타입 포함
- [ ] 기본 설정 구조 (settingsData.ts)

### Phase 2: 기존 서비스 통합 (2일)
- [ ] PromptService 가져오기 + GLM 지원 추가
- [ ] ImageService 가져오기 (NanoBanana PRO)
- [ ] GoogleOAuthFlow 가져오기 (Drive Embedder)
- [ ] 타입 호환성 확인 및 조정

### Phase 3: 새 서비스 개발 (2일)
- [ ] DriveUploadService 구현
  - base64 → Google Drive 업로드
  - 년/월 폴더 구조 생성
  - 중복 파일명 처리
- [ ] EmbedService 구현
  - Drive 이미지 임베딩
  - 커서/선택영역 위치 기반 삽입
- [ ] 에러 처리 통합

### Phase 4: UI 구현 (2일)
- [ ] 설정 탭 UI (settings.ts)
  - AI Provider 설정 섹션 (GLM 포함)
  - Google Drive OAuth 섹션 (연결/해제 버튼)
  - 이미지 생성 설정 섹션
  - 임베딩 설정 섹션
  - 폴더 구조 옵션 (년/월 하위폴더)
- [ ] QuickOptionsModal 수정 (입력 소스 선택 추가)
- [ ] PreviewModal, ProgressModal 가져오기

### Phase 5: 메인 로직 통합 (1일)
- [ ] main.ts 구현 (editorCallback 사용)
- [ ] 명령어 등록 (generate-poster, generate-prompt-only, regenerate)
- [ ] 리본 아이콘 추가

### Phase 6: 테스트 및 마무리 (1일)
- [ ] 통합 테스트
- [ ] 에러 케이스 테스트 (중복 파일, 선택 영역 없음 등)
- [ ] README.md 작성
- [ ] 빌드 및 배포 준비

## 임베딩 코드 예시

생성된 이미지가 Google Drive에 업로드된 후 노트에 삽입되는 코드:

```html
<!-- 기본 이미지 임베딩 -->
<div style="width: 100%; margin: 0 auto; text-align: center;">
<a href="https://drive.google.com/file/d/{fileId}/view" target="_blank">
<img
    src="https://drive.google.com/thumbnail?id={fileId}&sz=w1000"
    alt="Knowledge Poster"
    style="max-width: 100%; border-radius: 8px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);"
/>
</a>
</div>
```

## 차별점 (기존 플러그인 대비)

| 기능 | NanoBanana PRO | Drive Embedder | NanoBanana Cloud |
|------|----------------|----------------|------------------|
| AI 프롬프트 생성 | ✅ | ❌ | ✅ |
| AI 이미지 생성 | ✅ | ❌ | ✅ |
| AI Provider (GLM) | ❌ | ❌ | ✅ |
| 선택 영역 처리 | ❌ | ❌ | ✅ |
| 로컬 저장 | ✅ | ❌ | ❌ |
| Google Drive 업로드 | ❌ | ✅ | ✅ |
| 년/월 폴더 구조 | ❌ | ❌ | ✅ |
| 중복 파일명 처리 | ❌ | ❌ | ✅ |
| 임베딩 생성 | 로컬 링크 | iframe/img | iframe/img |
| 용량 제한 | Vault 저장공간 | Drive 15GB+ | Drive 15GB+ |
| 공유 가능성 | 제한적 | ✅ | ✅ |

## 예상 사용 시나리오

1. **학습 노트 → 인포그래픽**: 공부한 내용을 시각화하여 복습 및 공유
2. **블로그 포스트 초안 → 썸네일**: 블로그 글의 썸네일 이미지 자동 생성
3. **프로젝트 문서 → 다이어그램**: 기술 문서의 아키텍처 다이어그램 생성
4. **아이디어 노트 → 마인드맵**: 브레인스토밍 내용 시각화

## 기술 요구사항

- Node.js 16+
- TypeScript 4.7+
- Obsidian 1.0+
- Google Cloud Console 프로젝트 (OAuth 설정)
- AI API 키 (최소 Google API Key 필요)
