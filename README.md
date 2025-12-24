# StarCloud Studio

AI-powered content generation plugin for Obsidian with Google Drive integration.

Generate **Knowledge Posters**, **Interactive Slides (HTML/PPTX)**, and **Speech Audio (TTS)** from your notes using multiple AI providers.

---

## Table of Contents

- [Features](#features)
- [Installation](#installation)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
  - [API Keys Setup](#api-keys-setup)
  - [Google Cloud Setup](#google-cloud-setup)
  - [GitHub Pages Setup](#github-pages-setup-for-html-slides)
- [Usage Guide](#usage-guide)
  - [Knowledge Poster Generation](#knowledge-poster-generation)
  - [Slide Generation (HTML/PPTX)](#slide-generation-htmlpptx)
  - [Speech Generation (TTS)](#speech-generation-tts)
  - [Drive File Upload](#drive-file-upload)
- [Settings Reference](#settings-reference)
- [Folder Structure](#folder-structure)
- [Commands](#commands)
- [Development Guide](#development-guide)
  - [Project Architecture](#project-architecture)
  - [Building from Source](#building-from-source)
  - [Adding New AI Providers](#adding-new-ai-providers)
  - [Key Services](#key-services)
- [Troubleshooting](#troubleshooting)
- [License](#license)

---

## Features

### Content Generation

| Feature | Description |
|---------|-------------|
| **Knowledge Poster** | Generate visual infographics from notes using AI |
| **HTML Slides** | Interactive web-based presentations with GitHub Pages support |
| **PPTX Slides** | PowerPoint presentations with two layout modes |
| **Speech (TTS)** | Convert notes to audio using Google TTS |

### AI Providers

| Provider | Models | Use Cases |
|----------|--------|-----------|
| **OpenAI** | gpt-4o, gpt-4o-mini, gpt-4-turbo | Text generation, prompts |
| **Google Gemini** | gemini-2.5-flash, gemini-2.0-flash | Text + Image generation |
| **Anthropic** | claude-sonnet-4, claude-3-5-sonnet | Text generation, prompts |
| **xAI** | grok-4-1-fast, grok-2-latest | Text generation |
| **GLM (z.ai)** | glm-4.6, glm-4-flash | Text generation |

### Image Generation Styles

- **6 Main Styles**: Infographic, Poster, Diagram, Mind Map, Timeline, Cartoon
- **6 Infographic Sub-Styles**: General, Visual Storytelling, TED-Ed, Journalism, Gamification, VC Pitch
- **3 Resolutions**: 1K, 2K, 4K
- **2 Orientations**: Landscape, Portrait

### Slide Generation Modes

| Mode | Format | Description |
|------|--------|-------------|
| HTML Vertical Scroll | `.html` | Scrollable single-page presentation |
| HTML Presentation | `.html` | Arrow-key navigation slides |
| PPTX Standard | `.pptx` | Fixed layout with 10 slide types |
| PPTX Flexible | `.pptx` | Element-based dynamic layout |

### Integration Features

- **Google Drive Upload**: Auto year/month folder organization
- **GitHub Pages**: Host HTML slides for iframe embedding
- **7 Languages**: Korean, English, Japanese, Chinese, Spanish, French, German

---

## Installation

### From Release (Recommended)

1. Download `main.js`, `manifest.json`, and `styles.css` from [Releases](https://github.com/starhunt/starcloud-studio/releases)
2. Create folder: `<vault>/.obsidian/plugins/starcloud-studio/`
3. Copy downloaded files to the folder
4. Enable plugin in Obsidian Settings → Community Plugins

### From Source

```bash
git clone https://github.com/starhunt/starcloud-studio.git
cd starcloud-studio
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` to your vault's plugin folder.

---

## Quick Start

1. **Install the plugin** (see above)
2. **Configure API Keys** in Settings → StarCloud Studio
   - Google API Key (required for image generation)
   - At least one AI provider key (OpenAI, Gemini, Anthropic, etc.)
3. **Connect Google Drive** (optional but recommended)
   - Set up OAuth credentials in Google Cloud Console
   - Run command: `Connect to Google Drive`
4. **Generate content**
   - Open a note
   - Run command: `Generate Knowledge Poster` or `Generate Slide`

---

## Configuration

### API Keys Setup

#### Google API Key (Required for Images)

1. Go to [Google AI Studio](https://aistudio.google.com/apikey)
2. Create an API key
3. Enter in Settings → API Keys → Google API Key

#### OpenAI

1. Go to [OpenAI API Keys](https://platform.openai.com/api-keys)
2. Create a new secret key
3. Enter in Settings → API Keys → OpenAI API Key

#### Anthropic

1. Go to [Anthropic Console](https://console.anthropic.com/)
2. Create an API key
3. Enter in Settings → API Keys → Anthropic API Key

#### xAI

1. Go to [xAI Console](https://console.x.ai/)
2. Create an API key
3. Enter in Settings → API Keys → xAI API Key

#### GLM (z.ai)

1. Go to [z.ai Platform](https://open.bigmodel.cn/)
2. Create an API key
3. Enter in Settings → API Keys → GLM API Key

### Google Cloud Setup

Required for Google Drive upload functionality.

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable **Google Drive API**
4. Go to **Credentials** → Create Credentials → **OAuth client ID**
5. Select **Desktop app** as application type
6. Add `http://localhost:8586/callback` to **Authorized redirect URIs**
7. Copy **Client ID** and **Client Secret** to plugin settings

### GitHub Pages Setup (for HTML Slides)

Required for embedding HTML slides as iframes.

1. Create a GitHub repository for your slides
2. Enable GitHub Pages in repository Settings
3. In plugin settings, configure:
   - **Git Repository Path**: Local path to the repo
   - **GitHub Branch**: `main` or `gh-pages`
   - **GitHub Token**: Personal access token with repo permissions
   - **GitHub Pages URL**: `https://<username>.github.io/<repo>`

---

## Usage Guide

### Knowledge Poster Generation

1. Open a note in Obsidian
2. Run command: `Generate Knowledge Poster`
3. Select options:
   - **Input Source**: Full Note / Selection / Custom Input
   - **Image Style**: Infographic, Poster, Diagram, etc.
   - **Orientation**: Landscape / Portrait
   - **Resolution**: 1K / 2K / 4K
4. (Optional) Preview and edit the generated prompt
5. Wait for generation and upload
6. Image is embedded in your note

### Slide Generation (HTML/PPTX)

1. Open a note
2. Run command: `Generate Slide`
3. Select options:
   - **Input Source**: Full Note / Selection / Custom Input
   - **Output Format**: HTML Slide / PowerPoint
   - **Style**: Vertical Scroll / Presentation (HTML) or Standard / Flexible (PPTX)
   - **Upload Destination**: Local Only / Google Drive / GitHub Pages
4. Wait for generation
5. Slide is saved and optionally uploaded

#### HTML Slide Styles

| Style | Description |
|-------|-------------|
| Vertical Scroll | Single page, scroll to navigate |
| Presentation | Left/right arrow key navigation |

#### PPTX Slide Styles

| Style | Description |
|-------|-------------|
| Standard | Fixed layouts: Title, Content, Two Column, etc. |
| Flexible | Element-based positioning for complex layouts |

### Speech Generation (TTS)

1. Open a note
2. Run command: `Generate Speech`
3. Select options:
   - **Input Source**: Full Note / Selection / Custom Input
   - **Template**: Summary / Dialogue / Podcast / Lecture
   - **Upload to Drive**: Yes / No
4. (Optional) Preview and edit the generated script
5. Wait for audio generation
6. Audio file is saved and embedded

#### Speech Templates

| Template | Description |
|----------|-------------|
| Summary | Concise summary narration |
| Dialogue | Two-host conversation format |
| Podcast | Casual podcast style |
| Lecture | Educational presentation |

### Drive File Upload

Upload any file from your vault to Google Drive:

1. Run command: `Upload to Google Drive`
2. Select a file from the file picker
3. Choose embed format (iframe, link, image)
4. File is uploaded and embed code is inserted

---

## Settings Reference

### General Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Default Provider | `google` | AI provider for text generation |
| Preferred Language | `ko` | Output language |
| Show Progress Modal | `true` | Display progress during generation |
| Auto Retry Count | `2` | Retry attempts on failure |

### Poster Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Default Style | `infographic` | Default image style |
| Default Orientation | `landscape` | Image orientation |
| Default Resolution | `2k` | Image resolution |
| Embed Size | `medium` | Embedded image width |

### Slide Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Slides Root Path | `StarCloud/Slide` | Local save folder |
| Default Output Format | `html` | HTML or PPTX |
| Default HTML Style | `vertical-scroll` | HTML slide style |
| Default PPTX Style | `standard` | PPTX layout mode |
| Upload Destination | `drive` | Default upload target |

### TTS Settings

| Setting | Default | Description |
|---------|---------|-------------|
| TTS Provider | `google` | Google TTS |
| Audio Format | `mp3` | Output format |
| Audio Folder | `StarCloud/Audio` | Local save folder |

### Google Drive Settings

| Setting | Default | Description |
|---------|---------|-------------|
| Drive Folder | `StarCloud` | Base folder in Drive |
| Organize by Date | `true` | Create year/month subfolders |

---

## Folder Structure

### Local Vault Structure

```
<Vault>/
└── StarCloud/
    ├── Slide/
    │   └── 2025/
    │       └── 12/
    │           └── 20251224123456_slide-title.html
    ├── Audio/
    │   └── note-name-summary-xxx.mp3
    └── Data/
        └── images...
```

### Google Drive Structure

```
StarCloud/
├── Slide/
│   └── 2025/
│       └── 12/
│           └── presentation.pptx
├── Audio/
│   └── 2025/
│       └── 12/
│           └── speech.mp3
└── Data/
    └── 2025/
        └── 12/
            └── poster.png
```

---

## Commands

| Command | Description |
|---------|-------------|
| `Generate Knowledge Poster` | Create AI poster from note |
| `Generate Slide` | Create HTML or PPTX presentation |
| `Generate Speech` | Create TTS audio from note |
| `Connect to Google Drive` | Start OAuth authentication |
| `Upload to Google Drive` | Upload file from vault |

---

## Development Guide

### Project Architecture

```
starcloud-studio/
├── src/
│   ├── main.ts                    # Plugin entry point, command registration
│   ├── settings.ts                # Settings UI (tabbed interface)
│   ├── settingsData.ts            # Default settings, prompts, constants
│   ├── types.ts                   # TypeScript interfaces and types
│   │
│   ├── services/
│   │   ├── promptService.ts       # Multi-provider AI text generation
│   │   ├── imageService.ts        # Gemini image generation
│   │   ├── slideService.ts        # HTML/PPTX content generation
│   │   ├── pptxService.ts         # PPTX file creation (pptxgenjs)
│   │   ├── speechService.ts       # TTS script generation
│   │   ├── googleTTSService.ts    # Google Cloud TTS API
│   │   ├── audioFileService.ts    # Audio file saving
│   │   ├── fileService.ts         # Vault file operations
│   │   ├── googleOAuthFlow.ts     # OAuth 2.0 + PKCE flow
│   │   ├── driveUploadService.ts  # Google Drive upload
│   │   ├── gitService.ts          # Git commit/push for GitHub Pages
│   │   └── embedService.ts        # Note embedding utilities
│   │
│   └── modals/
│       ├── quickOptionsModal.ts   # Poster options UI
│       ├── slideOptionsModal.ts   # Slide options UI
│       ├── speechOptionsModal.ts  # TTS options UI
│       ├── previewModal.ts        # Prompt preview/edit
│       ├── speechPreviewModal.ts  # TTS script preview
│       ├── progressModal.ts       # Generation progress
│       └── driveUploadModal.ts    # Drive upload UI
│
├── manifest.json                  # Obsidian plugin manifest
├── package.json                   # NPM dependencies
├── tsconfig.json                  # TypeScript configuration
├── esbuild.config.mjs             # Build configuration
└── styles.css                     # Plugin styles
```

### Building from Source

```bash
# Clone repository
git clone https://github.com/starhunt/starcloud-studio.git
cd starcloud-studio

# Install dependencies
npm install

# Development mode (watch for changes)
npm run dev

# Production build
npm run build

# Version bump (updates manifest.json and versions.json)
npm run version
```

### Adding New AI Providers

1. **Add provider config** in `src/settingsData.ts`:

```typescript
export const PROVIDER_CONFIGS: Record<AIProvider, ProviderConfig> = {
  // ... existing providers
  'newprovider': {
    name: 'New Provider',
    defaultModel: 'model-name',
    suggestedModels: ['model-1', 'model-2'],
    requiresApiKey: true
  }
};
```

2. **Add type** in `src/types.ts`:

```typescript
export type AIProvider = 'openai' | 'google' | ... | 'newprovider';
```

3. **Implement API call** in `src/services/promptService.ts`:

```typescript
private async callNewProvider(
  prompt: string,
  systemPrompt: string,
  model: string,
  apiKey: string
): Promise<string> {
  // API implementation
}
```

4. **Add to switch statement** in `generatePrompt()` method.

### Key Services

#### PromptService

Handles text generation across all AI providers.

```typescript
const result = await promptService.generatePrompt(
  userPrompt,
  systemPrompt,
  provider,  // 'openai' | 'google' | 'anthropic' | 'xai' | 'glm'
  model,
  apiKey
);
```

#### ImageService

Generates images using Google Gemini.

```typescript
const result = await imageService.generateImage(
  prompt,
  apiKey,
  model,     // 'gemini-2.0-flash-exp'
  aspectRatio  // '16:9' | '9:16' | '1:1'
);
// Returns: { imageData: base64, mimeType: string }
```

#### SlideService

Generates slide content (HTML or JSON for PPTX).

```typescript
// HTML slides
const html = await slideService.generateSlide(content, provider, model, apiKey, systemPrompt);

// PPTX data
const data = await slideService.generatePptxSlideData(content, provider, model, apiKey, systemPrompt);
```

#### GitService

Handles Git operations for GitHub Pages deployment.

```typescript
const gitService = new GitService({
  repoPath: '/path/to/repo',
  branch: 'main',
  token: 'github_token',
  pagesUrl: 'https://user.github.io/repo'
});

const result = await gitService.commitAndPush(filePath, commitMessage);
// Automatically copies file to repo if not already there
```

#### DriveUploadService

Handles Google Drive file uploads with folder management.

```typescript
const result = await driveUploadService.uploadImage(
  imageData,      // base64 string
  mimeType,
  fileName,
  folderPath,     // 'StarCloud/Data'
  organizeByDate  // creates year/month subfolders
);
```

### Modal Development

All modals follow a consistent pattern:

```typescript
export class CustomModal extends Modal {
  private result: ResultType;
  private onSubmit: (result: ResultType) => void;

  constructor(app: App, onSubmit: (result: ResultType) => void) {
    super(app);
    this.onSubmit = onSubmit;
    this.result = { /* defaults */ };
  }

  onOpen() {
    // Build UI using this.contentEl
    this.renderUI();
  }

  onClose() {
    this.onSubmit(this.result);
  }
}
```

### Type Definitions

Key types in `src/types.ts`:

```typescript
// AI Providers
export type AIProvider = 'openai' | 'google' | 'anthropic' | 'xai' | 'glm';

// Poster options
export type ImageStyle = 'infographic' | 'poster' | 'diagram' | 'mindmap' | 'timeline' | 'cartoon';
export type ImageOrientation = 'landscape' | 'portrait';
export type ImageResolution = '1k' | '2k' | '4k';

// Slide options
export type SlideOutputFormat = 'html' | 'pptx';
export type HtmlSlideStyle = 'vertical-scroll' | 'presentation' | 'custom';
export type PptxSlideStyle = 'standard' | 'flexible' | 'custom';
export type SlideUploadDestination = 'none' | 'drive' | 'github';

// TTS options
export type SpeechTemplate = 'summary' | 'dialogue' | 'podcast' | 'lecture';
```

---

## Troubleshooting

### Common Issues

#### "Google Drive not connected"

1. Check OAuth credentials in settings
2. Run `Connect to Google Drive` command
3. Complete the authorization in browser

#### "Git pathspec did not match any files"

This occurs when vault and git repo are different locations. Fixed in v1.0.32 - files are now automatically copied to the repo.

#### "API key not configured"

Ensure you have entered the API key for your selected provider in Settings → API Keys.

#### HTML slides not showing in Obsidian

Obsidian doesn't display HTML files by default. Go to Settings → Files & Links → Enable "Detect all file extensions".

### Debug Logs

Open Developer Console (Cmd/Ctrl + Shift + I) to view detailed logs:

- `[PromptService]` - AI API calls
- `[ImageService]` - Image generation
- `[GitService]` - Git operations
- `[DriveUpload]` - Drive API calls

---

## License

MIT License - see [LICENSE](LICENSE) for details.

---

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/new-feature`
3. Make your changes
4. Run build: `npm run build`
5. Test in Obsidian
6. Submit a pull request

---

## Acknowledgments

- [Obsidian](https://obsidian.md/) - The knowledge base platform
- [pptxgenjs](https://gitbrent.github.io/PptxGenJS/) - PowerPoint generation library
- [배움의 달인 (AI·자동화)](https://www.youtube.com/@%EB%B0%B0%EC%9B%80%EC%9D%98%EB%8B%AC%EC%9D%B8-p5v) - AI automation tutorials
- AI Providers: OpenAI, Google, Anthropic, xAI, z.ai
