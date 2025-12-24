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

type SettingsTab = 'general' | 'ai' | 'image' | 'slide' | 'tts' | 'advanced';

interface TabConfig {
  id: SettingsTab;
  name: string;
  icon: string;
}

const SETTINGS_TABS: TabConfig[] = [
  { id: 'general', name: '일반', icon: '⚙️' },
  { id: 'ai', name: 'AI', icon: '🤖' },
  { id: 'image', name: '이미지', icon: '🖼️' },
  { id: 'slide', name: '슬라이드', icon: '📊' },
  { id: 'tts', name: '음성', icon: '🎙️' },
  { id: 'advanced', name: '고급', icon: '🔧' }
];

export class NanoBananaCloudSettingTab extends PluginSettingTab {
  plugin: NanoBananaCloudPlugin;
  private activeTab: SettingsTab = 'general';
  private contentEl: HTMLElement | null = null;

  constructor(app: App, plugin: NanoBananaCloudPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('nanobanana-settings');

    // Add tab styles
    this.addTabStyles(containerEl);

    // Create header with title and version
    this.createHeader(containerEl);

    // Create tab navigation
    this.createTabNavigation(containerEl);

    // Create content container
    this.contentEl = containerEl.createDiv({ cls: 'settings-tab-content' });

    // Render active tab content
    this.renderTabContent();
  }

  private addTabStyles(containerEl: HTMLElement) {
    const style = document.createElement('style');
    style.textContent = `
      .nanobanana-settings {
        padding: 0 !important;
      }

      .nanobanana-settings .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--background-modifier-border);
      }

      .nanobanana-settings .settings-title {
        display: flex;
        align-items: baseline;
        gap: 10px;
      }

      .nanobanana-settings .settings-title h2 {
        margin: 0;
        font-size: 1.5em;
        color: var(--text-accent);
      }

      .nanobanana-settings .settings-title .version {
        font-size: 0.9em;
        color: var(--text-muted);
      }

      .nanobanana-settings .settings-tab-nav {
        display: flex;
        gap: 4px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        flex-wrap: wrap;
      }

      .nanobanana-settings .settings-tab-btn {
        padding: 8px 16px;
        border: none;
        border-radius: 6px;
        background: transparent;
        color: var(--text-muted);
        cursor: pointer;
        font-size: 14px;
        font-weight: 500;
        transition: all 0.15s ease;
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .nanobanana-settings .settings-tab-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .nanobanana-settings .settings-tab-btn.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .nanobanana-settings .settings-tab-btn .tab-icon {
        font-size: 14px;
      }

      .nanobanana-settings .settings-tab-content {
        padding: 20px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }

      .nanobanana-settings .setting-item {
        border-bottom: 1px solid var(--background-modifier-border);
        padding: 16px 0;
      }

      .nanobanana-settings .setting-item:last-child {
        border-bottom: none;
      }

      .nanobanana-settings .setting-item-heading {
        border-bottom: none;
        padding-bottom: 8px;
      }

      .nanobanana-settings .setting-item-heading .setting-item-name {
        font-size: 1.1em;
        font-weight: 600;
        color: var(--text-accent);
      }

      .nanobanana-settings .connection-status {
        margin: 12px 0;
        padding: 10px 14px;
        border-radius: 6px;
        background: var(--background-secondary);
      }

      .nanobanana-settings .status-connected {
        color: var(--text-success);
      }

      .nanobanana-settings .status-disconnected {
        color: var(--text-error);
      }

      .nanobanana-settings .reset-btn {
        padding: 6px 12px;
        border-radius: 4px;
        background: var(--background-modifier-error);
        color: var(--text-on-accent);
        border: none;
        cursor: pointer;
        font-size: 13px;
      }

      .nanobanana-settings .reset-btn:hover {
        background: var(--background-modifier-error-hover);
      }
    `;
    containerEl.appendChild(style);
  }

  private createHeader(containerEl: HTMLElement) {
    const header = containerEl.createDiv({ cls: 'settings-header' });

    const titleDiv = header.createDiv({ cls: 'settings-title' });
    titleDiv.createEl('h2', { text: 'NanoBanana Cloud Settings' });
    titleDiv.createSpan({ cls: 'version', text: `v${this.plugin.manifest.version}` });

    const resetBtn = header.createEl('button', {
      text: 'Reset Settings',
      cls: 'reset-btn'
    });
    resetBtn.onclick = async () => {
      const confirmed = confirm('모든 설정을 초기화하시겠습니까? (API 키는 유지됩니다)');
      if (confirmed) {
        // Reset non-sensitive settings
        new Notice('설정이 초기화되었습니다');
        this.display();
      }
    };
  }

  private createTabNavigation(containerEl: HTMLElement) {
    const nav = containerEl.createDiv({ cls: 'settings-tab-nav' });

    SETTINGS_TABS.forEach(tab => {
      const btn = nav.createEl('button', {
        cls: `settings-tab-btn ${this.activeTab === tab.id ? 'active' : ''}`
      });
      btn.createSpan({ cls: 'tab-icon', text: tab.icon });
      btn.createSpan({ text: tab.name });

      btn.onclick = () => {
        this.activeTab = tab.id;
        // Update active state
        nav.querySelectorAll('.settings-tab-btn').forEach(b => b.removeClass('active'));
        btn.addClass('active');
        // Re-render content
        this.renderTabContent();
      };
    });
  }

  private renderTabContent() {
    if (!this.contentEl) return;
    this.contentEl.empty();

    switch (this.activeTab) {
      case 'general':
        this.renderGeneralTab(this.contentEl);
        break;
      case 'ai':
        this.renderAITab(this.contentEl);
        break;
      case 'image':
        this.renderImageTab(this.contentEl);
        break;
      case 'slide':
        this.renderSlideTab(this.contentEl);
        break;
      case 'tts':
        this.renderTTSTab(this.contentEl);
        break;
      case 'advanced':
        this.renderAdvancedTab(this.contentEl);
        break;
    }
  }

  // ===== GENERAL TAB =====
  private renderGeneralTab(containerEl: HTMLElement) {
    // Google Drive Connection Section
    this.createDriveConnectionSection(containerEl);

    // Google Drive OAuth Section
    this.createOAuthSection(containerEl);

    // Google Drive Settings Section
    this.createDriveSettingsSection(containerEl);

    // UX Section
    this.createUXSection(containerEl);
  }

  // ===== AI TAB =====
  private renderAITab(containerEl: HTMLElement) {
    this.createAIProviderSection(containerEl);
  }

  // ===== IMAGE TAB =====
  private renderImageTab(containerEl: HTMLElement) {
    this.createImageGenerationSection(containerEl);
    this.createEmbeddingSection(containerEl);
  }

  // ===== SLIDE TAB =====
  private renderSlideTab(containerEl: HTMLElement) {
    this.createSlideGenerationSection(containerEl);
  }

  // ===== TTS TAB =====
  private renderTTSTab(containerEl: HTMLElement) {
    this.createTTSSection(containerEl);
  }

  // ===== ADVANCED TAB =====
  private renderAdvancedTab(containerEl: HTMLElement) {
    this.createGitIntegrationSection(containerEl);
  }

  private createDriveConnectionSection(containerEl: HTMLElement) {
    const connectionDiv = containerEl.createDiv({ cls: 'nanobanana-connection-section' });

    new Setting(connectionDiv)
      .setName('Google Drive 연결')
      .setHeading();

    const isConnected = this.plugin.isGoogleDriveConnected();

    const statusDiv = connectionDiv.createDiv({ cls: 'connection-status' });
    if (isConnected) {
      statusDiv.createSpan({ cls: 'status-connected', text: '✅ Google Drive에 연결됨' });
    } else {
      statusDiv.createSpan({ cls: 'status-disconnected', text: '❌ 연결되지 않음' });
    }

    if (isConnected) {
      new Setting(connectionDiv)
        .setName('연결 해제')
        .setDesc('Google Drive 연결을 해제합니다')
        .addButton(button => button
          .setButtonText('연결 해제')
          .setWarning()
          .onClick(async () => {
            await this.plugin.disconnectGoogleDrive();
            this.display();
          })
        );
    } else {
      new Setting(connectionDiv)
        .setName('Google Drive 연결')
        .setDesc('아래에 OAuth 자격 증명을 입력한 후 연결을 클릭하세요')
        .addButton(button => button
          .setButtonText('연결')
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
      .setName('Google OAuth 자격 증명')
      .setHeading();

    new Setting(containerEl)
      .setName('Client ID')
      .setDesc('Google Cloud Console에서 발급받은 OAuth Client ID')
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
      .setDesc('Google Cloud Console에서 발급받은 OAuth Client Secret')
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
      .setName('AI 프로바이더')
      .setHeading();

    // Provider Selection
    new Setting(containerEl)
      .setName('프롬프트 생성 프로바이더')
      .setDesc('이미지 프롬프트 생성에 사용할 AI 프로바이더')
      .addDropdown(dropdown => {
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.selectedProvider);
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.selectedProvider = value;
          this.plugin.settings.promptModel = PROVIDER_CONFIGS[value].defaultModel;
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // Model Selection - Text input with suggestions
    const currentProvider = this.plugin.settings.selectedProvider;
    const providerConfig = PROVIDER_CONFIGS[currentProvider];

    new Setting(containerEl)
      .setName('프롬프트 모델')
      .setDesc(`프롬프트 생성에 사용할 모델. 추천: ${providerConfig.suggestedModels}`)
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
      .setName('API 키')
      .setHeading();

    new Setting(containerEl)
      .setName('Google API Key')
      .setDesc('이미지 생성 및 TTS에 필수 (Gemini)')
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
      .setDesc('선택: 프롬프트 생성용')
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
      .setDesc('선택: 프롬프트 생성용')
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
      .setDesc('선택: 프롬프트 생성용')
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
      .setDesc('선택: 프롬프트 생성용')
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
      .setName('이미지 생성')
      .setHeading();

    // Image Model - Text input with suggestions
    new Setting(containerEl)
      .setName('이미지 모델')
      .setDesc(`이미지 생성용 Google Gemini 모델. 추천: ${SUGGESTED_IMAGE_MODELS}`)
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
      .setName('기본 이미지 스타일')
      .setDesc('생성할 이미지의 기본 시각 스타일')
      .addDropdown(dropdown => {
        const styleNames: Record<ImageStyle, string> = {
          infographic: '📊 인포그래픽',
          poster: '🎨 포스터',
          diagram: '📐 다이어그램',
          mindmap: '🧠 마인드맵',
          timeline: '📅 타임라인',
          cartoon: '🎬 만화'
        };
        Object.entries(styleNames).forEach(([key, name]) => {
          dropdown.addOption(key, name);
        });
        dropdown.setValue(this.plugin.settings.imageStyle);
        dropdown.onChange(async (value: ImageStyle) => {
          this.plugin.settings.imageStyle = value;
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // Infographic Sub-Style (only show when infographic is selected)
    if (this.plugin.settings.imageStyle === 'infographic') {
      new Setting(containerEl)
        .setName('인포그래픽 세부 스타일')
        .setDesc('특화된 인포그래픽 스타일')
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
      .setName('이미지 해상도')
      .setDesc('생성 이미지 해상도')
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
        .setName('만화 컷 수')
        .setDesc('만화 스타일의 패널 수')
        .addDropdown(dropdown => {
          dropdown.addOption('4', '4컷 (2x2)');
          dropdown.addOption('6', '6컷 (2x3)');
          dropdown.addOption('8', '8컷 (2x4)');
          dropdown.addOption('custom', '사용자 지정');
          dropdown.setValue(this.plugin.settings.cartoonCuts);
          dropdown.onChange(async (value: CartoonCuts) => {
            this.plugin.settings.cartoonCuts = value;
            await this.plugin.saveSettings();
            this.renderTabContent();
          });
        });

      if (this.plugin.settings.cartoonCuts === 'custom') {
        new Setting(containerEl)
          .setName('사용자 지정 컷 수')
          .setDesc('컷 수 직접 입력 (2-12)')
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
      .setName('이미지 언어')
      .setDesc('생성 이미지 내 텍스트 언어')
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
      .setName('Google Drive 설정')
      .setHeading();

    new Setting(containerEl)
      .setName('업로드 폴더')
      .setDesc('Google Drive 내 기본 폴더 경로')
      .addText(text => text
        .setPlaceholder('Obsidian/NanoBananaCloud')
        .setValue(this.plugin.settings.driveFolder)
        .onChange(async (value) => {
          this.plugin.settings.driveFolder = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('날짜별 정리')
      .setDesc('년/월 하위 폴더 생성 (예: 2025/12/)')
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
      .setName('임베딩 설정')
      .setHeading();

    new Setting(containerEl)
      .setName('기본 입력 소스')
      .setDesc('이미지 생성 시 기본 콘텐츠 소스')
      .addDropdown(dropdown => {
        dropdown.addOption('fullNote', '전체 노트 (커서 위치에 삽입)');
        dropdown.addOption('selection', '선택 영역 (선택 후에 삽입)');
        dropdown.addOption('custom', '직접 입력 (텍스트 직접 입력)');
        dropdown.setValue(this.plugin.settings.defaultInputSource);
        dropdown.onChange(async (value: InputSource) => {
          this.plugin.settings.defaultInputSource = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName('임베드 크기')
      .setDesc('임베드 이미지의 기본 크기')
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
      .setName('파일명 표시')
      .setDesc('임베드 이미지 위에 파일명 표시')
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
      .setName('UX 설정')
      .setHeading();

    new Setting(containerEl)
      .setName('프롬프트 미리보기')
      .setDesc('이미지 생성 전 프롬프트 미리보기 및 편집')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showPreviewBeforeGeneration)
        .onChange(async (value) => {
          this.plugin.settings.showPreviewBeforeGeneration = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('진행 모달 표시')
      .setDesc('생성 중 진행 상황 표시')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showProgressModal)
        .onChange(async (value) => {
          this.plugin.settings.showProgressModal = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName('자동 재시도 횟수')
      .setDesc('실패 시 자동 재시도 횟수')
      .addDropdown(dropdown => {
        dropdown.addOption('0', '0 (재시도 안함)');
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
      .setName('사용자 프롬프트 접두사')
      .setDesc('모든 생성 프롬프트에 추가되는 선택적 접두사')
      .addTextArea(text => text
        .setPlaceholder('사용자 지정 지시사항 입력...')
        .setValue(this.plugin.settings.customPromptPrefix)
        .onChange(async (value) => {
          this.plugin.settings.customPromptPrefix = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createSlideGenerationSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName('슬라이드 생성')
      .setHeading();

    new Setting(containerEl)
      .setName('슬라이드 루트 폴더')
      .setDesc('생성된 HTML 슬라이드의 루트 폴더 경로 (예: 999-Slides)')
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
      .setName('슬라이드 AI 프로바이더')
      .setDesc('슬라이드 생성용 AI 프로바이더 (이미지 생성과 별도)')
      .addDropdown(dropdown => {
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.slideProvider || 'google');
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.slideProvider = value;
          this.plugin.settings.slideModel = PROVIDER_CONFIGS[value].defaultModel;
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // Slide Model
    const slideProvider = this.plugin.settings.slideProvider || 'google';
    const slideProviderConfig = PROVIDER_CONFIGS[slideProvider];

    new Setting(containerEl)
      .setName('슬라이드 모델')
      .setDesc(`슬라이드 생성용 모델. 추천: ${slideProviderConfig.suggestedModels}`)
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
      .setName('최대 출력 토큰')
      .setDesc('슬라이드 생성 출력의 최대 토큰 수 (8000-131072). 높을수록 긴 슬라이드 가능하나 API 비용 증가.')
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
      .setName('기본 시스템 프롬프트')
      .setDesc('슬라이드 생성의 기본 시스템 프롬프트')
      .addDropdown(dropdown => {
        // Add built-in prompts
        for (const [key, config] of Object.entries(BUILTIN_SLIDE_PROMPTS)) {
          if (key !== 'custom') {
            dropdown.addOption(key, config.name);
          }
        }
        // Add custom prompts
        for (const custom of this.plugin.settings.customSlidePrompts || []) {
          dropdown.addOption(custom.id, `${custom.name} (커스텀)`);
        }
        dropdown.setValue(this.plugin.settings.defaultSlidePromptType || 'notebooklm-summary');
        dropdown.onChange(async (value: SlidePromptType) => {
          this.plugin.settings.defaultSlidePromptType = value;
          await this.plugin.saveSettings();
        });
      });

    // Show slide preview before generation
    new Setting(containerEl)
      .setName('슬라이드 옵션 표시')
      .setDesc('슬라이드 생성 전 옵션 모달 표시')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showSlidePreviewBeforeGeneration ?? true)
        .onChange(async (value) => {
          this.plugin.settings.showSlidePreviewBeforeGeneration = value;
          await this.plugin.saveSettings();
        })
      );

    // View/Edit System Prompt
    new Setting(containerEl)
      .setName('시스템 프롬프트 보기')
      .setDesc('슬라이드 생성의 현재 시스템 프롬프트 보기 및 복사')
      .addButton(button => button
        .setButtonText('프롬프트 보기')
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
      .setName('텍스트 음성 변환 (TTS)')
      .setHeading();

    // TTS Provider
    new Setting(containerEl)
      .setName('TTS 프로바이더')
      .setDesc('텍스트 음성 변환 프로바이더 선택')
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
          this.renderTabContent();
        });
      });

    // ElevenLabs API Key (shown only when ElevenLabs is selected)
    if (this.plugin.settings.ttsProvider === 'elevenlabs') {
      new Setting(containerEl)
        .setName('ElevenLabs API Key')
        .setDesc('ElevenLabs TTS용 API 키')
        .addText(text => text
          .setPlaceholder('ElevenLabs API 키 입력')
          .setValue(this.plugin.settings.elevenlabsApiKey)
          .onChange(async (value) => {
            this.plugin.settings.elevenlabsApiKey = value;
            await this.plugin.saveSettings();
          })
        )
        .addExtraButton(button => button
          .setIcon('external-link')
          .setTooltip('ElevenLabs API 키 받기')
          .onClick(() => window.open('https://elevenlabs.io/app/speech-synthesis', '_blank'))
        );
    }

    // TTS Model
    const ttsProviderConfig = TTS_PROVIDER_CONFIGS[this.plugin.settings.ttsProvider];
    new Setting(containerEl)
      .setName('TTS 모델')
      .setDesc(`음성 생성용 모델. 추천: ${ttsProviderConfig.suggestedModels}`)
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
      .setName('기본 음성 템플릿')
      .setDesc('음성 스크립트 생성의 기본 템플릿')
      .addDropdown(dropdown => {
        Object.entries(SPEECH_TEMPLATE_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, `${config.icon} ${config.nameKo}`);
        });
        dropdown.setValue(this.plugin.settings.defaultSpeechTemplate);
        dropdown.onChange(async (value: SpeechTemplate) => {
          this.plugin.settings.defaultSpeechTemplate = value;
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // Default Voice (for non-dialogue mode)
    if (this.plugin.settings.ttsProvider === 'gemini') {
      new Setting(containerEl)
        .setName('기본 음성')
        .setDesc('음성 생성의 기본 음성')
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
          .setName('Host A 음성')
          .setDesc('Host A용 음성 (메인 설명자)')
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
          .setName('Host B 음성')
          .setDesc('Host B용 음성 (질문자)')
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
      .setName('스크립트 생성 프로바이더')
      .setDesc('음성 스크립트 생성용 AI 프로바이더 (TTS와 별도)')
      .addDropdown(dropdown => {
        Object.entries(PROVIDER_CONFIGS).forEach(([key, config]) => {
          dropdown.addOption(key, config.name);
        });
        dropdown.setValue(this.plugin.settings.speechScriptProvider);
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.speechScriptProvider = value;
          this.plugin.settings.speechScriptModel = PROVIDER_CONFIGS[value].defaultModel;
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // Speech Script Model
    const scriptProviderConfig = PROVIDER_CONFIGS[this.plugin.settings.speechScriptProvider];
    new Setting(containerEl)
      .setName('스크립트 생성 모델')
      .setDesc(`스크립트 생성용 모델. 추천: ${scriptProviderConfig.suggestedModels}`)
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
      .setName('목표 오디오 길이')
      .setDesc('생성할 오디오의 목표 길이 (분)')
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
      .setName('오디오 포맷')
      .setDesc('생성 오디오의 출력 포맷')
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
      .setName('오디오 저장 폴더')
      .setDesc('생성된 오디오 파일 저장 경로')
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
      .setName('스크립트 미리보기')
      .setDesc('오디오 생성 전 음성 스크립트 미리보기 및 편집')
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
      .setName('Git 연동 (GitHub Pages)')
      .setHeading();

    new Setting(containerEl)
      .setName('Git 연동 활성화')
      .setDesc('슬라이드 생성 후 자동으로 GitHub에 커밋 및 푸시하여 GitHub Pages로 볼 수 있게 함')
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.gitEnabled ?? false)
        .onChange(async (value) => {
          this.plugin.settings.gitEnabled = value;
          await this.plugin.saveSettings();
          this.renderTabContent();
        })
      );

    // Only show these settings if git is enabled
    if (this.plugin.settings.gitEnabled) {
      new Setting(containerEl)
        .setName('Git 저장소 경로')
        .setDesc('Git 저장소의 절대 경로 (예: /Users/username/Documents/my-slides)')
        .addText(text => text
          .setPlaceholder('/path/to/git/repo')
          .setValue(this.plugin.settings.gitRepoPath || '')
          .onChange(async (value) => {
            this.plugin.settings.gitRepoPath = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('Git 브랜치')
        .setDesc('커밋을 푸시할 브랜치')
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
        .setDesc('인증용 PAT (로컬에만 저장, GitHub 외 외부 서버로 전송 안함)')
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
        .setDesc('GitHub Pages 사이트의 기본 URL (예: https://username.github.io/repo)')
        .addText(text => text
          .setPlaceholder('https://username.github.io/repo')
          .setValue(this.plugin.settings.githubPagesUrl || '')
          .onChange(async (value) => {
            this.plugin.settings.githubPagesUrl = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName('자동 커밋 & 푸시')
        .setDesc('슬라이드 생성 후 자동으로 커밋 및 푸시')
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.autoCommitPush ?? false)
          .onChange(async (value) => {
            this.plugin.settings.autoCommitPush = value;
            await this.plugin.saveSettings();
          })
        );

      // Test connection button
      new Setting(containerEl)
        .setName('Git 연결 테스트')
        .setDesc('Git 저장소 및 설정이 올바르게 구성되었는지 확인')
        .addButton(button => button
          .setButtonText('연결 테스트')
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

    contentEl.createEl('h2', { text: `시스템 프롬프트: ${this.title}` });

    const textAreaContainer = contentEl.createDiv({ cls: 'prompt-textarea-container' });
    const textArea = textAreaContainer.createEl('textarea');
    textArea.value = this.prompt;
    textArea.readOnly = true;

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const copyBtn = buttonContainer.createEl('button', {
      text: '클립보드에 복사',
      cls: 'mod-cta'
    });
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(this.prompt);
      new Notice('프롬프트가 클립보드에 복사되었습니다');
    };

    const closeBtn = buttonContainer.createEl('button', { text: '닫기' });
    closeBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}
