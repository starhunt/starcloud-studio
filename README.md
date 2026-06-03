# StarCloud Studio

[English](./README.md) | [한국어](./README_KO.md)

Create AI-powered knowledge posters, slide decks, and audio from your notes, with Google Drive export.

## Features

- Generate knowledge posters and infographic-style images from notes.
- Create HTML slides and PPTX slide decks.
- Generate speech scripts and audio with TTS workflows.
- Upload generated files to Google Drive with organized folders.
- Use multiple AI providers including OpenAI, Gemini, Anthropic, xAI, and GLM.

## Installation

### From Community Plugins

1. Open Settings → Community plugins.
2. Search for **StarCloud Studio**.
3. Install and enable the plugin.

### Manual installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest [GitHub release](https://github.com/starhunt/starcloud-studio/releases/latest).
2. Create the plugin folder: `<vault>/.obsidian/plugins/starcloud-studio/`.
3. Copy the downloaded files into that folder.
4. Restart the app or reload plugins, then enable **StarCloud Studio** in Community plugins.

### Build from source

```bash
git clone https://github.com/starhunt/starcloud-studio.git
cd starcloud-studio
npm install
npm run build
```

Copy `main.js`, `manifest.json`, and `styles.css` into `<vault>/.obsidian/plugins/starcloud-studio/`.

## Usage

1. Enable **StarCloud Studio** in Community plugins.
2. Open the command palette or use the plugin ribbon/sidebar entry.
3. Configure provider keys, folders, templates, or review options in plugin settings as needed.
4. Run the relevant command for your workflow.

## Commands

- `Generate Knowledge Poster`
- `Generate Slide`
- `Generate Speech`
- `Connect to Google Drive`

## Privacy and network use

StarCloud Studio sends selected note content only to the AI providers and Google services that you configure. API keys and OAuth settings are stored locally in plugin settings. The plugin does not collect telemetry.

## Platform

This plugin is desktop-only because it uses desktop-only APIs.

## License

MIT License. See [LICENSE](./LICENSE).
