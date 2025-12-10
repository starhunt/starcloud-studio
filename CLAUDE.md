# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This workspace contains two reference Obsidian plugin projects for studying plugin development patterns:

- **refProj/nanobanana-pro-obsidian/** - AI-powered Knowledge Poster (infographic) generator
- **refProj/obsidian-embedder/** - Google Drive file uploader with embed code generation

Both plugins follow the standard Obsidian plugin architecture using TypeScript and esbuild.

## Build Commands

Both plugins use identical npm scripts:

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

### Obsidian Plugin Structure

Both plugins follow this pattern:
- Entry point: `src/main.ts` exports a class extending `Plugin`
- Settings: `src/settings.ts` contains `PluginSettingTab` implementation
- Types: `src/types.ts` defines TypeScript interfaces and type unions
- Services: Business logic separated into `src/services/` (nanobanana) or `src/` (embedder)

### NanoBanana PRO Architecture

Service layer pattern with three main services:
- `PromptService` - AI prompt generation via OpenAI, Google Gemini, Anthropic, or xAI
- `ImageService` - Image generation using Google Gemini's image output
- `FileService` - Vault operations (save image, embed in note)

Modal-based UX flow:
1. `QuickOptionsModal` - Style/size selection
2. `PreviewModal` - Prompt preview/edit before generation
3. `ProgressModal` - Step-by-step progress tracking

### Drive Embedder Architecture

OAuth-based Google Drive integration:
- `GoogleOAuthFlow` - Desktop app OAuth 2.0 flow with local redirect server
- `GoogleDriveUploader` - File upload with automatic token refresh
- `EmbedGenerator` - Creates HTML/markdown embed code
- `UploadModal` - File selection and size options

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
  callback: () => this.methodName()
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
NanoBanana uses `executeWithRetry()` for transient API failures with configurable retry count.

## API Integrations

### NanoBanana AI Providers
- OpenAI: `https://api.openai.com/v1/chat/completions`
- Google Gemini: `https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent`
- Anthropic: `https://api.anthropic.com/v1/messages`
- xAI: `https://api.x.ai/v1/chat/completions`

Image generation always uses Google Gemini with `responseModalities: ["TEXT", "IMAGE"]`.

### Drive Embedder
Uses Google Drive API v3 with OAuth 2.0 (desktop app flow on port 8586).
