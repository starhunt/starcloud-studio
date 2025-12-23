import { App, Modal, PluginSettingTab, Setting, Notice } from 'obsidian';
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
  EMBED_SIZES,
  SlidePromptType,
  TTSProvider,
  TTS_PROVIDER_CONFIGS,
  SpeechTemplate,
  SPEECH_TEMPLATE_CONFIGS,
  GEMINI_TTS_VOICES,
  AudioFormat
} from './types';
import { BUILTIN_SLIDE_PROMPTS } from './settingsData';

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

    // Slide Generation Section
    this.createSlideGenerationSection(containerEl);

    // TTS Section
    this.createTTSSection(containerEl);

    // Git Integration Section
    this.createGitIntegrationSection(containerEl);
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
      .setName('GLM API Key')
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
        .setPlaceholder('gemini-3-pro-image-preview')
        .setValue(this.plugin.settings.imageModel)
        .onChange(async (value) => {
          this.plugin.settings.imageModel = value || 'gemini-3-pro-image-preview';
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

  private createSlideGenerationSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Slide Generation Settings')
      .setHeading();

    new Setting(containerEl)
      .setName('Slides Root Folder')
      .setDesc('Root folder path for generated HTML slides (e.g., 999-Slides)')
      .addText(text => text
        .setPlaceholder('999-Slides')
        .setValue(this.plugin.settings.slidesRootPath || '999-Slides')
        .onChange(async (value) => {
          this.plugin.settings.slidesRootPath = value || '999-Slides';
          await this.plugin.saveSettings();
        })
      );

    // Slide AI Provider (separate from default)
    new Setting(containerEl)
      .setName('Slide AI Provider')
      .setDesc('AI provider for slide generation (separate from image generation)')
      .addDropdown(dropdown => {
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.slideProvider || 'google');
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.slideProvider = value;
          this.plugin.settings.slideModel = PROVIDER_CONFIGS[value].defaultModel;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Slide Model
    const slideProvider = this.plugin.settings.slideProvider || 'google';
    const slideProviderConfig = PROVIDER_CONFIGS[slideProvider];

    new Setting(containerEl)
      .setName('Slide Model')
      .setDesc(`Model for slide generation. Suggestions: ${slideProviderConfig.suggestedModels}`)
      .addText(text => text
        .setPlaceholder(slideProviderConfig.defaultModel)
        .setValue(this.plugin.settings.slideModel || slideProviderConfig.defaultModel)
        .onChange(async (value) => {
          this.plugin.settings.slideModel = value || slideProviderConfig.defaultModel;
          await this.plugin.saveSettings();
        })
      );

    // Slide Max Output Tokens
    new Setting(containerEl)
      .setName('Max Output Tokens')
      .setDesc('Maximum tokens for slide generation output (8000-131072). Higher = longer slides but more API cost.')
      .addText(text => text
        .setPlaceholder('65536')
        .setValue(String(this.plugin.settings.slideMaxOutputTokens || 65536))
        .onChange(async (value) => {
          const num = parseInt(value) || 65536;
          this.plugin.settings.slideMaxOutputTokens = Math.min(131072, Math.max(8000, num));
          await this.plugin.saveSettings();
        })
      );

    // Default Slide Prompt Type
    new Setting(containerEl)
      .setName('Default System Prompt')
      .setDesc('Default system prompt for slide generation')
      .addDropdown(dropdown => {
        // Add built-in prompts
        for (const [key, config] of Object.entries(BUILTIN_SLIDE_PROMPTS)) {
          if (key !== 'custom') {
            dropdown.addOption(key, config.name);
          }
        }
        // Add custom prompts
        for (const custom of this.plugin.settings.customSlidePrompts || []) {
          dropdown.addOption(custom.id, `${custom.name} (Custom)`);
        }
        dropdown.setValue(this.plugin.settings.defaultSlidePromptType || 'notebooklm-summary');
        dropdown.onChange(async (value: SlidePromptType) => {
          this.plugin.settings.defaultSlidePromptType = value;
          await this.plugin.saveSettings();
        });
      });

    // Show slide preview before generation
    new Setting(containerEl)
      .setName('Show Slide Options')
      .setDesc('Show options modal before generating slide')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showSlidePreviewBeforeGeneration ?? true)
        .onChange(async (value) => {
          this.plugin.settings.showSlidePreviewBeforeGeneration = value;
          await this.plugin.saveSettings();
        })
      );

    // View/Edit System Prompt
    new Setting(containerEl)
      .setName('View System Prompt')
      .setDesc('View and copy the current system prompt for slide generation')
      .addButton(button => button
        .setButtonText('View Prompt')
        .onClick(() => {
          const promptType = this.plugin.settings.defaultSlidePromptType || 'notebooklm-summary';
          let promptConfig = BUILTIN_SLIDE_PROMPTS[promptType as SlidePromptType];

          // Check custom prompts if not found
          if (!promptConfig) {
            promptConfig = this.plugin.settings.customSlidePrompts?.find(p => p.id === promptType) || BUILTIN_SLIDE_PROMPTS['notebooklm-summary'];
          }

          // Create a simple modal to show the prompt
          const modal = new SystemPromptViewModal(this.app, promptConfig.name, promptConfig.prompt);
          modal.open();
        })
      );
  }

  private createTTSSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Text-to-Speech Settings')
      .setHeading();

    // TTS Provider
    new Setting(containerEl)
      .setName('TTS Provider')
      .setDesc('Select the text-to-speech provider')
      .addDropdown(dropdown => {
        Object.entries(TTS_PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.ttsProvider);
        dropdown.onChange(async (value: TTSProvider) => {
          this.plugin.settings.ttsProvider = value;
          this.plugin.settings.ttsModel = TTS_PROVIDER_CONFIGS[value].defaultModel;
          this.plugin.settings.defaultTtsVoice = TTS_PROVIDER_CONFIGS[value].defaultVoice;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // ElevenLabs API Key (shown only when ElevenLabs is selected)
    if (this.plugin.settings.ttsProvider === 'elevenlabs') {
      new Setting(containerEl)
        .setName('ElevenLabs API Key')
        .setDesc('API key for ElevenLabs TTS')
        .addText(text => text
          .setPlaceholder('Enter your ElevenLabs API key')
          .setValue(this.plugin.settings.elevenlabsApiKey)
          .onChange(async (value) => {
            this.plugin.settings.elevenlabsApiKey = value;
            await this.plugin.saveSettings();
          })
        )
        .addExtraButton(button => button
          .setIcon('external-link')
          .setTooltip('Get ElevenLabs API Key')
          .onClick(() => window.open('https://elevenlabs.io/app/speech-synthesis', '_blank'))
        );
    }

    // TTS Model
    const ttsProviderConfig = TTS_PROVIDER_CONFIGS[this.plugin.settings.ttsProvider];
    new Setting(containerEl)
      .setName('TTS Model')
      .setDesc(`Model for speech generation. Suggestions: ${ttsProviderConfig.suggestedModels}`)
      .addText(text => text
        .setPlaceholder(ttsProviderConfig.defaultModel)
        .setValue(this.plugin.settings.ttsModel)
        .onChange(async (value) => {
          this.plugin.settings.ttsModel = value || ttsProviderConfig.defaultModel;
          await this.plugin.saveSettings();
        })
      );

    // Default Speech Template
    new Setting(containerEl)
      .setName('Default Speech Template')
      .setDesc('Default template for speech script generation')
      .addDropdown(dropdown => {
        Object.entries(SPEECH_TEMPLATE_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, `${config.icon} ${config.nameKo}`);
        });
        dropdown.setValue(this.plugin.settings.defaultSpeechTemplate);
        dropdown.onChange(async (value: SpeechTemplate) => {
          this.plugin.settings.defaultSpeechTemplate = value;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Default Voice (for non-dialogue mode)
    if (this.plugin.settings.ttsProvider === 'gemini') {
      new Setting(containerEl)
        .setName('Default Voice')
        .setDesc('Default voice for speech generation')
        .addDropdown(dropdown => {
          GEMINI_TTS_VOICES.forEach(voice => {
            dropdown.addOption(voice.id, `${voice.name} (${voice.gender}) - ${voice.description}`);
          });
          dropdown.setValue(this.plugin.settings.defaultTtsVoice);
          dropdown.onChange(async (value) => {
            this.plugin.settings.defaultTtsVoice = value;
            await this.plugin.saveSettings();
          });
        });

      // Dialogue voices (for NotebookLM style)
      if (this.plugin.settings.defaultSpeechTemplate === 'notebooklm-dialogue') {
        new Setting(containerEl)
          .setName('Host A Voice')
          .setDesc('Voice for Host A (main explainer)')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender}) - ${voice.description}`);
            });
            dropdown.setValue(this.plugin.settings.defaultTtsVoiceHostA);
            dropdown.onChange(async (value) => {
              this.plugin.settings.defaultTtsVoiceHostA = value;
              await this.plugin.saveSettings();
            });
          });

        new Setting(containerEl)
          .setName('Host B Voice')
          .setDesc('Voice for Host B (curious questioner)')
          .addDropdown(dropdown => {
            GEMINI_TTS_VOICES.forEach(voice => {
              dropdown.addOption(voice.id, `${voice.name} (${voice.gender}) - ${voice.description}`);
            });
            dropdown.setValue(this.plugin.settings.defaultTtsVoiceHostB);
            dropdown.onChange(async (value) => {
              this.plugin.settings.defaultTtsVoiceHostB = value;
              await this.plugin.saveSettings();
            });
          });
      }
    }

    // Speech Script AI Provider
    new Setting(containerEl)
      .setName('Script Generation Provider')
      .setDesc('AI provider for generating speech scripts (separate from TTS)')
      .addDropdown(dropdown => {
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.speechScriptProvider);
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.speechScriptProvider = value;
          this.plugin.settings.speechScriptModel = PROVIDER_CONFIGS[value].defaultModel;
          await this.plugin.saveSettings();
          this.display();
        });
      });

    // Speech Script Model
    const scriptProviderConfig = PROVIDER_CONFIGS[this.plugin.settings.speechScriptProvider];
    new Setting(containerEl)
      .setName('Script Generation Model')
      .setDesc(`Model for script generation. Suggestions: ${scriptProviderConfig.suggestedModels}`)
      .addText(text => text
        .setPlaceholder(scriptProviderConfig.defaultModel)
        .setValue(this.plugin.settings.speechScriptModel)
        .onChange(async (value) => {
          this.plugin.settings.speechScriptModel = value || scriptProviderConfig.defaultModel;
          await this.plugin.saveSettings();
        })
      );

    // Target Audio Duration
    new Setting(containerEl)
      .setName('Target Audio Duration')
      .setDesc('Target duration for generated audio (in minutes)')
      .addSlider(slider => slider
        .setLimits(3, 15, 1)
        .setValue(this.plugin.settings.targetAudioDuration)
        .setDynamicTooltip()
        .onChange(async (value) => {
          this.plugin.settings.targetAudioDuration = value;
          await this.plugin.saveSettings();
        })
      );

    // Audio Output Format
    new Setting(containerEl)
      .setName('Audio Format')
      .setDesc('Output format for generated audio')
      .addDropdown(dropdown => {
        dropdown.addOption('mp3', 'MP3');
        dropdown.addOption('wav', 'WAV');
        dropdown.setValue(this.plugin.settings.audioOutputFormat);
        dropdown.onChange(async (value: AudioFormat) => {
          this.plugin.settings.audioOutputFormat = value;
          await this.plugin.saveSettings();
        });
      });

    // Audio Vault Folder
    new Setting(containerEl)
      .setName('Audio Save Folder')
      .setDesc('Folder path for saving generated audio files')
      .addText(text => text
        .setPlaceholder('Audio/TTS')
        .setValue(this.plugin.settings.audioVaultFolder)
        .onChange(async (value) => {
          this.plugin.settings.audioVaultFolder = value || 'Audio/TTS';
          await this.plugin.saveSettings();
        })
      );

    // Show Speech Preview
    new Setting(containerEl)
      .setName('Show Script Preview')
      .setDesc('Preview and edit the speech script before generating audio')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showSpeechPreview)
        .onChange(async (value) => {
          this.plugin.settings.showSpeechPreview = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createGitIntegrationSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('Git Integration (GitHub Pages)')
      .setHeading();

    new Setting(containerEl)
      .setName('Enable Git Integration')
      .setDesc('Automatically commit and push slides to GitHub for viewing via GitHub Pages')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.gitEnabled ?? false)
        .onChange(async (value) => {
          this.plugin.settings.gitEnabled = value;
          await this.plugin.saveSettings();
          this.display(); // Refresh to show/hide dependent settings
        })
      );

    // Only show these settings if git is enabled
    if (this.plugin.settings.gitEnabled) {
      new Setting(containerEl)
        .setName('Git Repository Path')
        .setDesc('Absolute path to the git repository (e.g., /Users/username/Documents/my-slides)')
        .addText(text => text
          .setPlaceholder('/path/to/git/repo')
          .setValue(this.plugin.settings.gitRepoPath || '')
          .onChange(async (value) => {
            this.plugin.settings.gitRepoPath = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('Git Branch')
        .setDesc('Branch to push commits to')
        .addText(text => text
          .setPlaceholder('main')
          .setValue(this.plugin.settings.gitBranch || 'main')
          .onChange(async (value) => {
            this.plugin.settings.gitBranch = value || 'main';
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('GitHub Personal Access Token')
        .setDesc('PAT for authentication (stored locally, never sent to external servers except GitHub)')
        .addText(text => text
          .setPlaceholder('ghp_xxxxxxxxxxxx')
          .setValue(this.plugin.settings.githubToken || '')
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('GitHub Pages URL')
        .setDesc('Base URL of your GitHub Pages site (e.g., https://username.github.io/repo)')
        .addText(text => text
          .setPlaceholder('https://username.github.io/repo')
          .setValue(this.plugin.settings.githubPagesUrl || '')
          .onChange(async (value) => {
            this.plugin.settings.githubPagesUrl = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('Auto Commit & Push')
        .setDesc('Automatically commit and push after generating a slide')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.autoCommitPush ?? false)
          .onChange(async (value) => {
            this.plugin.settings.autoCommitPush = value;
            await this.plugin.saveSettings();
          })
        );

      // Test connection button
      new Setting(containerEl)
        .setName('Test Git Connection')
        .setDesc('Verify that the git repository and settings are configured correctly')
        .addButton(button => button
          .setButtonText('Test Connection')
          .onClick(async () => {
            const { GitService } = await import('./services/gitService');
            const gitService = new GitService({
              repoPath: this.plugin.settings.gitRepoPath,
              branch: this.plugin.settings.gitBranch,
              token: this.plugin.settings.githubToken,
              pagesUrl: this.plugin.settings.githubPagesUrl
            });

            const result = await gitService.testConnection();
            if (result.success) {
              new Notice(`✅ ${result.message}`);
            } else {
              new Notice(`❌ ${result.message}`);
            }
          })
        );
    }
  }
}

// Simple modal to view system prompt
class SystemPromptViewModal extends Modal {
  private title: string;
  private prompt: string;

  constructor(app: App, title: string, prompt: string) {
    super(app);
    this.title = title;
    this.prompt = prompt;
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('nanobanana-prompt-view-modal');

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-prompt-view-modal {
        width: 700px;
        max-width: 90vw;
      }
      .nanobanana-prompt-view-modal .prompt-textarea-container {
        width: 100%;
        margin: 16px 0;
      }
      .nanobanana-prompt-view-modal textarea {
        width: 100%;
        min-height: 400px;
        max-height: 60vh;
        font-family: var(--font-monospace);
        font-size: 12px;
        line-height: 1.5;
        padding: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
        overflow: auto;
      }
    `;
    contentEl.appendChild(style);

    contentEl.createEl('h2', { text: `System Prompt: ${this.title}` });

    const textAreaContainer = contentEl.createDiv({ cls: 'prompt-textarea-container' });
    const textArea = textAreaContainer.createEl('textarea');
    textArea.value = this.prompt;
    textArea.readOnly = true;

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const copyBtn = buttonContainer.createEl('button', {
      text: 'Copy to Clipboard',
      cls: 'mod-cta'
    });
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(this.prompt);
      new Notice('Prompt copied to clipboard');
    };

    const closeBtn = buttonContainer.createEl('button', { text: 'Close' });
    closeBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
