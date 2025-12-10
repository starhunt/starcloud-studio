# NanoBanana Cloud

AI-powered Knowledge Poster generator for Obsidian with Google Drive integration.

## Features

- **5 AI Providers**: OpenAI, Google Gemini, Anthropic, xAI, GLM (智谱AI)
- **6 Image Styles**: Infographic, Poster, Diagram, Mind Map, Timeline, Cartoon
- **6 Infographic Sub-Styles**: General, Visual Storytelling, TED-Ed, Journalism, Gamification, VC Pitch
- **Smart Input Source**: Full note (insert at cursor) or Selection (insert after selection)
- **Google Drive Upload**: Auto year/month folder organization + duplicate filename handling
- **7 Languages**: Korean, English, Japanese, Chinese, Spanish, French, German
- **Prompt Preview**: Edit AI-generated prompts before image generation
- **Auto Retry**: Exponential backoff for transient failures

## Installation

1. Build the plugin:
   ```bash
   cd nanobanana-cloud
   npm install
   npm run build
   ```

2. Copy to your Obsidian vault:
   ```bash
   cp -r nanobanana-cloud /path/to/vault/.obsidian/plugins/
   ```

3. Enable the plugin in Obsidian Settings → Community Plugins

## Configuration

### Required Settings

1. **Google API Key** (for Gemini image generation)
2. **AI Provider API Key** (for prompt generation - OpenAI, Anthropic, xAI, or GLM)
3. **Google OAuth Credentials** (Client ID & Secret from Google Cloud Console)

### Google Cloud Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing
3. Enable Google Drive API
4. Create OAuth 2.0 credentials (Desktop app type)
5. Add `http://localhost:8586/callback` to authorized redirect URIs

## Usage

1. Open a note in Obsidian
2. Run command: `Generate Knowledge Poster` (Cmd/Ctrl + P)
3. Select options in Quick Options Modal:
   - Input Source (Full Note / Selection)
   - Image Style
   - Infographic Sub-Style (if infographic selected)
   - Resolution
4. Preview and edit the generated prompt (optional)
5. Wait for image generation and Google Drive upload
6. Image is automatically embedded in your note

## Commands

| Command | Description |
|---------|-------------|
| `Generate Knowledge Poster` | Generate poster from full note or selection |
| `Generate Poster from Selection` | Generate poster from selected text only |
| `Connect to Google Drive` | Start OAuth flow to connect Drive |

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
│   │   ├── promptService.ts      # AI prompt generation
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

## Acknowledgments

This project was built by combining and extending features from the following open-source projects:

- [NanoBanana PRO Obsidian](https://github.com/reallygood83/nanobanana-pro-obsidian) - AI-powered Knowledge Poster generator
- [Obsidian Embedder](https://github.com/reallygood83/obsidian-embedder) - Google Drive file uploader with embed code generation

Thank you to the original authors for their excellent work!

## License

MIT
