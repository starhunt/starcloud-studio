# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

**NanoBanana Cloud** - Obsidian plugin for AI-powered content generation and Google Drive integration.

### Main Features

1. **Knowledge Poster** - AI-generated infographic images from notes
2. **Slide Generation** - PPTX/HTML slides from notes
3. **Speech/TTS** - Text-to-speech audio generation with multiple templates
4. **Drive Embedder** - Google Drive file upload with embed code generation

## Build Commands

```bash
# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build (type-check + bundle)
npm run build
```

The build process uses esbuild (configured in `esbuild.config.mjs`) to bundle TypeScript into a single `main.js` file.

## Architecture

### Directory Structure

```
src/
├── main.ts              # Plugin entry point
├── settings.ts          # Tabbed settings UI (6 tabs)
├── settingsData.ts      # Default settings, prompts, constants
├── types.ts             # TypeScript interfaces and types
├── embedGenerator.ts    # HTML/Markdown embed code generator
├── sizePresets.ts       # Size presets for different content types
├── services/
│   ├── promptService.ts       # AI prompt generation (poster)
│   ├── imageService.ts        # Gemini image generation
│   ├── fileService.ts         # Vault file operations
│   ├── slideService.ts        # AI slide content generation
│   ├── pptxService.ts         # PPTX file generation
│   ├── driveUploadService.ts  # Google Drive upload
│   ├── googleOAuthFlow.ts     # OAuth 2.0 flow
│   ├── speechPromptService.ts # TTS script generation
│   ├── ttsService.ts          # Gemini TTS audio generation
│   ├── audioFileService.ts    # Audio file operations
│   ├── embedService.ts        # Embed service utilities
│   └── gitService.ts          # Git operations
└── modals/
    ├── quickOptionsModal.ts   # Poster style/size selection
    ├── previewModal.ts        # Prompt preview/edit
    ├── progressModal.ts       # Step-by-step progress (poster/slide/speech)
    ├── slideOptionsModal.ts   # Slide generation options
    ├── driveUploadModal.ts    # Drive upload UI (Korean)
    ├── speechOptionsModal.ts  # Speech template/voice selection
    └── speechPreviewModal.ts  # Generated script preview/edit
```

### Settings UI Structure

Tabbed settings with 6 categories:
- **일반 (General)** - Language, folders, default behaviors
- **AI** - Provider selection, API keys, models
- **이미지 (Image)** - Poster generation settings
- **슬라이드 (Slide)** - PPTX generation settings
- **음성 (TTS)** - Speech generation settings, voice selection
- **고급 (Advanced)** - Debug, retry count, experimental features

### Speech/TTS Feature

5 speech templates:
- `key-summary` - 핵심 요약 (Key summary)
- `lecture` - 강의식 (Lecture style)
- `podcast` - 팟캐스트 (Podcast style)
- `notebooklm-dialogue` - NotebookLM 대화 (Two-host dialogue)
- `verbatim` - 원문 그대로 (Verbatim reading)

Custom prompt support available via prompt tab interface.

## Key Patterns

### Settings Management
```typescript
async loadSettings() {
  this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
}
```

### Command Registration
```typescript
this.addCommand({
  id: 'command-id',
  name: 'Command name',
  editorCallback: (editor, view) => this.methodName(editor, view)
});
```

### Modal Promise Pattern
```typescript
private showModal(): Promise<Result> {
  return new Promise((resolve) => {
    const modal = new Modal(this.app, (result) => resolve(result));
    modal.open();
  });
}
```

### Retry with Exponential Backoff
Uses `executeWithRetry()` for transient API failures with configurable retry count.

## API Integrations

### AI Providers (Prompt/Image)
- OpenAI: `https://api.openai.com/v1/chat/completions`
- Google Gemini: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Anthropic: `https://api.anthropic.com/v1/messages`
- xAI: `https://api.x.ai/v1/chat/completions`
- GLM (Zhipu): `https://open.bigmodel.cn/api/paas/v4/chat/completions`

### Image Generation
Uses Google Gemini with `responseModalities: ["TEXT", "IMAGE"]`.

### TTS (Text-to-Speech)
Uses Google Gemini Live API with `responseModalities: ["AUDIO"]` and native multi-speaker support.

### Google Drive
Uses Google Drive API v3 with OAuth 2.0 (desktop app flow on port 8586).

## UI Language

Most UI elements are in Korean (한국어). Key translations:
- Generate = 생성
- Settings = 설정
- Upload = 업로드
- Cancel = 취소
- Confirm = 확인
