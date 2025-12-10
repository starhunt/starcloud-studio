# NanoBanana Cloud

AI-powered Knowledge Poster generator for Obsidian with Google Drive integration.

## Features

- **5 AI Providers**: OpenAI, Google Gemini, Anthropic, xAI, GLM (z.ai)
- **6 Image Styles**: Infographic, Poster, Diagram, Mind Map, Timeline, Cartoon
- **6 Infographic Sub-Styles**: General, Visual Storytelling, TED-Ed, Journalism, Gamification, VC Pitch
- **3 Input Modes**: Full Note, Selection, Custom Input (manual text entry)
- **Google Drive Upload**: Auto year/month folder organization + duplicate filename handling
- **7 Languages**: Korean, English, Japanese, Chinese, Spanish, French, German
- **Flexible Model Selection**: Text input for models (easily update when new models are released)
- **Prompt Preview**: Edit AI-generated prompts before image generation
- **Auto Retry**: Exponential backoff for transient failures

## Installation

### From Release (Recommended)

1. Download `main.js` and `manifest.json` from [Releases](https://github.com/starhunt/nanobanana-cloud/releases)
2. Create folder: `<vault>/.obsidian/plugins/nanobanana-cloud/`
3. Copy downloaded files to the folder
4. Enable plugin in Obsidian Settings → Community Plugins

### From Source

1. Build the plugin:
   ```bash
   cd nanobanana-cloud
   npm install
   npm run build
   ```

2. Copy to your Obsidian vault:
   ```bash
   cp main.js manifest.json /path/to/vault/.obsidian/plugins/nanobanana-cloud/
   ```

3. Enable the plugin in Obsidian Settings → Community Plugins

## Configuration

### Required Settings

1. **Google API Key** (for Gemini image generation)
2. **AI Provider API Key** (for prompt generation - OpenAI, Gemini, Anthropic, xAI, or GLM)
3. **Google OAuth Credentials** (Client ID & Secret from Google Cloud Console)

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Desktop app type)
5. Add `http://localhost:8586/callback` to authorized redirect URIs

### Default Models

| Setting | Default Value | Suggestions |
|---------|---------------|-------------|
| Image Model | `gemini-3-pro-image-preview` | gemini-2.0-flash-exp, imagen-3.0-generate-002 |
| OpenAI | `gpt-4o` | gpt-4o-mini, gpt-4-turbo |
| Google Gemini | `gemini-2.0-flash` | gemini-2.5-flash, gemini-1.5-pro |
| Anthropic | `claude-sonnet-4-20250514` | claude-3-5-sonnet-20241022 |
| xAI | `grok-4-1-fast` | grok-beta, grok-2-latest |
| GLM (z.ai) | `glm-4.6` | glm-4-flash, glm-4-plus |

## Usage

1. Open a note in Obsidian
2. Run command: `Generate Knowledge Poster` (Cmd/Ctrl + P)
3. Select options in Quick Options Modal:
   - **Input Source**: Full Note / Selection / Custom Input
   - **Image Style**: Infographic, Poster, Diagram, etc.
   - **Infographic Sub-Style** (if infographic selected)
   - **Resolution**: 1K, 2K, 4K
4. Preview and edit the generated prompt (optional)
5. Wait for image generation and Google Drive upload
6. Image is automatically embedded in your note

### Input Source Options

| Mode | Description | Embed Position |
|------|-------------|----------------|
| Full Note | Uses entire note content | At cursor position |
| Selection | Uses selected text only | After selection |
| Custom Input | Enter text manually | At cursor position |

## Commands

| Command | Description |
|---------|-------------|
| `Generate Knowledge Poster` | Generate poster from full note or selection |
| `Generate Poster from Selection` | Generate poster from selected text only |
| `Connect to Google Drive` | Start OAuth flow to connect Drive |

## Embed Sizes

| Option | Width |
|--------|-------|
| Small | 400px |
| Medium | 800px |
| Large | 1200px |
| Full Width | 100% |

## Folder Structure

When `Organize by Date` is enabled (default):
```
Obsidian/NanoBananaCloud/
└── 2025/
    └── 12/
        └── note-name-poster-xxx.png
```

## Infographic Sub-Styles

| Style | Use Case |
|-------|----------|
| General | Default infographic design |
| Visual Storytelling | Card news, SNS promotions |
| TED-Ed | Educational content, tutorials |
| Journalism | Reports, data analysis |
| Gamification | Events, process explanations |
| VC Pitch | Investment proposals |

## Development

```bash
# Install dependencies
npm install

# Development mode (watch)
npm run dev

# Production build
npm run build
```

## Project Structure

```
nanobanana-cloud/
├── src/
│   ├── main.ts              # Plugin entry point
│   ├── settings.ts          # Settings tab UI
│   ├── settingsData.ts      # Default settings & prompts
│   ├── types.ts             # Type definitions
│   ├── services/
│   │   ├── promptService.ts      # AI prompt generation (5 providers)
│   │   ├── imageService.ts       # Gemini image generation
│   │   ├── googleOAuthFlow.ts    # OAuth 2.0 + PKCE
│   │   ├── driveUploadService.ts # Google Drive upload
│   │   └── embedService.ts       # Note embedding
│   └── modals/
│       ├── quickOptionsModal.ts  # Options selection
│       ├── previewModal.ts       # Prompt preview/edit
│       └── progressModal.ts      # Progress display
├── manifest.json
├── package.json
└── tsconfig.json
```

## Changelog

### v1.0.1
- Changed model selection from dropdown to text input with suggestions
- Added Custom Input mode for manual text entry
- Updated embed sizes: 400px, 800px, 1200px, 100%
- GLM provider renamed to GLM (z.ai)
- Default image model: `gemini-3-pro-image-preview`
- Default GLM model: `glm-4.6`

### v1.0.0
- Initial release

## Acknowledgments

This project was built by combining and extending features from the following open-source projects:

- [NanoBanana PRO Obsidian](https://github.com/reallygood83/nanobanana-pro-obsidian) - AI-powered Knowledge Poster generator
- [Obsidian Embedder](https://github.com/reallygood83/obsidian-embedder) - Google Drive file uploader with embed code generation

Thank you to the original authors for their excellent work!

## License

MIT
