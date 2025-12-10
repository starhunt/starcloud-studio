import { App, PluginSettingTab, Setting, Notice } from 'obsidian';
import type NanoBananaCloudPlugin from './main';
import {
  AIProvider,
  PROVIDER_CONFIGS,
  SUGGESTED_IMAGE_MODELS,
  ImageStyle,
  IMAGE_STYLES,
  InfographicSubStyle,
  INFOGRAPHIC_SUB_STYLES,
  ImageSize,
  CartoonCuts,
  PreferredLanguage,
  LANGUAGE_NAMES,
  InputSource,
  EmbedSize,
  EMBED_SIZES
} from './types';

export class NanoBananaCloudSettingTab extends PluginSettingTab {
  plugin: NanoBananaCloudPlugin;

  constructor(app: App, plugin: NanoBananaCloudPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();

    // Google Drive Connection Section
    this.createDriveConnectionSection(containerEl);

    // Google Drive OAuth Section
    this.createOAuthSection(containerEl);

    // AI Provider Section
    this.createAIProviderSection(containerEl);

    // Image Generation Section
    this.createImageGenerationSection(containerEl);

    // Google Drive Settings Section
    this.createDriveSettingsSection(containerEl);

    // Embedding Section
    this.createEmbeddingSection(containerEl);

    // UX Section
    this.createUXSection(containerEl);
  }

  private createDriveConnectionSection(containerEl: HTMLElement) {
    const connectionDiv = containerEl.createDiv({ cls: 'nanobanana-connection-section' });

    new Setting(connectionDiv)
      .setName('Google Drive Connection')
      .setHeading();

    const isConnected = this.plugin.isGoogleDriveConnected();

    const statusDiv = connectionDiv.createDiv({ cls: 'connection-status' });
    if (isConnected) {
      statusDiv.createSpan({ cls: 'status-connected', text: '✅ Connected to Google Drive' });
    } else {
      statusDiv.createSpan({ cls: 'status-disconnected', text: '❌ Not connected' });
    }

    if (isConnected) {
      new Setting(connectionDiv)
        .setName('Disconnect')
        .setDesc('Disconnect from Google Drive')
        .addButton(button => button
          .setButtonText('Disconnect')
          .setWarning()
          .onClick(async () => {
            await this.plugin.disconnectGoogleDrive();
            this.display();
          })
        );
    } else {
      new Setting(connectionDiv)
        .setName('Connect to Google Drive')
        .setDesc('Enter OAuth credentials below, then click Connect')
        .addButton(button => button
          .setButtonText('Connect')
          .setCta()
          .onClick(async () => {
            const success = await this.plugin.startOAuthFlow();
            if (success) {
              this.display();
            }
          })
        );
    }
  }

  private createOAuthSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Google OAuth Credentials')
      .setHeading();

    new Setting(containerEl)
      .setName('Client ID')
      .setDesc('OAuth Client ID from Google Cloud Console')
      .addText(text => text
        .setPlaceholder('xxx.apps.googleusercontent.com')
        .setValue(this.plugin.settings.googleClientId)
        .onChange(async (value) => {
          this.plugin.settings.googleClientId = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Client Secret')
      .setDesc('OAuth Client Secret from Google Cloud Console')
      .addText(text => text
        .setPlaceholder('GOCSPX-...')
        .setValue(this.plugin.settings.googleClientSecret)
        .onChange(async (value) => {
          this.plugin.settings.googleClientSecret = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createAIProviderSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('AI Provider Settings')
      .setHeading();

    // Provider Selection
    new Setting(containerEl)
      .setName('Prompt Generation Provider')
      .setDesc('Select AI provider for generating image prompts')
      .addDropdown(dropdown => {
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.selectedProvider);
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.selectedProvider = value;
          this.plugin.settings.promptModel = PROVIDER_CONFIGS[value].defaultModel;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Model Selection - Text input with suggestions
    const currentProvider = this.plugin.settings.selectedProvider;
    const providerConfig = PROVIDER_CONFIGS[currentProvider];

    new Setting(containerEl)
      .setName('Prompt Model')
      .setDesc(`Model to use for prompt generation. Suggestions: ${providerConfig.suggestedModels}`)
      .addText(text => text
        .setPlaceholder(providerConfig.defaultModel)
        .setValue(this.plugin.settings.promptModel)
        .onChange(async (value) => {
          this.plugin.settings.promptModel = value || providerConfig.defaultModel;
          await this.plugin.saveSettings();
        })
      );

    // API Keys Section
    new Setting(containerEl)
      .setName('API Keys')
      .setHeading();

    new Setting(containerEl)
      .setName('Google API Key')
      .setDesc('Required for image generation (Gemini)')
      .addText(text => text
        .setPlaceholder('AIza...')
        .setValue(this.plugin.settings.googleApiKey)
        .onChange(async (value) => {
          this.plugin.settings.googleApiKey = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('OpenAI API Key')
      .setDesc('Optional: For prompt generation')
      .addText(text => text
        .setPlaceholder('sk-...')
        .setValue(this.plugin.settings.openaiApiKey)
        .onChange(async (value) => {
          this.plugin.settings.openaiApiKey = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Anthropic API Key')
      .setDesc('Optional: For prompt generation')
      .addText(text => text
        .setPlaceholder('sk-ant-...')
        .setValue(this.plugin.settings.anthropicApiKey)
        .onChange(async (value) => {
          this.plugin.settings.anthropicApiKey = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('xAI API Key')
      .setDesc('Optional: For prompt generation')
      .addText(text => text
        .setPlaceholder('xai-...')
        .setValue(this.plugin.settings.xaiApiKey)
        .onChange(async (value) => {
          this.plugin.settings.xaiApiKey = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('GLM API Key (智谱AI)')
      .setDesc('Optional: For prompt generation')
      .addText(text => text
        .setPlaceholder('Your GLM API key')
        .setValue(this.plugin.settings.glmApiKey)
        .onChange(async (value) => {
          this.plugin.settings.glmApiKey = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createImageGenerationSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Image Generation Settings')
      .setHeading();

    // Image Model - Text input with suggestions
    new Setting(containerEl)
      .setName('Image Model')
      .setDesc(`Google Gemini model for image generation. Must support image output. Suggestions: ${SUGGESTED_IMAGE_MODELS}`)
      .addText(text => text
        .setPlaceholder('gemini-2.0-flash-exp')
        .setValue(this.plugin.settings.imageModel)
        .onChange(async (value) => {
          this.plugin.settings.imageModel = value || 'gemini-2.0-flash-exp';
          await this.plugin.saveSettings();
        })
      );

    // Image Style
    new Setting(containerEl)
      .setName('Default Image Style')
      .setDesc('Default visual style for generated images')
      .addDropdown(dropdown => {
        const styleNames: Record<ImageStyle, string> = {
          infographic: '📊 Infographic',
          poster: '🎨 Poster',
          diagram: '📐 Diagram',
          mindmap: '🧠 Mind Map',
          timeline: '📅 Timeline',
          cartoon: '🎬 Cartoon'
        };
        Object.entries(styleNames).forEach(([key, name]) => {
          dropdown.addOption(key, name);
        });
        dropdown.setValue(this.plugin.settings.imageStyle);
        dropdown.onChange(async (value: ImageStyle) => {
          this.plugin.settings.imageStyle = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Infographic Sub-Style (only show when infographic is selected)
    if (this.plugin.settings.imageStyle === 'infographic') {
      new Setting(containerEl)
        .setName('Infographic Sub-Style')
        .setDesc('Specialized infographic style')
        .addDropdown(dropdown => {
          Object.entries(INFOGRAPHIC_SUB_STYLES).forEach(([key, config]) => {
            dropdown.addOption(key, `${config.name} - ${config.description}`);
          });
          dropdown.setValue(this.plugin.settings.infographicSubStyle);
          dropdown.onChange(async (value: InfographicSubStyle) => {
            this.plugin.settings.infographicSubStyle = value;
            await this.plugin.saveSettings();
          });
        });
    }

    // Image Size
    new Setting(containerEl)
      .setName('Image Resolution')
      .setDesc('Resolution for generated images')
      .addDropdown(dropdown => {
        dropdown.addOption('1K', '1K (1024px)');
        dropdown.addOption('2K', '2K (2048px)');
        dropdown.addOption('4K', '4K (4096px)');
        dropdown.setValue(this.plugin.settings.imageSize);
        dropdown.onChange(async (value: ImageSize) => {
          this.plugin.settings.imageSize = value;
          await this.plugin.saveSettings();
        });
      });

    // Cartoon Cuts (only show when cartoon is selected)
    if (this.plugin.settings.imageStyle === 'cartoon') {
      new Setting(containerEl)
        .setName('Cartoon Cuts')
        .setDesc('Number of panels for cartoon style')
        .addDropdown(dropdown => {
          dropdown.addOption('4', '4 Cuts (2x2)');
          dropdown.addOption('6', '6 Cuts (2x3)');
          dropdown.addOption('8', '8 Cuts (2x4)');
          dropdown.addOption('custom', 'Custom');
          dropdown.setValue(this.plugin.settings.cartoonCuts);
          dropdown.onChange(async (value: CartoonCuts) => {
            this.plugin.settings.cartoonCuts = value;
            await this.plugin.saveSettings();
            this.display();
          });
        });

      if (this.plugin.settings.cartoonCuts === 'custom') {
        new Setting(containerEl)
          .setName('Custom Cuts Number')
          .setDesc('Enter custom number of cuts (2-12)')
          .addText(text => text
            .setPlaceholder('4')
            .setValue(String(this.plugin.settings.customCartoonCuts))
            .onChange(async (value) => {
              const num = parseInt(value) || 4;
              this.plugin.settings.customCartoonCuts = Math.min(12, Math.max(2, num));
              await this.plugin.saveSettings();
            })
          );
      }
    }

    // Language
    new Setting(containerEl)
      .setName('Image Language')
      .setDesc('Language for text in generated images')
      .addDropdown(dropdown => {
        Object.entries(LANGUAGE_NAMES).forEach(([key, name]) => {
          dropdown.addOption(key, name);
        });
        dropdown.setValue(this.plugin.settings.preferredLanguage);
        dropdown.onChange(async (value: PreferredLanguage) => {
          this.plugin.settings.preferredLanguage = value;
          await this.plugin.saveSettings();
        });
      });
  }

  private createDriveSettingsSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Google Drive Settings')
      .setHeading();

    new Setting(containerEl)
      .setName('Upload Folder')
      .setDesc('Base folder path in Google Drive')
      .addText(text => text
        .setPlaceholder('Obsidian/NanoBananaCloud')
        .setValue(this.plugin.settings.driveFolder)
        .onChange(async (value) => {
          this.plugin.settings.driveFolder = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Organize by Date')
      .setDesc('Create year/month subfolders (e.g., 2025/12/)')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.organizeFoldersByDate)
        .onChange(async (value) => {
          this.plugin.settings.organizeFoldersByDate = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createEmbeddingSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Embedding Settings')
      .setHeading();

    new Setting(containerEl)
      .setName('Default Input Source')
      .setDesc('Default content source for image generation')
      .addDropdown(dropdown => {
        dropdown.addOption('fullNote', 'Full Note (embed at cursor)');
        dropdown.addOption('selection', 'Selection (embed after selection)');
        dropdown.addOption('custom', 'Custom Input (enter text manually)');
        dropdown.setValue(this.plugin.settings.defaultInputSource);
        dropdown.onChange(async (value: InputSource) => {
          this.plugin.settings.defaultInputSource = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Embed Size')
      .setDesc('Default size for embedded images')
      .addDropdown(dropdown => {
        Object.entries(EMBED_SIZES).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.embedSize);
        dropdown.onChange(async (value: EmbedSize) => {
          this.plugin.settings.embedSize = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Show Filename')
      .setDesc('Display filename above embedded image')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showTitleInEmbed)
        .onChange(async (value) => {
          this.plugin.settings.showTitleInEmbed = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createUXSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('UX Settings')
      .setHeading();

    new Setting(containerEl)
      .setName('Show Prompt Preview')
      .setDesc('Preview and edit prompt before generating image')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showPreviewBeforeGeneration)
        .onChange(async (value) => {
          this.plugin.settings.showPreviewBeforeGeneration = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Show Progress Modal')
      .setDesc('Display progress during generation')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showProgressModal)
        .onChange(async (value) => {
          this.plugin.settings.showProgressModal = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('Auto-Retry Count')
      .setDesc('Number of automatic retries on failure')
      .addDropdown(dropdown => {
        dropdown.addOption('0', '0 (No retry)');
        dropdown.addOption('1', '1');
        dropdown.addOption('2', '2');
        dropdown.addOption('3', '3');
        dropdown.setValue(String(this.plugin.settings.autoRetryCount));
        dropdown.onChange(async (value) => {
          this.plugin.settings.autoRetryCount = parseInt(value);
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('Custom Prompt Prefix')
      .setDesc('Optional prefix added to all generated prompts')
      .addTextArea(text => text
        .setPlaceholder('Enter custom instructions...')
        .setValue(this.plugin.settings.customPromptPrefix)
        .onChange(async (value) => {
          this.plugin.settings.customPromptPrefix = value;
          await this.plugin.saveSettings();
        })
      );
  }
}
