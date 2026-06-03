import { App, Modal, PluginSettingTab, Setting, Notice, requestUrl, setIcon } from 'obsidian';
import type StarCloudStudioPlugin from './main';
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
  SlideOutputFormat,
  HtmlSlideStyle,
  PptxSlideStyle,
  SlideUploadDestination,
  TTSProvider,
  TTS_PROVIDER_CONFIGS,
  SpeechTemplate,
  SPEECH_TEMPLATE_CONFIGS,
  GEMINI_TTS_VOICES,
  AudioFormat,
  AIProviderDefinition,
  AIModelDefinition,
  BUILT_IN_PROVIDERS,
  BUILT_IN_MODELS,
  DEFAULT_IMAGE_REQUEST_PARAMS,
  AIApiFormat,
  AIAuthType,
} from './types';
import { BUILTIN_SLIDE_PROMPTS, BUILTIN_HTML_PROMPTS, BUILTIN_PPTX_PROMPTS } from './settingsData';
import { t, setLocale, SupportedLocale } from './i18n';

type SettingsTab = 'general' | 'ai' | 'image' | 'slide' | 'tts' | 'advanced';

interface TabConfig {
  id: SettingsTab;
  name: string;
  icon: string;
}

export class StarCloudStudioSettingTab extends PluginSettingTab {
  plugin: StarCloudStudioPlugin;
  private activeTab: SettingsTab = 'general';
  private contentEl: HTMLElement | null = null;

  constructor(app: App, plugin: StarCloudStudioPlugin) {
    super(app, plugin);
    this.plugin = plugin;
  }

  private getTabConfigs(): TabConfig[] {
    return [
      { id: 'general', name: t().tabs.general, icon: '⚙️' },
      { id: 'ai', name: t().tabs.ai, icon: '🤖' },
      { id: 'image', name: t().tabs.image, icon: '🖼️' },
      { id: 'slide', name: t().tabs.slide, icon: '📊' },
      { id: 'tts', name: t().tabs.tts, icon: '🎙️' },
      { id: 'advanced', name: t().tabs.advanced, icon: '🔧' },
    ];
  }

  display(): void {
    const { containerEl } = this;
    containerEl.empty();
    containerEl.addClass('starcloud-settings');

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
      .starcloud-settings {
        padding: 0;
      }

      .starcloud-settings .settings-header {
        display: flex;
        justify-content: space-between;
        align-items: center;
        padding: 16px 20px;
        border-bottom: 1px solid var(--background-modifier-border);
      }

      .starcloud-settings .settings-title {
        display: flex;
        align-items: baseline;
        gap: 10px;
      }

      .starcloud-settings .settings-title h2 {
        margin: 0;
        font-size: 1.5em;
        color: var(--text-accent);
      }

      .starcloud-settings .settings-title .version {
        font-size: 0.9em;
        color: var(--text-muted);
      }

      .starcloud-settings .settings-tab-nav {
        display: flex;
        gap: 4px;
        padding: 12px 20px;
        border-bottom: 1px solid var(--background-modifier-border);
        background: var(--background-secondary);
        flex-wrap: wrap;
      }

      .starcloud-settings .settings-tab-btn {
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

      .starcloud-settings .settings-tab-btn:hover {
        background: var(--background-modifier-hover);
        color: var(--text-normal);
      }

      .starcloud-settings .settings-tab-btn.active {
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .starcloud-settings .settings-tab-btn .tab-icon {
        font-size: 14px;
      }

      .starcloud-settings .settings-tab-content {
        padding: 20px;
        max-height: calc(100vh - 200px);
        overflow-y: auto;
      }

      .starcloud-settings .setting-item {
        border-bottom: 1px solid var(--background-modifier-border);
        padding: 16px 0;
      }

      .starcloud-settings .setting-item:last-child {
        border-bottom: none;
      }

      .starcloud-settings .setting-item-heading {
        border-bottom: none;
        padding-bottom: 8px;
      }

      .starcloud-settings .setting-item-heading .setting-item-name {
        font-size: 1.1em;
        font-weight: 600;
        color: var(--text-accent);
      }

      .starcloud-settings .connection-status {
        margin: 12px 0;
        padding: 10px 14px;
        border-radius: 6px;
        background: var(--background-secondary);
      }

      .starcloud-settings .status-connected {
        color: var(--text-success);
      }

      .starcloud-settings .status-disconnected {
        color: var(--text-error);
      }

      /* 프로바이더/모델 목록 공통 */
      .starcloud-settings .provider-list-item,
      .starcloud-settings .model-list-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        margin-bottom: 8px;
        background: var(--background-secondary);
      }

      .starcloud-settings .provider-list-item .provider-info,
      .starcloud-settings .model-list-item .model-info {
        display: flex;
        flex-direction: column;
        gap: 2px;
        flex: 1;
        min-width: 0;
      }

      .starcloud-settings .provider-list-item .provider-name,
      .starcloud-settings .model-list-item .model-name {
        font-weight: 600;
        font-size: 14px;
      }

      .starcloud-settings .provider-list-item .provider-status,
      .starcloud-settings .model-list-item .model-meta {
        font-size: 11px;
        color: var(--text-muted);
      }

      .starcloud-settings .provider-list-item .provider-actions,
      .starcloud-settings .model-list-item .model-actions {
        display: flex;
        gap: 4px;
        align-items: center;
        flex-shrink: 0;
      }

      /* 아이콘 버튼 */
      .starcloud-settings .icon-btn {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 32px;
        height: 32px;
        padding: 0;
        border: none;
        border-radius: 6px;
        background: var(--background-modifier-hover);
        color: var(--text-muted);
        cursor: pointer;
        transition: background 0.15s, color 0.15s;
      }

      .starcloud-settings .icon-btn:hover {
        background: var(--background-modifier-border);
        color: var(--text-normal);
      }

      .starcloud-settings .icon-btn svg {
        width: 16px;
        height: 16px;
      }

      /* 삭제 버튼 */
      .starcloud-settings .icon-btn-danger {
        background: var(--background-modifier-error);
        color: var(--text-on-accent);
      }

      .starcloud-settings .icon-btn-danger:hover {
        background: var(--text-error);
        color: var(--text-on-accent);
      }

      /* 스타 버튼 */
      .starcloud-settings .icon-btn-star {
        color: var(--text-faint);
      }

      .starcloud-settings .icon-btn-star:hover {
        color: #f0b429;
      }

      .starcloud-settings .icon-btn-star.is-default {
        color: #f0b429;
      }

      .starcloud-settings .icon-btn-star.is-default svg {
        fill: currentColor;
      }

      /* 토글 버튼 */
      .starcloud-settings .icon-btn-toggle.is-enabled {
        color: var(--interactive-accent);
      }

      .starcloud-settings .icon-btn-toggle.is-disabled {
        color: var(--text-faint);
      }

      /* 비활성 모델 */
      .starcloud-settings .model-list-item.is-disabled {
        opacity: 0.5;
      }

      /* 상태 아이콘 텍스트 */
      .starcloud-settings .status-ok {
        color: var(--text-success);
      }

      .starcloud-settings .status-warn {
        color: var(--text-warning);
      }

      .starcloud-settings .add-btn-row {
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        margin-bottom: 8px;
        background: var(--background-secondary);
        display: flex;
        justify-content: flex-end;
      }

      .starcloud-settings .add-btn-row button {
        font-size: 13px;
        padding: 6px 14px;
        cursor: pointer;
        background: var(--interactive-accent);
        color: var(--text-on-accent);
        border: none;
        border-radius: 6px;
      }

      .starcloud-settings .add-btn-row button:hover {
        opacity: 0.9;
      }

      .starcloud-settings .provider-form-container {
        border: 1px solid var(--interactive-accent);
        border-radius: 8px;
        padding: 16px;
        margin-bottom: 16px;
        background: var(--background-secondary);
      }

      .starcloud-settings .provider-form-container .setting-item {
        border-bottom: 1px solid var(--background-modifier-border);
        padding: 10px 0;
      }

      .starcloud-settings .provider-form-container .setting-item:last-child {
        border-bottom: none;
      }
    `;
    containerEl.appendChild(style);
  }

  private createHeader(containerEl: HTMLElement) {
    const header = containerEl.createDiv({ cls: 'settings-header' });

    const titleDiv = header.createDiv({ cls: 'settings-title' });
    titleDiv.createEl('h2', { text: t().settings.title });
    titleDiv.createSpan({ cls: 'version', text: `v${this.plugin.manifest.version}` });
  }

  private createTabNavigation(containerEl: HTMLElement) {
    const nav = containerEl.createDiv({ cls: 'settings-tab-nav' });

    this.getTabConfigs().forEach(tab => {
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
    // Language selector (first item)
    this.createLanguageSection(containerEl);

    // Drive Upload Toggle
    new Setting(containerEl)
      .setName(t().settings.useDriveUpload)
      .setDesc(t().settings.useDriveUploadDesc)
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.useDriveUpload ?? true)
        .onChange(async (value) => {
          this.plugin.settings.useDriveUpload = value;
          await this.plugin.saveSettings();
          this.renderTabContent();
        })
      );

    // Drive 관련 섹션 (활성화 시에만 표시)
    if (this.plugin.settings.useDriveUpload) {
      this.createDriveConnectionSection(containerEl);
      this.createOAuthSection(containerEl);
      this.createDriveSettingsSection(containerEl);
    }

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

  private createLanguageSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName(t().settings.language)
      .setDesc(t().settings.languageDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('auto', t().settings.languageAuto);
        dropdown.addOption('ko', '한국어');
        dropdown.addOption('en', 'English');
        dropdown.setValue(this.plugin.settings.language || 'auto');
        dropdown.onChange(async (value) => {
          this.plugin.settings.language = value as SupportedLocale;
          setLocale(value as SupportedLocale);
          await this.plugin.saveSettings();
          this.display(); // Full re-render for language change
        });
      });
  }

  private createDriveConnectionSection(containerEl: HTMLElement) {
    const connectionDiv = containerEl.createDiv({ cls: 'starcloud-connection-section' });

    new Setting(connectionDiv)
      .setName(t().settings.driveConnection)
      .setHeading();

    const isConnected = this.plugin.isGoogleDriveConnected();

    const statusDiv = connectionDiv.createDiv({ cls: 'connection-status' });
    if (isConnected) {
      statusDiv.createSpan({ cls: 'status-connected', text: t().settings.driveConnected });
    } else {
      statusDiv.createSpan({ cls: 'status-disconnected', text: t().settings.driveDisconnected });
    }

    if (isConnected) {
      new Setting(connectionDiv)
        .setName(t().settings.disconnect)
        .setDesc(t().settings.disconnectDesc)
        .addButton(button => button
          .setButtonText(t().settings.disconnect)
          .setWarning()
          .onClick(async () => {
            await this.plugin.disconnectGoogleDrive();
            this.display();
          })
        );
    } else {
      new Setting(connectionDiv)
        .setName(t().settings.connectDrive)
        .setDesc(t().settings.connectDriveDesc)
        .addButton(button => button
          .setButtonText(t().settings.connect)
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
      .setName(t().settings.oauthCredentials)
      .setHeading();

    new Setting(containerEl)
      .setName(t().settings.clientId)
      .setDesc(t().settings.clientIdDesc)
      .addText(text => text
        .setPlaceholder('xxx.apps.googleusercontent.com')
        .setValue(this.plugin.settings.googleClientId)
        .onChange(async (value) => {
          this.plugin.settings.googleClientId = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t().settings.clientSecret)
      .setDesc(t().settings.clientSecretDesc)
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
    const providers: AIProviderDefinition[] = this.plugin.settings.providers || [];
    const models: AIModelDefinition[] = this.plugin.settings.models || [];

    new Setting(containerEl)
      .setName(t().settings.aiProvider)
      .setHeading();

    // 기본 제공자 드롭다운 (기본 모델의 프로바이더에서 파생)
    new Setting(containerEl)
      .setName(t().settings.promptProvider)
      .setDesc(t().settings.promptProviderDesc)
      .addDropdown(dropdown => {
        providers.forEach(p => {
          const label = p.apiKey ? p.name : `${p.name} (${t().settings.apiKeyNotSet})`;
          dropdown.addOption(p.id, label);
        });
        dropdown.setValue(this.plugin.settings.defaultProviderId);
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.defaultProviderId = value;
          // 해당 프로바이더의 첫 번째 활성 비-이미지 모델로 자동 설정
          const providerModels = models.filter(m => m.providerId === value && m.enabled && !m.isImageModel);
          if (providerModels.length > 0) {
            this.plugin.settings.defaultModelId = providerModels[0].id;
          }
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // 기본 모델 드롭다운 (선택된 프로바이더의 활성 비-이미지 모델만)
    const currentProviderId = this.plugin.settings.defaultProviderId;
    const providerModels = models.filter(m => m.providerId === currentProviderId && m.enabled && !m.isImageModel);

    new Setting(containerEl)
      .setName(t().settings.promptModel)
      .setDesc(t().settings.promptModelSelectDesc)
      .addDropdown(dropdown => {
        providerModels.forEach(m => {
          dropdown.addOption(m.id, m.name);
        });
        // 현재 값이 목록에 없으면 직접 입력 옵션 추가
        if (!providerModels.find(m => m.id === this.plugin.settings.defaultModelId)) {
          const currentModel = this.plugin.settings.defaultModelId;
          if (currentModel) {
            dropdown.addOption(currentModel, currentModel);
          }
        }
        dropdown.setValue(this.plugin.settings.defaultModelId);
        dropdown.onChange(async (value) => {
          this.plugin.settings.defaultModelId = value;
          // 모델의 프로바이더와 동기화
          const selectedModel = models.find(m => m.id === value);
          if (selectedModel) {
            this.plugin.settings.defaultProviderId = selectedModel.providerId;
          }
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // 연결 테스트
    this.createConnectionTestSection(containerEl);

    // 제공자 관리 섹션
    new Setting(containerEl)
      .setName(t().settings.providers)
      .setHeading();

    this.renderProviderList(containerEl);

    // 모델 관리 섹션
    new Setting(containerEl)
      .setName(t().settings.models)
      .setHeading();

    this.renderModelList(containerEl);
  }

  /**
   * 아이콘 버튼 생성 헬퍼
   */
  private createIconButton(parent: HTMLElement, options: {
    icon: string;
    tooltip: string;
    cls?: string;
    onClick: () => void;
  }): HTMLElement {
    const btn = parent.createEl('button', { cls: `icon-btn ${options.cls || ''}` });
    setIcon(btn, options.icon);
    btn.setAttribute('aria-label', options.tooltip);
    btn.title = options.tooltip;
    btn.onclick = options.onClick;
    return btn;
  }

  /**
   * 연결 테스트 섹션
   */
  private createConnectionTestSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName(t().settings.connectionTest)
      .addButton(btn => {
        btn.setButtonText(t().common.test);
        btn.onClick(async () => {
          const providerId = this.plugin.settings.defaultProviderId;
          const modelId = this.plugin.settings.defaultModelId;
          const provider = (this.plugin.settings.providers || []).find(p => p.id === providerId);
          const model = (this.plugin.settings.models || []).find(m => m.id === modelId);
          if (!provider) {
            new Notice(t().settings.apiKeyNotSet);
            return;
          }
          const apiKey = model?.apiKey || provider.apiKey;
          if (!apiKey) {
            new Notice(t().settings.apiKeyNotSet);
            return;
          }
          btn.setButtonText(t().common.testing);
          btn.setDisabled(true);
          try {
            const result = await testModelConnection(provider, modelId, apiKey);
            new Notice(`${t().common.success}: ${provider.name} / ${model?.name || modelId} - ${result}`);
          } catch (e: any) {
            new Notice(`${t().common.failure}: ${e.message}`);
          } finally {
            btn.setButtonText(t().common.test);
            btn.setDisabled(false);
          }
        });
      });
  }

  private renderProviderList(containerEl: HTMLElement) {
    const providers: AIProviderDefinition[] = this.plugin.settings.providers || [];

    if (providers.length === 0) {
      containerEl.createEl('p', {
        text: t().settings.noModels,
        cls: 'setting-item-description'
      });
    }

    providers.forEach(provider => {
      const isDefaultProvider = this.plugin.settings.defaultProviderId === provider.id;
      const item = containerEl.createDiv({ cls: 'provider-list-item' });

      const info = item.createDiv({ cls: 'provider-info' });
      const nameText = isDefaultProvider
        ? `${provider.name} ${t().settings.defaultBadge}`
        : provider.name;
      info.createDiv({ cls: 'provider-name', text: nameText });

      const statusEl = info.createDiv({ cls: 'provider-status' });
      if (provider.apiKey) {
        statusEl.addClass('status-ok');
        statusEl.setText(`✓ ${t().settings.apiKeySet}`);
      } else {
        statusEl.addClass('status-warn');
        statusEl.setText(`⚠ ${t().settings.apiKeyNotSet}`);
      }

      const actions = item.createDiv({ cls: 'provider-actions' });

      // 편집 아이콘 버튼
      this.createIconButton(actions, {
        icon: 'pencil',
        tooltip: t().common.edit,
        onClick: () => {
          new ProviderEditModal(this.app, provider, async (updated) => {
            const updatedProviders = (this.plugin.settings.providers || []).map(p =>
              p.id === provider.id ? updated : p
            );
            this.plugin.settings.providers = updatedProviders;
            await this.plugin.saveSettings();
            this.renderTabContent();
          }).open();
        }
      });

      // 삭제 아이콘 버튼 (비빌트인만)
      if (!provider.isBuiltIn) {
        this.createIconButton(actions, {
          icon: 'trash-2',
          tooltip: t().common.delete,
          cls: 'icon-btn-danger',
          onClick: async () => {
            const updatedProviders = (this.plugin.settings.providers || []).filter(p => p.id !== provider.id);
            this.plugin.settings.providers = updatedProviders;
            await this.plugin.saveSettings();
            new Notice(t().notice.providerDeleted(provider.name));
            this.renderTabContent();
          }
        });
      }
    });

    // 제공자 추가 버튼
    const addBtnRow = containerEl.createDiv({ cls: 'add-btn-row' });
    const addProviderBtn = addBtnRow.createEl('button', { text: t().settings.addProvider });
    addProviderBtn.onclick = () => {
      new ProviderEditModal(this.app, null, async (providerDef) => {
        const updatedProviders = [...(this.plugin.settings.providers || []), providerDef];
        this.plugin.settings.providers = updatedProviders;
        await this.plugin.saveSettings();
        new Notice(t().notice.providerAdded(providerDef.name));
        this.renderTabContent();
      }).open();
    };
  }

  private renderModelList(containerEl: HTMLElement) {
    const models: AIModelDefinition[] = this.plugin.settings.models || [];
    const providers: AIProviderDefinition[] = this.plugin.settings.providers || [];

    if (models.length === 0) {
      containerEl.createEl('p', {
        text: t().settings.noModels,
        cls: 'setting-item-description'
      });
    }

    models.forEach(model => {
      const provider = providers.find(p => p.id === model.providerId);
      const isDefault = this.plugin.settings.defaultModelId === model.id;
      const item = containerEl.createDiv({
        cls: `model-list-item ${!model.enabled ? 'is-disabled' : ''}`
      });

      const info = item.createDiv({ cls: 'model-info' });
      const nameText = isDefault ? `★ ${model.name}` : model.name;
      info.createDiv({ cls: 'model-name', text: nameText });
      info.createDiv({
        cls: 'model-meta',
        text: provider ? provider.name : model.providerId
      });

      const actions = item.createDiv({ cls: 'model-actions' });

      // 편집 아이콘
      this.createIconButton(actions, {
        icon: 'pencil',
        tooltip: t().common.edit,
        onClick: () => {
          new ModelEditModal(this.app, model, providers, async (updated) => {
            const updatedModels = (this.plugin.settings.models || []).map(m =>
              m.id === model.id ? updated : m
            );
            this.plugin.settings.models = updatedModels;
            await this.plugin.saveSettings();
            this.renderTabContent();
          }).open();
        }
      });

      // 스타 아이콘 (기본 모델 설정) - 기본 모델이면 채워진 별
      if (!isDefault) {
        this.createIconButton(actions, {
          icon: 'star',
          tooltip: t().settings.setAsDefault,
          cls: 'icon-btn-star',
          onClick: async () => {
            this.plugin.settings.defaultModelId = model.id;
            if (provider) {
              this.plugin.settings.defaultProviderId = provider.id;
            }
            await this.plugin.saveSettings();
            new Notice(t().notice.defaultSet(provider?.name || model.providerId, model.name));
            this.renderTabContent();
          }
        });
      }

      // 토글 아이콘 (활성화/비활성화)
      this.createIconButton(actions, {
        icon: model.enabled ? 'toggle-right' : 'toggle-left',
        tooltip: model.enabled ? t().common.disabled : t().common.enabled,
        cls: `icon-btn-toggle ${model.enabled ? 'is-enabled' : 'is-disabled'}`,
        onClick: async () => {
          if (model.enabled && isDefault) {
            new Notice(t().settings.cannotDisableDefault);
            return;
          }
          const updatedModels = (this.plugin.settings.models || []).map(m =>
            m.id === model.id ? { ...m, enabled: !m.enabled } : m
          );
          this.plugin.settings.models = updatedModels;
          await this.plugin.saveSettings();
          this.renderTabContent();
        }
      });

      // 삭제 아이콘
      this.createIconButton(actions, {
        icon: 'trash-2',
        tooltip: t().common.delete,
        cls: 'icon-btn-danger',
        onClick: async () => {
          if (isDefault) {
            new Notice(t().settings.cannotDeleteDefault);
            return;
          }
          const updatedModels = (this.plugin.settings.models || []).filter(m => m.id !== model.id);
          this.plugin.settings.models = updatedModels;
          await this.plugin.saveSettings();
          new Notice(t().notice.modelDeleted(model.name));
          this.renderTabContent();
        }
      });
    });

    // 모델 추가 버튼
    const addBtnRow = containerEl.createDiv({ cls: 'add-btn-row' });
    const addModelBtn = addBtnRow.createEl('button', { text: t().settings.addModel });
    addModelBtn.onclick = () => {
      new ModelEditModal(this.app, null, providers, async (modelDef) => {
        const updatedModels = [...(this.plugin.settings.models || []), modelDef];
        this.plugin.settings.models = updatedModels;
        await this.plugin.saveSettings();
        new Notice(t().notice.modelAdded(modelDef.name));
        this.renderTabContent();
      }).open();
    };
  }

  private createImageGenerationSection(containerEl: HTMLElement) {
    const providers: AIProviderDefinition[] = this.plugin.settings.providers || [];
    const allModels: AIModelDefinition[] = this.plugin.settings.models || [];

    // 이미지 모델이 있는 프로바이더만 필터
    const imageModels = allModels.filter(m => m.isImageModel);
    const imageProviderIds = [...new Set(imageModels.map(m => m.providerId))];
    const imageProviders = providers.filter(p => imageProviderIds.includes(p.id));

    new Setting(containerEl)
      .setName(t().settings.imageGeneration)
      .setHeading();

    // Image Provider
    if (imageProviders.length > 0) {
      new Setting(containerEl)
        .setName(t().settings.imageProvider)
        .setDesc(t().settings.imageProviderDesc)
        .addDropdown(dropdown => {
          imageProviders.forEach(p => {
            dropdown.addOption(p.id, p.name);
          });
          // 현재 값이 없거나 목록에 없으면 첫 번째로 설정
          const currentImageProvider = this.plugin.settings.imageProvider || 'google';
          if (!imageProviders.find(p => p.id === currentImageProvider) && imageProviders.length > 0) {
            this.plugin.settings.imageProvider = imageProviders[0].id;
          }
          dropdown.setValue(this.plugin.settings.imageProvider || 'google');
          dropdown.onChange(async (value) => {
            this.plugin.settings.imageProvider = value;
            // 해당 프로바이더의 첫 이미지 모델로 자동 설정
            const providerImageModels = imageModels.filter(m => m.providerId === value);
            if (providerImageModels.length > 0) {
              this.plugin.settings.imageModel = providerImageModels[0].id;
            }
            await this.plugin.saveSettings();
            this.renderTabContent();
          });
        });

      // Image Model (filtered by selected provider, image models only)
      const currentImageProvider = this.plugin.settings.imageProvider || 'google';
      const providerImageModels = imageModels.filter(m => m.providerId === currentImageProvider);

      new Setting(containerEl)
        .setName(t().settings.imageModel)
        .setDesc(t().settings.imageModelDesc(providerImageModels.map(m => m.name).join(', ')))
        .addDropdown(dropdown => {
          providerImageModels.forEach(m => {
            dropdown.addOption(m.id, m.name);
          });
          // 현재 값이 목록에 없으면 추가
          if (!providerImageModels.find(m => m.id === this.plugin.settings.imageModel)) {
            dropdown.addOption(this.plugin.settings.imageModel, this.plugin.settings.imageModel);
          }
          dropdown.setValue(this.plugin.settings.imageModel);
          dropdown.onChange(async (value) => {
            this.plugin.settings.imageModel = value;
            await this.plugin.saveSettings();
          });
        });
    } else {
      // 이미지 모델이 없을 때 기존 텍스트 입력 폴백
      new Setting(containerEl)
        .setName(t().settings.imageModel)
        .setDesc(t().settings.imageModelDesc(SUGGESTED_IMAGE_MODELS))
        .addText(text => text
          .setPlaceholder('gemini-3-pro-image-preview')
          .setValue(this.plugin.settings.imageModel)
          .onChange(async (value) => {
            this.plugin.settings.imageModel = value || 'gemini-3-pro-image-preview';
            await this.plugin.saveSettings();
          })
        );
    }

    // Image Style
    new Setting(containerEl)
      .setName(t().settings.defaultImageStyle)
      .setDesc(t().settings.defaultImageStyleDesc)
      .addDropdown(dropdown => {
        const styleNames: Record<ImageStyle, string> = {
          infographic: t().settings.styleInfographic,
          poster: t().settings.stylePoster,
          diagram: t().settings.styleDiagram,
          mindmap: t().settings.styleMindmap,
          timeline: t().settings.styleTimeline,
          cartoon: t().settings.styleCartoon,
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
        .setName(t().settings.infographicSubStyle)
        .setDesc(t().settings.infographicSubStyleDesc)
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
      .setName(t().settings.imageResolution)
      .setDesc(t().settings.imageResolutionDesc)
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
        .setName(t().settings.cartoonCuts)
        .setDesc(t().settings.cartoonCutsDesc)
        .addDropdown(dropdown => {
          dropdown.addOption('4', '4컷 (2x2)');
          dropdown.addOption('6', '6컷 (2x3)');
          dropdown.addOption('8', '8컷 (2x4)');
          dropdown.addOption('custom', t().common.custom);
          dropdown.setValue(this.plugin.settings.cartoonCuts);
          dropdown.onChange(async (value: CartoonCuts) => {
            this.plugin.settings.cartoonCuts = value;
            await this.plugin.saveSettings();
            this.renderTabContent();
          });
        });

      if (this.plugin.settings.cartoonCuts === 'custom') {
        new Setting(containerEl)
          .setName(t().settings.customCuts)
          .setDesc(t().settings.customCutsDesc)
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
      .setName(t().settings.imageLanguage)
      .setDesc(t().settings.imageLanguageDesc)
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
      .setName(t().settings.driveSettings)
      .setHeading();

    new Setting(containerEl)
      .setName(t().settings.uploadFolder)
      .setDesc(t().settings.uploadFolderDesc)
      .addText(text => text
        .setPlaceholder('StarCloud')
        .setValue(this.plugin.settings.driveFolder)
        .onChange(async (value) => {
          this.plugin.settings.driveFolder = value || 'StarCloud';
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t().settings.organizeFoldersByDate)
      .setDesc(t().settings.organizeFoldersByDateDesc)
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
      .setName(t().settings.embeddingSettings)
      .setHeading();

    new Setting(containerEl)
      .setName(t().settings.defaultInputSource)
      .setDesc(t().settings.defaultInputSourceDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('fullNote', t().settings.inputFullNote);
        dropdown.addOption('selection', t().settings.inputSelection);
        dropdown.addOption('custom', t().settings.inputCustom);
        dropdown.setValue(this.plugin.settings.defaultInputSource);
        dropdown.onChange(async (value: InputSource) => {
          this.plugin.settings.defaultInputSource = value;
          await this.plugin.saveSettings();
        });
      });

    new Setting(containerEl)
      .setName(t().settings.embedSize)
      .setDesc(t().settings.embedSizeDesc)
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
      .setName(t().settings.showFilename)
      .setDesc(t().settings.showFilenameDesc)
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
      .setName(t().settings.uxSettings)
      .setHeading();

    new Setting(containerEl)
      .setName(t().settings.promptPreview)
      .setDesc(t().settings.promptPreviewDesc)
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showPreviewBeforeGeneration)
        .onChange(async (value) => {
          this.plugin.settings.showPreviewBeforeGeneration = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t().settings.progressModal)
      .setDesc(t().settings.progressModalDesc)
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showProgressModal)
        .onChange(async (value) => {
          this.plugin.settings.showProgressModal = value;
          await this.plugin.saveSettings();
        })
      );

    new Setting(containerEl)
      .setName(t().settings.autoRetry)
      .setDesc(t().settings.autoRetryDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('0', t().settings.retryNone);
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
      .setName(t().settings.customPromptPrefix)
      .setDesc(t().settings.customPromptPrefixDesc)
      .addTextArea(text => text
        .setPlaceholder(t().settings.customPromptPrefixPlaceholder)
        .setValue(this.plugin.settings.customPromptPrefix)
        .onChange(async (value) => {
          this.plugin.settings.customPromptPrefix = value;
          await this.plugin.saveSettings();
        })
      );
  }

  private createSlideGenerationSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName(t().settings.slideGeneration)
      .setHeading();

    new Setting(containerEl)
      .setName(t().settings.slideRootFolder)
      .setDesc(t().settings.slideRootFolderDesc)
      .addText(text => text
        .setPlaceholder('StarCloud/Slide')
        .setValue(this.plugin.settings.slidesRootPath || 'StarCloud/Slide')
        .onChange(async (value) => {
          this.plugin.settings.slidesRootPath = value || 'StarCloud/Slide';
          await this.plugin.saveSettings();
        })
      );

    // Slide AI Provider (동적 프로바이더 목록 사용)
    const slideProviders: AIProviderDefinition[] = this.plugin.settings.providers || [];
    const slideModels: AIModelDefinition[] = this.plugin.settings.models || [];

    new Setting(containerEl)
      .setName(t().settings.slideProvider)
      .setDesc(t().settings.slideProviderDesc)
      .addDropdown(dropdown => {
        slideProviders.forEach(p => {
          const label = p.apiKey ? p.name : `${p.name} (${t().settings.apiKeyNotSet})`;
          dropdown.addOption(p.id, label);
        });
        dropdown.setValue(this.plugin.settings.slideProvider || 'google');
        dropdown.onChange(async (value: AIProvider) => {
          this.plugin.settings.slideProvider = value;
          // 해당 프로바이더의 첫 번째 비-이미지 모델로 자동 설정
          const providerModels = slideModels.filter(m => m.providerId === value && !m.isImageModel);
          if (providerModels.length > 0) {
            this.plugin.settings.slideModel = providerModels[0].id;
          }
          await this.plugin.saveSettings();
          this.renderTabContent();
        });
      });

    // Slide Model (해당 프로바이더의 비-이미지 모델 드롭다운)
    const currentSlideProviderId = this.plugin.settings.slideProvider || 'google';
    const slideProviderModels = slideModels.filter(m => m.providerId === currentSlideProviderId && !m.isImageModel);

    new Setting(containerEl)
      .setName(t().settings.slideModel)
      .setDesc(t().settings.slideModelDesc2)
      .addDropdown(dropdown => {
        slideProviderModels.forEach(m => {
          dropdown.addOption(m.id, m.name);
        });
        // 현재 값이 목록에 없으면 직접 입력 옵션 추가
        if (!slideProviderModels.find(m => m.id === this.plugin.settings.slideModel)) {
          const currentModel = this.plugin.settings.slideModel;
          if (currentModel) {
            dropdown.addOption(currentModel, currentModel);
          }
        }
        dropdown.setValue(this.plugin.settings.slideModel || (slideProviderModels[0]?.id ?? ''));
        dropdown.onChange(async (value) => {
          this.plugin.settings.slideModel = value;
          await this.plugin.saveSettings();
        });
      });

    // Slide Max Output Tokens
    new Setting(containerEl)
      .setName(t().settings.maxOutputTokens)
      .setDesc(t().settings.maxOutputTokensDesc)
      .addText(text => text
        .setPlaceholder('65536')
        .setValue(String(this.plugin.settings.slideMaxOutputTokens || 65536))
        .onChange(async (value) => {
          const num = parseInt(value) || 65536;
          this.plugin.settings.slideMaxOutputTokens = Math.min(131072, Math.max(8000, num));
          await this.plugin.saveSettings();
        })
      );

    // Default Output Format
    new Setting(containerEl)
      .setName(t().settings.defaultOutputFormat)
      .setDesc(t().settings.defaultOutputFormatDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('html', t().settings.htmlSlide);
        dropdown.addOption('pptx', t().settings.pptxSlide);
        dropdown.setValue(this.plugin.settings.defaultSlideOutputFormat || 'html');
        dropdown.onChange(async (value: SlideOutputFormat) => {
          this.plugin.settings.defaultSlideOutputFormat = value;
          await this.plugin.saveSettings();
        });
      });

    // Default HTML Style
    new Setting(containerEl)
      .setName(t().settings.defaultHtmlStyle)
      .setDesc(t().settings.defaultHtmlStyleDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('vertical-scroll', t().settings.verticalScroll);
        dropdown.addOption('presentation', t().settings.presentation);
        dropdown.setValue(this.plugin.settings.defaultHtmlSlideStyle || 'vertical-scroll');
        dropdown.onChange(async (value: HtmlSlideStyle) => {
          this.plugin.settings.defaultHtmlSlideStyle = value;
          await this.plugin.saveSettings();
        });
      });

    // Default PPTX Style
    new Setting(containerEl)
      .setName(t().settings.defaultPptxStyle)
      .setDesc(t().settings.defaultPptxStyleDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('standard', t().settings.fixedLayout);
        dropdown.addOption('flexible', t().settings.flexibleLayout);
        dropdown.setValue(this.plugin.settings.defaultPptxSlideStyle || 'standard');
        dropdown.onChange(async (value: PptxSlideStyle) => {
          this.plugin.settings.defaultPptxSlideStyle = value;
          await this.plugin.saveSettings();
        });
      });

    // Default Upload Destination
    new Setting(containerEl)
      .setName(t().settings.defaultUploadDest)
      .setDesc(t().settings.defaultUploadDestDesc)
      .addDropdown(dropdown => {
        dropdown.addOption('none', t().settings.uploadNone);
        dropdown.addOption('drive', t().settings.uploadDrive);
        dropdown.addOption('github', t().settings.uploadGithub);
        dropdown.setValue(this.plugin.settings.defaultSlideUploadDestination || 'drive');
        dropdown.onChange(async (value: SlideUploadDestination) => {
          this.plugin.settings.defaultSlideUploadDestination = value;
          await this.plugin.saveSettings();
        });
      });

    // Show slide preview before generation
    new Setting(containerEl)
      .setName(t().settings.showSlideOptions)
      .setDesc(t().settings.showSlideOptionsDesc)
      .addToggle(toggle => toggle
        .setValue(this.plugin.settings.showSlidePreviewBeforeGeneration ?? true)
        .onChange(async (value) => {
          this.plugin.settings.showSlidePreviewBeforeGeneration = value;
          await this.plugin.saveSettings();
        })
      );

    // Prompt Management with Tabs
    new Setting(containerEl)
      .setName(t().settings.promptManagement)
      .setHeading();

    this.createPromptTabs(containerEl);
  }

  private createPromptTabs(containerEl: HTMLElement) {
    const prompts = [
      {
        id: 'html-vertical',
        label: t().settings.htmlVertical,
        description: t().settings.htmlVerticalDesc,
        getValue: () => this.plugin.settings.htmlVerticalScrollPromptOverride || BUILTIN_HTML_PROMPTS['vertical-scroll'].prompt,
        getDefault: () => BUILTIN_HTML_PROMPTS['vertical-scroll'].prompt,
        setValue: async (v: string) => { this.plugin.settings.htmlVerticalScrollPromptOverride = v; await this.plugin.saveSettings(); }
      },
      {
        id: 'html-presentation',
        label: t().settings.htmlPresentation,
        description: t().settings.htmlPresentationDesc,
        getValue: () => this.plugin.settings.htmlPresentationPromptOverride || BUILTIN_HTML_PROMPTS['presentation'].prompt,
        getDefault: () => BUILTIN_HTML_PROMPTS['presentation'].prompt,
        setValue: async (v: string) => { this.plugin.settings.htmlPresentationPromptOverride = v; await this.plugin.saveSettings(); }
      },
      {
        id: 'pptx-standard',
        label: t().settings.pptxStandard,
        description: t().settings.pptxStandardDesc,
        getValue: () => this.plugin.settings.pptxStandardPromptOverride || BUILTIN_PPTX_PROMPTS['standard'].prompt,
        getDefault: () => BUILTIN_PPTX_PROMPTS['standard'].prompt,
        setValue: async (v: string) => { this.plugin.settings.pptxStandardPromptOverride = v; await this.plugin.saveSettings(); }
      },
      {
        id: 'pptx-flexible',
        label: t().settings.pptxFlexible,
        description: t().settings.pptxFlexibleDesc,
        getValue: () => this.plugin.settings.pptxFlexiblePromptOverride || BUILTIN_PPTX_PROMPTS['flexible'].prompt,
        getDefault: () => BUILTIN_PPTX_PROMPTS['flexible'].prompt,
        setValue: async (v: string) => { this.plugin.settings.pptxFlexiblePromptOverride = v; await this.plugin.saveSettings(); }
      }
    ];

    const wrapper = containerEl.createDiv({ cls: 'prompt-tabs-wrapper' });
    wrapper.style.cssText = `
      border: 1px solid var(--background-modifier-border);
      border-radius: 8px;
      overflow: hidden;
      margin-bottom: 16px;
    `;

    // Tab buttons
    const tabBar = wrapper.createDiv({ cls: 'prompt-tab-bar' });
    tabBar.style.cssText = `
      display: flex;
      background: var(--background-secondary);
      border-bottom: 1px solid var(--background-modifier-border);
    `;

    // Content container
    const contentContainer = wrapper.createDiv({ cls: 'prompt-tab-content' });
    contentContainer.style.cssText = `
      padding: 16px;
      background: var(--background-primary);
    `;

    const tabButtons: HTMLElement[] = [];
    const tabContents: HTMLElement[] = [];

    prompts.forEach((prompt, index) => {
      // Create tab button
      const tabBtn = tabBar.createEl('button', { text: prompt.label });
      const isModified = prompt.getValue() !== prompt.getDefault();
      tabBtn.style.cssText = `
        flex: 1;
        padding: 10px 8px;
        border: none;
        background: ${index === 0 ? 'var(--background-primary)' : 'transparent'};
        cursor: pointer;
        font-size: 12px;
        font-weight: ${index === 0 ? '600' : '400'};
        color: var(--text-normal);
        border-bottom: ${index === 0 ? '2px solid var(--interactive-accent)' : '2px solid transparent'};
        transition: all 0.15s ease;
      `;
      if (isModified) {
        tabBtn.textContent = prompt.label + ' *';
      }
      tabButtons.push(tabBtn);

      // Create tab content
      const content = contentContainer.createDiv();
      content.style.display = index === 0 ? 'block' : 'none';
      tabContents.push(content);

      // Description
      const descEl = content.createEl('p', { text: prompt.description });
      descEl.style.cssText = `margin: 0 0 12px 0; font-size: 12px; color: var(--text-muted);`;

      // Textarea
      const textArea = content.createEl('textarea');
      textArea.value = prompt.getValue();
      textArea.style.cssText = `
        width: 100%;
        min-height: 250px;
        max-height: 400px;
        font-family: var(--font-monospace);
        font-size: 11px;
        line-height: 1.5;
        padding: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-secondary);
        color: var(--text-normal);
        resize: vertical;
      `;

      // Button row
      const btnRow = content.createDiv();
      btnRow.style.cssText = `display: flex; justify-content: space-between; align-items: center; margin-top: 12px;`;

      // Status
      const statusEl = btnRow.createEl('span');
      statusEl.style.cssText = `font-size: 11px; color: var(--text-muted);`;
      statusEl.textContent = isModified ? t().settings.userModified : t().settings.usingDefault;

      // Load default button
      const loadDefaultBtn = btnRow.createEl('button', { text: t().settings.loadDefault });
      loadDefaultBtn.style.cssText = `font-size: 12px; padding: 6px 14px; cursor: pointer;`;
      loadDefaultBtn.disabled = !isModified;
      if (!isModified) loadDefaultBtn.classList.add('mod-muted');

      // Event handlers
      textArea.onchange = async () => {
        const newValue = textArea.value;
        const defaultVal = prompt.getDefault();
        if (newValue === defaultVal || newValue.trim() === '') {
          await prompt.setValue('');
          textArea.value = defaultVal;
          statusEl.textContent = t().settings.usingDefault;
          loadDefaultBtn.disabled = true;
          loadDefaultBtn.classList.add('mod-muted');
          tabBtn.textContent = prompt.label;
        } else {
          await prompt.setValue(newValue);
          statusEl.textContent = t().settings.userModified;
          loadDefaultBtn.disabled = false;
          loadDefaultBtn.classList.remove('mod-muted');
          tabBtn.textContent = prompt.label + ' *';
        }
      };

      loadDefaultBtn.onclick = async () => {
        textArea.value = prompt.getDefault();
        await prompt.setValue('');
        statusEl.textContent = t().settings.usingDefault;
        loadDefaultBtn.disabled = true;
        loadDefaultBtn.classList.add('mod-muted');
        tabBtn.textContent = prompt.label;
        new Notice(t().notice.defaultRestored);
      };

      // Tab click handler
      tabBtn.onclick = () => {
        tabButtons.forEach((btn, i) => {
          const isActive = i === index;
          btn.style.background = isActive ? 'var(--background-primary)' : 'transparent';
          btn.style.fontWeight = isActive ? '600' : '400';
          btn.style.borderBottom = isActive ? '2px solid var(--interactive-accent)' : '2px solid transparent';
          tabContents[i].style.display = isActive ? 'block' : 'none';
        });
      };
    });
  }

  private createTTSSection(containerEl: HTMLElement) {
    new Setting(containerEl)
      .setName(t().settings.ttsSettings)
      .setHeading();

    // TTS Provider
    new Setting(containerEl)
      .setName(t().settings.ttsProvider)
      .setDesc(t().settings.ttsProviderDesc)
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
        .setName(t().settings.elevenlabsApiKey)
        .setDesc(t().settings.elevenlabsApiKeyDesc)
        .addText(text => text
          .setPlaceholder(t().settings.elevenlabsPlaceholder)
          .setValue(this.plugin.settings.elevenlabsApiKey)
          .onChange(async (value) => {
            this.plugin.settings.elevenlabsApiKey = value;
            await this.plugin.saveSettings();
          })
        )
        .addExtraButton(button => button
          .setIcon('external-link')
          .setTooltip(t().settings.getElevenlabsKey)
          .onClick(() => window.open('https://elevenlabs.io/app/speech-synthesis', '_blank'))
        );
    }

    // TTS Model
    const ttsProviderConfig = TTS_PROVIDER_CONFIGS[this.plugin.settings.ttsProvider];
    new Setting(containerEl)
      .setName(t().settings.ttsModel)
      .setDesc(t().settings.ttsModelDesc(ttsProviderConfig.suggestedModels))
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
      .setName(t().settings.defaultSpeechTemplate)
      .setDesc(t().settings.defaultSpeechTemplateDesc)
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
        .setName(t().settings.defaultVoice)
        .setDesc(t().settings.defaultVoiceDesc)
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
          .setName(t().settings.hostAVoice)
          .setDesc(t().settings.hostAVoiceDesc)
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
          .setName(t().settings.hostBVoice)
          .setDesc(t().settings.hostBVoiceDesc)
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
      .setName(t().settings.scriptProvider)
      .setDesc(t().settings.scriptProviderDesc)
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
      .setName(t().settings.scriptModel)
      .setDesc(t().settings.scriptModelDesc(scriptProviderConfig.suggestedModels))
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
      .setName(t().settings.targetDuration)
      .setDesc(t().settings.targetDurationDesc)
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
      .setName(t().settings.audioFormat)
      .setDesc(t().settings.audioFormatDesc)
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
      .setName(t().settings.audioFolder)
      .setDesc(t().settings.audioFolderDesc)
      .addText(text => text
        .setPlaceholder('StarCloud/Audio')
        .setValue(this.plugin.settings.audioVaultFolder)
        .onChange(async (value) => {
          this.plugin.settings.audioVaultFolder = value || 'StarCloud/Audio';
          await this.plugin.saveSettings();
        })
      );

    // Show Speech Preview
    new Setting(containerEl)
      .setName(t().settings.speechPreview)
      .setDesc(t().settings.speechPreviewDesc)
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
      .setName(t().settings.gitIntegration)
      .setHeading();

    new Setting(containerEl)
      .setName(t().settings.gitEnabled)
      .setDesc(t().settings.gitEnabledDesc)
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
        .setName(t().settings.gitRepoPath)
        .setDesc(t().settings.gitRepoPathDesc)
        .addText(text => text
          .setPlaceholder('/path/to/git/repo')
          .setValue(this.plugin.settings.gitRepoPath || '')
          .onChange(async (value) => {
            this.plugin.settings.gitRepoPath = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName(t().settings.gitBranch)
        .setDesc(t().settings.gitBranchDesc)
        .addText(text => text
          .setPlaceholder('main')
          .setValue(this.plugin.settings.gitBranch || 'main')
          .onChange(async (value) => {
            this.plugin.settings.gitBranch = value || 'main';
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName(t().settings.githubToken)
        .setDesc(t().settings.githubTokenDesc)
        .addText(text => text
          .setPlaceholder('ghp_xxxxxxxxxxxx')
          .setValue(this.plugin.settings.githubToken || '')
          .onChange(async (value) => {
            this.plugin.settings.githubToken = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName(t().settings.githubPagesUrl)
        .setDesc(t().settings.githubPagesUrlDesc)
        .addText(text => text
          .setPlaceholder('https://username.github.io/repo')
          .setValue(this.plugin.settings.githubPagesUrl || '')
          .onChange(async (value) => {
            this.plugin.settings.githubPagesUrl = value;
            await this.plugin.saveSettings();
          })
        );

      new Setting(containerEl)
        .setName(t().settings.autoCommitPush)
        .setDesc(t().settings.autoCommitPushDesc)
        .addToggle(toggle => toggle
          .setValue(this.plugin.settings.autoCommitPush ?? false)
          .onChange(async (value) => {
            this.plugin.settings.autoCommitPush = value;
            await this.plugin.saveSettings();
          })
        );

      // Test connection button
      new Setting(containerEl)
        .setName(t().settings.testConnection)
        .setDesc(t().settings.testConnectionDesc)
        .addButton(button => button
          .setButtonText(t().settings.testConnectionBtn)
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

// ============================================================
// Provider Edit Modal
// ============================================================

class ProviderEditModal extends Modal {
  private provider: AIProviderDefinition | null;
  private onSave: (provider: AIProviderDefinition) => Promise<void>;

  // Form state
  private formName: string = '';
  private formBaseUrl: string = '';
  private formApiKey: string = '';
  private formAuthType: AIAuthType = 'bearer';
  private formApiFormat: AIApiFormat = 'openai';

  constructor(
    app: App,
    provider: AIProviderDefinition | null,
    onSave: (provider: AIProviderDefinition) => Promise<void>
  ) {
    super(app);
    this.provider = provider;
    this.onSave = onSave;

    if (provider) {
      this.formName = provider.name;
      this.formBaseUrl = provider.baseUrl;
      this.formApiKey = provider.apiKey;
      this.formAuthType = provider.authType;
      this.formApiFormat = provider.apiFormat;
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    const isBuiltIn = this.provider?.isBuiltIn ?? false;

    contentEl.createEl('h2', {
      text: this.provider ? t().providerModal.titleEdit : t().providerModal.titleAdd
    });

    // Preset selector (for new providers only)
    if (!this.provider) {
      new Setting(contentEl)
        .setName(t().providerModal.provider)
        .setDesc(t().providerModal.providerDesc)
        .addDropdown(dropdown => {
          dropdown.addOption('', t().common.custom);
          BUILT_IN_PROVIDERS.forEach(p => {
            dropdown.addOption(p.id, p.name);
          });
          dropdown.setValue('');
          dropdown.onChange((value) => {
            if (value) {
              const preset = BUILT_IN_PROVIDERS.find(p => p.id === value);
              if (preset) {
                this.formName = preset.name;
                this.formBaseUrl = preset.baseUrl;
                this.formAuthType = preset.authType;
                this.formApiFormat = preset.apiFormat;
                this.onOpen();
              }
            }
          });
        });
    }

    // Name (빌트인: 읽기전용)
    if (isBuiltIn) {
      new Setting(contentEl)
        .setName(t().providerModal.name)
        .setDesc(this.formName);
    } else {
      new Setting(contentEl)
        .setName(t().providerModal.name)
        .setDesc(t().providerModal.nameDesc)
        .addText(text => text
          .setPlaceholder(t().providerModal.namePlaceholder)
          .setValue(this.formName)
          .onChange(value => { this.formName = value; })
        );
    }

    // Base URL (빌트인: 읽기전용)
    if (isBuiltIn) {
      new Setting(contentEl)
        .setName(t().providerModal.baseUrl)
        .setDesc(this.formBaseUrl);
    } else {
      new Setting(contentEl)
        .setName(t().providerModal.baseUrl)
        .setDesc(t().providerModal.baseUrlDesc)
        .addText(text => text
          .setPlaceholder(t().providerModal.baseUrlPlaceholder)
          .setValue(this.formBaseUrl)
          .onChange(value => { this.formBaseUrl = value; })
        );
    }

    // API Key (항상 편집 가능)
    new Setting(contentEl)
      .setName(t().providerModal.apiKey)
      .setDesc(t().providerModal.apiKeyDesc)
      .addText(text => {
        text
          .setPlaceholder(t().providerModal.apiKeyPlaceholder)
          .setValue(this.formApiKey)
          .onChange(value => { this.formApiKey = value; });
        text.inputEl.type = 'password';
      });

    // Auth Type & API Format (커스텀 프로바이더만 표시)
    if (!isBuiltIn) {
      new Setting(contentEl)
        .setName(t().providerModal.authType)
        .setDesc(t().providerModal.authTypeDesc)
        .addDropdown(dropdown => {
          dropdown.addOption('bearer', 'Bearer Token');
          dropdown.addOption('x-api-key', 'X-API-Key');
          dropdown.addOption('query-param', 'Query Parameter');
          dropdown.setValue(this.formAuthType);
          dropdown.onChange(value => { this.formAuthType = value as AIAuthType; });
        });

      new Setting(contentEl)
        .setName(t().providerModal.apiFormat)
        .setDesc(t().providerModal.apiFormatDesc)
        .addDropdown(dropdown => {
          dropdown.addOption('openai', 'OpenAI Compatible');
          dropdown.addOption('anthropic', 'Anthropic');
          dropdown.addOption('gemini', 'Gemini');
          dropdown.setValue(this.formApiFormat);
          dropdown.onChange(value => { this.formApiFormat = value as AIApiFormat; });
        });
    }

    // Buttons
    const btnRow = contentEl.createDiv({ cls: 'modal-button-container' });

    const saveBtn = btnRow.createEl('button', { text: t().providerModal.save, cls: 'mod-cta' });
    saveBtn.onclick = async () => {
      if (!isBuiltIn && !this.formName.trim()) {
        new Notice(t().providerModal.nameRequired);
        return;
      }
      if (!isBuiltIn && !this.formBaseUrl.trim()) {
        new Notice(t().providerModal.baseUrlRequired);
        return;
      }

      const providerDef: AIProviderDefinition = {
        id: this.provider?.id || `custom-${Date.now()}`,
        name: isBuiltIn ? this.provider!.name : this.formName.trim(),
        baseUrl: isBuiltIn ? this.provider!.baseUrl : this.formBaseUrl.trim(),
        apiKey: this.formApiKey,
        authType: isBuiltIn ? this.provider!.authType : this.formAuthType,
        apiFormat: isBuiltIn ? this.provider!.apiFormat : this.formApiFormat,
        isBuiltIn: isBuiltIn,
        suggestedModels: this.provider?.suggestedModels,
      };

      await this.onSave(providerDef);
      this.close();
    };

    const cancelBtn = btnRow.createEl('button', { text: t().providerModal.cancel });
    cancelBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================
// Model Edit Modal
// ============================================================

class ModelEditModal extends Modal {
  private model: AIModelDefinition | null;
  private providers: AIProviderDefinition[];
  private onSave: (model: AIModelDefinition) => Promise<void>;

  // Form state
  private formName: string = '';
  private formModelId: string = '';
  private formProviderId: string = '';
  private formApiKey: string = '';
  private formIsImageModel: boolean = false;
  private formImageRequestParams: string = '';

  constructor(
    app: App,
    model: AIModelDefinition | null,
    providers: AIProviderDefinition[],
    onSave: (model: AIModelDefinition) => Promise<void>
  ) {
    super(app);
    this.model = model;
    this.providers = providers;
    this.onSave = onSave;

    if (model) {
      this.formName = model.name;
      this.formModelId = model.id;
      this.formProviderId = model.providerId;
      this.formApiKey = model.apiKey || '';
      this.formIsImageModel = model.isImageModel || false;
      this.formImageRequestParams = model.imageRequestParams || '';
    } else if (providers.length > 0) {
      this.formProviderId = providers[0].id;
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();

    contentEl.createEl('h2', {
      text: this.model ? t().modelModal.titleEdit : t().modelModal.titleAdd
    });

    // Provider
    new Setting(contentEl)
      .setName(t().modelModal.provider)
      .setDesc(t().modelModal.providerDesc)
      .addDropdown(dropdown => {
        this.providers.forEach(p => {
          dropdown.addOption(p.id, p.name);
        });
        if (this.formProviderId) {
          dropdown.setValue(this.formProviderId);
        }
        dropdown.onChange(value => { this.formProviderId = value; });
      });

    // Name
    new Setting(contentEl)
      .setName(t().modelModal.name)
      .setDesc(t().modelModal.nameDesc)
      .addText(text => text
        .setPlaceholder(t().modelModal.namePlaceholder)
        .setValue(this.formName)
        .onChange(value => { this.formName = value; })
      );

    // Model ID
    new Setting(contentEl)
      .setName(t().modelModal.modelId)
      .setDesc(t().modelModal.modelIdDesc)
      .addText(text => text
        .setPlaceholder(t().modelModal.modelIdPlaceholder)
        .setValue(this.formModelId)
        .onChange(value => { this.formModelId = value; })
      );

    // Dedicated API Key (optional)
    new Setting(contentEl)
      .setName(t().modelModal.apiKey)
      .setDesc(t().modelModal.apiKeyDesc)
      .addText(text => text
        .setPlaceholder(t().modelModal.apiKeyPlaceholder)
        .setValue(this.formApiKey)
        .onChange(value => { this.formApiKey = value; })
      );

    // Image Model checkbox
    new Setting(contentEl)
      .setName(t().modelModal.isImageModel)
      .setDesc(t().modelModal.isImageModelDesc)
      .addToggle(toggle => toggle
        .setValue(this.formIsImageModel)
        .onChange(value => {
          this.formIsImageModel = value;
          this.onOpen(); // re-render to show/hide params
        })
      );

    // Image Request Params (이미지 모델이고, Gemini가 아닌 경우만 표시)
    if (this.formIsImageModel) {
      const provider = this.providers.find(p => p.id === this.formProviderId);
      if (provider?.apiFormat !== 'gemini') {
        const paramSetting = new Setting(contentEl)
          .setName(t().modelModal.imageRequestParams)
          .setDesc(t().modelModal.imageRequestParamsDesc);

        const textArea = contentEl.createEl('textarea');
        textArea.value = this.formImageRequestParams || DEFAULT_IMAGE_REQUEST_PARAMS;
        textArea.placeholder = t().modelModal.imageRequestParamsPlaceholder;
        textArea.style.cssText = `
          width: calc(100% - 4px);
          min-height: 120px;
          max-height: 200px;
          font-family: var(--font-monospace);
          font-size: 11px;
          line-height: 1.4;
          padding: 8px;
          margin-bottom: 12px;
          border: 1px solid var(--background-modifier-border);
          border-radius: 6px;
          background: var(--background-secondary);
          color: var(--text-normal);
          resize: vertical;
          box-sizing: border-box;
        `;
        textArea.onchange = () => {
          this.formImageRequestParams = textArea.value.trim();
        };
      }
    }

    // Test Connection
    const testSetting = new Setting(contentEl)
      .setName(t().common.test)
      .setDesc('');

    const testStatusEl = testSetting.descEl;

    testSetting.addButton(button => button
      .setButtonText(t().common.test)
      .onClick(async () => {
        const provider = this.providers.find(p => p.id === this.formProviderId);
        if (!provider) {
          testStatusEl.textContent = `❌ ${t().modelModal.providerRequired}`;
          return;
        }
        if (!this.formModelId.trim()) {
          testStatusEl.textContent = `❌ ${t().modelModal.modelIdRequired}`;
          return;
        }

        const apiKey = this.formApiKey || provider.apiKey;
        if (!apiKey) {
          testStatusEl.textContent = `❌ ${t().settings.apiKeyNotSet}`;
          return;
        }

        button.setButtonText(t().common.testing);
        button.setDisabled(true);
        testStatusEl.textContent = t().common.testing;

        try {
          const result = await testModelConnection(
            provider, this.formModelId.trim(), apiKey,
            this.formIsImageModel, this.formIsImageModel ? this.formImageRequestParams : undefined
          );
          testStatusEl.textContent = `✅ ${result}`;
          testStatusEl.style.color = 'var(--text-success)';
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          testStatusEl.textContent = `❌ ${msg}`;
          testStatusEl.style.color = 'var(--text-error)';
        } finally {
          button.setButtonText(t().common.test);
          button.setDisabled(false);
        }
      })
    );

    // Buttons
    const btnRow = contentEl.createDiv({ cls: 'modal-button-container' });

    const saveBtn = btnRow.createEl('button', { text: t().modelModal.save, cls: 'mod-cta' });
    saveBtn.onclick = async () => {
      if (!this.formName.trim()) {
        new Notice(t().modelModal.nameRequired);
        return;
      }
      if (!this.formModelId.trim()) {
        new Notice(t().modelModal.modelIdRequired);
        return;
      }
      if (!this.formProviderId) {
        new Notice(t().modelModal.providerRequired);
        return;
      }

      const modelDef: AIModelDefinition = {
        id: this.formModelId.trim(),
        name: this.formName.trim(),
        providerId: this.formProviderId,
        enabled: true,
        apiKey: this.formApiKey || undefined,
        isImageModel: this.formIsImageModel,
        imageRequestParams: this.formIsImageModel && this.formImageRequestParams
          ? this.formImageRequestParams
          : undefined,
      };

      await this.onSave(modelDef);
      this.close();
    };

    const cancelBtn = btnRow.createEl('button', { text: t().modelModal.cancel });
    cancelBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================
// System Prompt View Modal
// ============================================================

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
    contentEl.addClass('starcloud-prompt-view-modal');

    // Add styles
    const style = document.createElement('style');
    style.textContent = `
      .starcloud-prompt-view-modal {
        width: 700px;
        max-width: 90vw;
      }
      .starcloud-prompt-view-modal .prompt-textarea-container {
        width: 100%;
        margin: 16px 0;
      }
      .starcloud-prompt-view-modal textarea {
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

    contentEl.createEl('h2', { text: t().settings.systemPromptTitle(this.title) });

    const textAreaContainer = contentEl.createDiv({ cls: 'prompt-textarea-container' });
    const textArea = textAreaContainer.createEl('textarea');
    textArea.value = this.prompt;
    textArea.readOnly = true;

    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const copyBtn = buttonContainer.createEl('button', {
      text: t().settings.copyToClipboard,
      cls: 'mod-cta'
    });
    copyBtn.onclick = async () => {
      await navigator.clipboard.writeText(this.prompt);
      new Notice(t().notice.promptCopied);
    };

    const closeBtn = buttonContainer.createEl('button', { text: t().common.close });
    closeBtn.onclick = () => this.close();
  }

  onClose() {
    const { contentEl } = this;
    contentEl.empty();
  }
}

// ============================================================
// Test Connection Helper
// ============================================================

async function testModelConnection(
  provider: AIProviderDefinition,
  modelId: string,
  apiKey: string,
  isImageModel?: boolean,
  imageRequestParams?: string
): Promise<string> {
  const testPrompt = isImageModel
    ? 'Generate a simple 50x50 pixel solid blue square image.'
    : 'Say "ok"';

  if (provider.apiFormat === 'gemini') {
    const url = `${provider.baseUrl}/${modelId}:generateContent?key=${apiKey}`;
    const body: Record<string, unknown> = isImageModel
      ? {
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: { responseModalities: ['TEXT', 'IMAGE'] }
        }
      : {
          contents: [{ parts: [{ text: testPrompt }] }],
          generationConfig: { maxOutputTokens: 5 }
        };
    const response = await requestUrl({
      url, method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.text}`);
    }
    if (isImageModel) {
      const data = response.json;
      const parts = data.candidates?.[0]?.content?.parts || [];
      const hasImage = parts.some((p: any) => p.inlineData?.mimeType?.startsWith('image/'));
      if (hasImage) return 'Image generated successfully';
      return 'Response received (no image in response)';
    }
    return 'OK';
  } else if (provider.apiFormat === 'openai') {
    const body: Record<string, unknown> = {
      model: modelId,
      messages: [{ role: 'user', content: testPrompt }],
    };
    if (isImageModel && imageRequestParams) {
      try {
        const extraParams = JSON.parse(imageRequestParams
          .replace(/\{ratio\}/g, '1:1')
          .replace(/\{size\}/g, '1K'));
        Object.assign(body, extraParams);
      } catch { /* JSON 파싱 실패 시 무시 */ }
    }
    if (!isImageModel) {
      body.max_tokens = 5;
    }
    const response = await requestUrl({
      url: provider.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify(body),
    });
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.text}`);
    }
    if (isImageModel) {
      const data = response.json;
      const content = data.choices?.[0]?.message?.content;
      if (typeof content === 'string') return 'Text response received';
      if (Array.isArray(content)) {
        const hasImage = content.some((c: any) => c.type === 'image_url' || c.type === 'image');
        if (hasImage) return 'Image generated successfully';
      }
      return 'Response received';
    }
    return 'OK';
  } else if (provider.apiFormat === 'anthropic') {
    const response = await requestUrl({
      url: provider.baseUrl,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'anthropic-dangerous-direct-browser-access': 'true',
      },
      body: JSON.stringify({
        model: modelId,
        messages: [{ role: 'user', content: testPrompt }],
        max_tokens: isImageModel ? 1024 : 5,
      }),
    });
    if (response.status !== 200) {
      throw new Error(`HTTP ${response.status}: ${response.text}`);
    }
    return 'OK';
  } else {
    throw new Error(`Unknown API format: ${provider.apiFormat}`);
  }
}
