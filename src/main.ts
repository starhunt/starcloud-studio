import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import {
  StarCloudStudioSettings,
  QuickOptionsResult,
  PreviewModalResult,
  SlideOptionsResult,
  SpeechOptionsResult,
  SpeechPreviewResult,
  OAuthTokens,
  InputSource,
  EmbedPosition,
  GenerationErrorClass,
  DriveUploadResult,
  AIProvider,
  PROVIDER_CONFIGS,
  TTS_PROVIDER_CONFIGS,
  DialogueSegment,
  BUILT_IN_PROVIDERS,
  BUILT_IN_MODELS,
  AIProviderDefinition,
  AIModelDefinition
} from './types';
import { DEFAULT_SETTINGS, BUILTIN_SLIDE_PROMPTS } from './settingsData';
import { t, setLocale, setDetectedLocale, SupportedLocale } from './i18n';
import { StarCloudStudioSettingTab } from './settings';
import { PromptService } from './services/promptService';
import { ImageService } from './services/imageService';
import { SlideService, ProviderInfo } from './services/slideService';
import { PptxService } from './services/pptxService';
import { FileService } from './services/fileService';
import { GitService } from './services/gitService';
import { GoogleOAuthFlow } from './services/googleOAuthFlow';
import { DriveUploadService } from './services/driveUploadService';
import { EmbedService } from './services/embedService';
import { SpeechPromptService } from './services/speechPromptService';
import { TTSService } from './services/ttsService';
import { AudioFileService } from './services/audioFileService';
import { QuickOptionsModal } from './modals/quickOptionsModal';
import { PreviewModal } from './modals/previewModal';
import { ProgressModal, ProgressMode } from './modals/progressModal';
import { SlideOptionsModal } from './modals/slideOptionsModal';
import { DriveUploadModal, DriveUploadModalResult } from './modals/driveUploadModal';
import { SpeechOptionsModal } from './modals/speechOptionsModal';
import { SpeechPreviewModal } from './modals/speechPreviewModal';

export default class StarCloudStudioPlugin extends Plugin {
  settings: StarCloudStudioSettings;

  // Services
  private promptService: PromptService;
  private imageService: ImageService;
  private slideService: SlideService;
  private pptxService: PptxService;
  private fileService: FileService;
  private driveUploadService: DriveUploadService | null = null;
  private embedService: EmbedService;
  private speechPromptService: SpeechPromptService;
  private ttsService: TTSService;
  private audioFileService: AudioFileService;

  // State
  private isGenerating = false;

  async onload() {
    await this.loadSettings();

    // Initialize i18n
    const obsidianLocale = (this.app as any).locale || 'ko';
    setDetectedLocale(obsidianLocale);

    if (this.settings.language && this.settings.language !== 'auto') {
      setLocale(this.settings.language as SupportedLocale);
    }

    // Initialize services
    this.promptService = new PromptService();
    this.imageService = new ImageService();
    this.slideService = new SlideService();
    this.pptxService = new PptxService();
    this.fileService = new FileService(this.app);
    this.embedService = new EmbedService(this.app);
    this.speechPromptService = new SpeechPromptService();
    this.ttsService = new TTSService();
    this.audioFileService = new AudioFileService(this.app);

    // Initialize Drive service if credentials exist
    if (this.settings.googleClientId && this.settings.googleClientSecret) {
      this.initDriveService();
    }

    // Add settings tab
    this.addSettingTab(new StarCloudStudioSettingTab(this.app, this));

    // Register commands
    this.addCommand({
      id: 'generate-poster',
      name: 'Generate Knowledge Poster',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.generatePoster(editor, view);
      }
    });

    this.addCommand({
      id: 'generate-poster-from-selection',
      name: 'Generate Poster from Selection',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.generatePosterFromSelection(editor, view);
      }
    });

    this.addCommand({
      id: 'connect-google-drive',
      name: 'Connect to Google Drive',
      callback: () => {
        void this.startOAuthFlow();
      }
    });

    this.addCommand({
      id: 'generate-slide',
      name: 'Generate interactive slide',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.generateSlide(editor, view);
      }
    });

    this.addCommand({
      id: 'upload-to-drive',
      name: 'Upload file to Google Drive',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.uploadFileToDrive(editor, view);
      }
    });

    this.addCommand({
      id: 'generate-speech',
      name: 'Generate Speech from Note',
      editorCallback: (editor: Editor, view: MarkdownView) => {
        void this.generateSpeech(editor, view);
      }
    });

    // Add ribbon icon
    this.addRibbonIcon('image', 'Generate Knowledge Poster', () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view && view.editor) {
        void this.generatePoster(view.editor, view);
      } else {
        new Notice(t().notice.openNoteFirst);
      }
    });

  }

  onunload() {
  }

  async loadSettings() {
    const saved = await this.loadData();
    this.settings = Object.assign({}, DEFAULT_SETTINGS, saved);

    // Migrate v1 settings to v2 (dynamic providers)
    if (!saved?.settingsVersion || saved.settingsVersion < 2) {
      this.migrateToV2(saved);
    }

    // 누락된 빌트인 프로바이더/모델 자동 병합
    this.mergeBuiltIns();
  }

  /**
   * 새로 추가된 빌트인 프로바이더/모델을 기존 설정에 병합
   */
  private mergeBuiltIns() {
    let changed = false;
    const providers = this.settings.providers || [];
    const models = this.settings.models || [];

    // 빌트인 프로바이더: 누락 시 추가, 기존이면 isBuiltIn 플래그 동기화
    for (const builtIn of BUILT_IN_PROVIDERS) {
      const existing = providers.find(p => p.id === builtIn.id);
      if (!existing) {
        providers.push({ ...builtIn });
        changed = true;
      } else if (!existing.isBuiltIn) {
        existing.isBuiltIn = true;
        changed = true;
      }
    }

    // 누락된 빌트인 모델 추가
    for (const builtIn of BUILT_IN_MODELS) {
      if (!models.find(m => m.id === builtIn.id && m.providerId === builtIn.providerId)) {
        models.push({ ...builtIn });
        changed = true;
      }
    }

    if (changed) {
      this.settings.providers = providers;
      this.settings.models = models;
      void this.saveData(this.settings);
    }
  }

  /**
   * Migrate v1 settings (individual API keys) to v2 (dynamic providers)
   */
  private migrateToV2(saved: any) {
    if (!saved) return;

    // 기존 API 키를 프로바이더에 복사
    const keyMap: Record<string, string> = {
      google: saved.googleApiKey || '',
      openai: saved.openaiApiKey || '',
      anthropic: saved.anthropicApiKey || '',
      xai: saved.xaiApiKey || '',
      glm: saved.glmApiKey || '',
    };

    // 빌트인 프로바이더에 기존 키 적용
    this.settings.providers = BUILT_IN_PROVIDERS.map(p => ({
      ...p,
      apiKey: keyMap[p.id] || '',
    }));

    this.settings.models = [...BUILT_IN_MODELS];

    // 기존 선택된 프로바이더/모델을 기본값으로 설정
    if (saved.selectedProvider) {
      this.settings.defaultProviderId = saved.selectedProvider;
    }
    if (saved.promptModel) {
      this.settings.defaultModelId = saved.promptModel;
    }

    this.settings.settingsVersion = 2;

    // 비동기로 저장 (onload에서 호출되므로 fire-and-forget)
    void this.saveData(this.settings);
  }

  async saveSettings() {
    // 프로바이더 API 키를 레거시 필드에 동기화
    this.syncLegacyApiKeys();
    // 기본 프로바이더/모델을 레거시 필드에 동기화
    this.syncDefaultToLegacy();

    await this.saveData(this.settings);

    // Reinitialize Drive service when settings change
    if (this.settings.googleClientId && this.settings.googleClientSecret) {
      this.initDriveService();
    }
  }

  /**
   * 동적 프로바이더의 API 키를 레거시 필드에 동기화
   * (기존 서비스 코드가 레거시 필드를 참조하므로 필요)
   */
  /**
   * 기본 프로바이더/모델을 레거시 필드에 동기화
   */
  private syncDefaultToLegacy() {
    if (this.settings.defaultProviderId) {
      this.settings.selectedProvider = this.settings.defaultProviderId;
    }
    if (this.settings.defaultModelId) {
      this.settings.promptModel = this.settings.defaultModelId;
    }
  }

  private syncLegacyApiKeys() {
    const providers = this.settings.providers || [];
    const keyMap: Record<string, keyof StarCloudStudioSettings> = {
      google: 'googleApiKey',
      openai: 'openaiApiKey',
      anthropic: 'anthropicApiKey',
      xai: 'xaiApiKey',
      glm: 'glmApiKey',
    };

    for (const [providerId, settingsKey] of Object.entries(keyMap)) {
      const provider = providers.find(p => p.id === providerId);
      if (provider) {
        (this.settings as any)[settingsKey] = provider.apiKey;
      }
    }
  }

  /**
   * Initialize Google Drive service
   */
  private initDriveService() {
    this.driveUploadService = new DriveUploadService({
      clientId: this.settings.googleClientId,
      clientSecret: this.settings.googleClientSecret,
      accessToken: this.settings.googleAccessToken,
      refreshToken: this.settings.googleRefreshToken,
      tokenExpiresAt: this.settings.tokenExpiresAt,
      onTokenRefresh: async (tokens: OAuthTokens) => {
        this.settings.googleAccessToken = tokens.accessToken;
        this.settings.tokenExpiresAt = tokens.expiresAt;
        await this.saveSettings();
      }
    });
  }

  /**
   * Check if connected to Google Drive
   */
  isGoogleDriveConnected(): boolean {
    return !!(this.settings.googleAccessToken && this.settings.googleRefreshToken);
  }

  /**
   * Start OAuth flow to connect Google Drive
   */
  async startOAuthFlow(): Promise<boolean> {
    if (!this.settings.googleClientId || !this.settings.googleClientSecret) {
      new Notice(t().notice.configureGoogleApiKey);
      return false;
    }

    try {
      const oauthFlow = new GoogleOAuthFlow({
        clientId: this.settings.googleClientId,
        clientSecret: this.settings.googleClientSecret,
        redirectPort: 8586
      });

      const tokens = await oauthFlow.startOAuthFlow();

      this.settings.googleAccessToken = tokens.accessToken;
      this.settings.googleRefreshToken = tokens.refreshToken;
      this.settings.tokenExpiresAt = tokens.expiresAt;

      await this.saveSettings();
      this.initDriveService();

      new Notice(t().notice.driveConnected);
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(t().notice.driveFailed(message));
      console.error('OAuth flow error:', error);
      return false;
    }
  }

  /**
   * Disconnect from Google Drive
   */
  async disconnectGoogleDrive() {
    this.settings.googleAccessToken = '';
    this.settings.googleRefreshToken = '';
    this.settings.tokenExpiresAt = 0;

    await this.saveSettings();

    if (this.driveUploadService) {
      this.driveUploadService.disconnect();
    }

    new Notice(t().notice.driveDisconnected);
  }

  /**
   * Main poster generation flow
   */
  private async generatePoster(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice(t().notice.generationInProgress);
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice(t().notice.noActiveNote);
      return;
    }

    // Check prerequisites
    if (!this.checkPrerequisites()) {
      return;
    }

    // Check if there's a selection
    const hasSelection = this.embedService.hasSelection(editor);

    // Show quick options modal
    const options = await this.showQuickOptionsModal(hasSelection);
    if (!options.confirmed) {
      return;
    }

    // Start generation
    await this.executeGeneration(editor, noteFile, options);
  }

  /**
   * Generate poster from selection (direct)
   */
  private async generatePosterFromSelection(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice(t().notice.generationInProgress);
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice(t().notice.noActiveNote);
      return;
    }

    const hasSelection = this.embedService.hasSelection(editor);
    if (!hasSelection) {
      new Notice(t().notice.selectTextFirst);
      return;
    }

    if (!this.checkPrerequisites()) {
      return;
    }

    // Show quick options modal with selection pre-selected
    const options = await this.showQuickOptionsModal(true);
    if (!options.confirmed) {
      return;
    }

    // Force selection mode
    options.inputSource = 'selection';

    await this.executeGeneration(editor, noteFile, options);
  }

  /**
   * Execute the generation flow
   */
  private async executeGeneration(
    editor: Editor,
    noteFile: TFile,
    options: QuickOptionsResult
  ) {
    this.isGenerating = true;
    let progressModal: ProgressModal | null = null;

    try {
      // Show progress modal if enabled
      if (this.settings.showProgressModal) {
        progressModal = new ProgressModal(this.app, () => {
          this.isGenerating = false;
        }, 'image', this.settings.useDriveUpload);
        progressModal.open();
      }

      // Step 1: Get content based on input source
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: t().progress.analyzing
      });

      const content = await this.getContent(editor, noteFile, options.inputSource, options.customInputText);
      if (!content.trim()) {
        throw new GenerationErrorClass('NO_CONTENT', 'No content to generate from');
      }

      // Determine embed position
      const embedPosition = this.embedService.getEmbedPosition(editor, options.inputSource);

      // Step 2: Generate prompt
      progressModal?.updateProgress({
        step: 'generating-prompt',
        progress: 15,
        message: t().progress.generatingPrompt,
        details: `Using ${(this.settings.providers || []).find(p => p.id === this.settings.selectedProvider)?.name || this.settings.selectedProvider}`
      });

      let promptResult = await this.promptService.generatePrompt(
        content,
        this.settings.selectedProvider,
        this.settings.promptModel,
        this.getApiKeyForProvider(),
        options.imageStyle,
        options.imageStyle === 'infographic' ? options.infographicSubStyle : undefined,
        this.getProviderInfo(this.settings.selectedProvider)
      );

      // Add custom prefix if configured
      if (this.settings.customPromptPrefix) {
        promptResult.prompt = this.settings.customPromptPrefix + '\n\n' + promptResult.prompt;
      }

      // Step 3: Preview (optional)
      if (this.settings.showPreviewBeforeGeneration) {
        progressModal?.updateProgress({
          step: 'preview',
          progress: 30,
          message: t().progress.previewingPrompt
        });

        const previewResult = await this.showPreviewModal(promptResult.prompt);

        if (!previewResult.confirmed) {
          this.isGenerating = false;
          progressModal?.close();
          return;
        }

        if (previewResult.regenerate) {
          // Regenerate prompt
          progressModal?.updateProgress({
            step: 'generating-prompt',
            progress: 15,
            message: t().progress.regeneratingPrompt
          });

          promptResult = await this.promptService.generatePrompt(
            content,
            this.settings.selectedProvider,
            this.settings.promptModel,
            this.getApiKeyForProvider(),
            options.imageStyle,
            options.imageStyle === 'infographic' ? options.infographicSubStyle : undefined
          );
        } else {
          // Use edited prompt
          promptResult.prompt = previewResult.prompt;
        }
      }

      // Step 4: Generate image with retry
      progressModal?.updateProgress({
        step: 'generating-image',
        progress: 40,
        message: t().progress.generatingImage
      });

      const cartoonCuts = options.cartoonCuts === 'custom'
        ? options.customCartoonCuts
        : parseInt(options.cartoonCuts);

      // 이미지 프로바이더 정보 조회
      const imageProviderId = this.settings.imageProvider || 'google';
      const imageProvider = (this.settings.providers || []).find(p => p.id === imageProviderId);
      const imageApiKey = imageProvider?.apiKey || this.getApiKeyForProvider(imageProviderId);
      const imageBaseUrl = imageProvider?.baseUrl || 'https://generativelanguage.googleapis.com/v1beta/models';
      const imageAuthType = imageProvider?.authType || 'query-param';
      const imageApiFormat = imageProvider?.apiFormat || 'gemini';

      // 선택된 이미지 모델의 요청 파라미터 조회
      const imageModelDef = (this.settings.models || []).find(m => m.id === this.settings.imageModel);
      const imageRequestParams = imageModelDef?.imageRequestParams;

      const imageResult = await this.executeWithRetry(
        () => this.imageService.generateImage(
          promptResult.prompt,
          imageApiKey,
          this.settings.imageModel,
          options.imageStyle,
          this.settings.preferredLanguage,
          options.imageSize,
          cartoonCuts,
          options.infographicSubStyle,
          options.imageOrientation,
          imageBaseUrl,
          imageAuthType,
          imageApiFormat,
          imageRequestParams
        ),
        this.settings.autoRetryCount
      );

      const fileName = this.generateFileName(noteFile.basename);

      if (this.settings.useDriveUpload && this.driveUploadService) {
        // Step 5: Upload to Google Drive
        progressModal?.updateProgress({
          step: 'uploading',
          progress: 70,
          message: t().progress.uploading
        });

        const driveImageFolder = `${this.settings.driveFolder || 'StarCloud'}/Data`;
        const uploadResult = await this.driveUploadService.uploadImage(
          imageResult.imageData,
          imageResult.mimeType,
          fileName,
          driveImageFolder,
          this.settings.organizeFoldersByDate,
          (progress) => {
            progressModal?.updateProgress({
              step: 'uploading',
              progress: 70 + (progress.progress * 0.2),
              message: progress.message
            });
          }
        );

        // Step 6: Embed in note
        progressModal?.updateProgress({
          step: 'embedding',
          progress: 95,
          message: t().progress.embedding
        });

        await this.embedService.embedDriveImageInNote(
          editor,
          noteFile,
          uploadResult,
          {
            size: this.settings.embedSize,
            showTitle: this.settings.showTitleInEmbed
          },
          embedPosition
        );
      } else {
        // Step 5-6: Save locally and embed
        progressModal?.updateProgress({
          step: 'saving',
          progress: 70,
          message: t().progress.saving
        });

        const attachmentFolder = `${this.settings.driveFolder || 'StarCloud'}/Data`;
        const savedPath = await this.fileService.saveImage(
          imageResult.imageData,
          imageResult.mimeType,
          noteFile,
          attachmentFolder
        );

        progressModal?.updateProgress({
          step: 'embedding',
          progress: 95,
          message: t().progress.embedding
        });

        // Obsidian 마크다운 이미지 임베드
        const embedCode = `![[${savedPath}]]`;
        const cursor = editor.getCursor();
        const lineContent = editor.getLine(cursor.line);
        if (lineContent.trim()) {
          editor.replaceRange('\n\n' + embedCode + '\n', { line: cursor.line, ch: lineContent.length });
        } else {
          editor.replaceRange(embedCode + '\n\n', cursor);
        }
      }

      // Complete!
      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: t().progress.posterComplete
      });

      new Notice(t().notice.posterCreated);

    } catch (error) {
      console.error('Generation error:', error);
      const message = error instanceof Error ? error.message : String(error);

      if (progressModal) {
        progressModal.showError(message);
      } else {
        new Notice(`Generation failed: ${message}`);
      }
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Get content based on input source
   */
  private async getContent(
    editor: Editor,
    noteFile: TFile,
    inputSource: InputSource,
    customInputText?: string
  ): Promise<string> {
    if (inputSource === 'custom' && customInputText) {
      return customInputText;
    }

    if (inputSource === 'selection') {
      const selection = this.embedService.getSelectedText(editor);
      if (selection) {
        return selection;
      }
    }

    // Full note content
    return await this.app.vault.read(noteFile);
  }

  /**
   * Get API key for the currently selected provider
   */
  private getApiKeyForProvider(provider?: AIProvider): string {
    const targetProvider = provider || this.settings.selectedProvider;

    // 동적 프로바이더에서 먼저 조회
    const providerDef = (this.settings.providers || []).find(p => p.id === targetProvider);
    if (providerDef?.apiKey) {
      return providerDef.apiKey;
    }

    // 레거시 폴백
    const keyMap: Record<string, string> = {
      openai: this.settings.openaiApiKey,
      google: this.settings.googleApiKey,
      anthropic: this.settings.anthropicApiKey,
      xai: this.settings.xaiApiKey,
      glm: this.settings.glmApiKey
    };
    return keyMap[targetProvider] || '';
  }

  /**
   * 동적 프로바이더 정보 조회 (서비스에 전달용)
   */
  private getProviderInfo(providerId: string): ProviderInfo | undefined {
    const provider = (this.settings.providers || []).find(p => p.id === providerId);
    if (!provider) return undefined;
    return {
      baseUrl: provider.baseUrl,
      apiFormat: provider.apiFormat,
      authType: provider.authType,
    };
  }

  /**
   * 프로바이더의 첫 번째 비-이미지 모델 ID 반환
   */
  private getDefaultModelForProvider(providerId: string): string {
    const models = this.settings.models || [];
    const providerModels = models.filter(m => m.providerId === providerId && !m.isImageModel);
    if (providerModels.length > 0) {
      return providerModels[0].id;
    }
    // 레거시 폴백
    const config = PROVIDER_CONFIGS[providerId];
    return config?.defaultModel || '';
  }

  /**
   * Check prerequisites before generation
   */
  private checkPrerequisites(): boolean {
    if (!this.settings.googleApiKey) {
      new Notice(t().notice.configureGoogleApiKey);
      return false;
    }

    // Drive 업로드 사용 시에만 연결 필수 체크
    if (this.settings.useDriveUpload && !this.isGoogleDriveConnected()) {
      new Notice(t().notice.connectDriveFirst);
      return false;
    }

    const apiKey = this.getApiKeyForProvider();
    if (!apiKey) {
      new Notice(t().notice.configureApiKey(this.settings.selectedProvider));
      return false;
    }

    return true;
  }

  /**
   * Show quick options modal
   */
  private showQuickOptionsModal(hasSelection: boolean): Promise<QuickOptionsResult> {
    return new Promise((resolve) => {
      const modal = new QuickOptionsModal(
        this.app,
        this.settings,
        hasSelection,
        (result) => resolve(result)
      );
      modal.open();
    });
  }

  /**
   * Show preview modal
   */
  private showPreviewModal(prompt: string): Promise<PreviewModalResult> {
    return new Promise((resolve) => {
      const modal = new PreviewModal(
        this.app,
        prompt,
        (result) => resolve(result)
      );
      modal.open();
    });
  }

  /**
   * Generate filename for the poster
   */
  private generateFileName(noteBasename: string): string {
    const timestamp = Date.now().toString(36);
    const sanitized = noteBasename
      .replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    return `${sanitized}-poster-${timestamp}.png`;
  }

  /**
   * Execute with retry on transient failures
   */
  private async executeWithRetry<T>(
    fn: () => Promise<T>,
    maxRetries: number
  ): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        // Check if error is retryable
        const isRetryable = error instanceof GenerationErrorClass && error.retryable;

        if (attempt < maxRetries && isRetryable) {
          const delay = Math.pow(2, attempt) * 1000; // Exponential backoff
          await this.sleep(delay);
        } else {
          throw error;
        }
      }
    }

    throw lastError || new Error('Unknown error during retry');
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Generate interactive HTML slide or PPTX presentation
   */
  private async generateSlide(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice(t().notice.generationInProgress);
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice(t().notice.noActiveNote);
      return;
    }

    // Check API key for slide provider
    const slideProvider = this.settings.slideProvider || this.settings.selectedProvider;
    const apiKey = this.getApiKeyForProvider(slideProvider);
    if (!apiKey) {
      const slideProviderName = (this.settings.providers || []).find(p => p.id === slideProvider)?.name || slideProvider;
      new Notice(`Please configure ${slideProviderName} API key in settings for slide generation`);
      return;
    }

    // Check if there's a selection
    const hasSelection = editor.somethingSelected();

    // Show slide options modal
    const options = await this.showSlideOptionsModal(hasSelection);
    if (!options.confirmed) {
      return;
    }

    // Set max output tokens for slide service
    this.slideService.setMaxOutputTokens(this.settings.slideMaxOutputTokens || 65536);

    // Branch based on output format
    if (options.outputFormat === 'pptx') {
      await this.generatePptxSlide(editor, view, options);
    } else {
      await this.generateHtmlSlide(editor, view, options);
    }
  }

  /**
   * Generate HTML slide
   */
  private async generateHtmlSlide(editor: Editor, view: MarkdownView, options: SlideOptionsResult) {
    const noteFile = view.file;
    if (!noteFile) return;

    const slideProvider = this.settings.slideProvider || this.settings.defaultProviderId || this.settings.selectedProvider;
    const slideModel = this.settings.slideModel || this.getDefaultModelForProvider(slideProvider);
    const apiKey = this.getApiKeyForProvider(slideProvider);
    const providerInfo = this.getProviderInfo(slideProvider);
    this.isGenerating = true;
    let progressModal: ProgressModal | null = null;

    try {
      if (this.settings.showProgressModal) {
        progressModal = new ProgressModal(this.app, () => {
          this.isGenerating = false;
        }, 'slide', false, options.uploadDestination === 'github');
        progressModal.open();
      }

      // Get content
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: t().progress.analyzing
      });

      let content: string;
      if (options.inputSource === 'custom') {
        content = options.customText;
      } else if (options.inputSource === 'selection') {
        // This function is called with editor context, need to get selection
        content = editor.getSelection() || await this.app.vault.read(noteFile);
      } else {
        content = await this.app.vault.read(noteFile);
      }

      if (!content.trim()) {
        throw new GenerationErrorClass('NO_CONTENT', 'No content to generate from');
      }

      // Generate slide
      progressModal?.updateProgress({
        step: 'generating-slide',
        progress: 20,
        message: 'HTML 슬라이드 생성 중...',
        details: `${(this.settings.providers || []).find(p => p.id === slideProvider)?.name || slideProvider} (${slideModel})`
      });

      const systemPrompt = options.selectedPrompt;
      const result = await this.slideService.generateSlide(
        content,
        slideProvider,
        slideModel,
        apiKey,
        systemPrompt,
        providerInfo
      );

      // Save slide
      progressModal?.updateProgress({
        step: 'saving',
        progress: 60,
        message: t().progress.saving
      });

      const slidePath = await this.fileService.saveSlide(
        result.htmlContent,
        noteFile,
        this.settings.slidesRootPath || 'StarCloud/Slide',
        result.title
      );

      // Git commit and push (uploadDestination이 'github'일 때만)
      let githubPagesUrl: string | undefined;

      if (options.uploadDestination === 'github' && this.settings.gitEnabled) {
        progressModal?.updateProgress({
          step: 'uploading',
          progress: 75,
          message: t().progress.uploading
        });

        const absolutePath = this.fileService.getAbsolutePath(slidePath);
        const gitService = new GitService({
          repoPath: this.settings.gitRepoPath,
          branch: this.settings.gitBranch,
          token: this.settings.githubToken,
          pagesUrl: this.settings.githubPagesUrl
        });

        const gitResult = await gitService.commitAndPush(
          absolutePath,
          `Add slide: ${result.title}`
        );

        if (gitResult.success && gitResult.url) {
          githubPagesUrl = gitResult.url;
        } else {
          new Notice(`Git: ${gitResult.message}`);
        }
      }

      // Embed in note
      progressModal?.updateProgress({
        step: 'embedding',
        progress: 95,
        message: t().progress.embedding
      });

      await this.fileService.embedSlideInNote(noteFile, slidePath, githubPagesUrl, editor);

      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: t().progress.slideComplete
      });

      if (githubPagesUrl) {
        new Notice(`슬라이드가 생성되었습니다!\n${githubPagesUrl}`);
      } else {
        new Notice(t().notice.slideCreated);
      }

    } catch (error) {
      console.error('Slide generation error:', error);
      const message = error instanceof Error ? error.message : String(error);

      if (progressModal) {
        progressModal.showError(message);
      } else {
        new Notice(`Generation failed: ${message}`);
      }
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Generate PPTX presentation and upload to Google Drive
   */
  private async generatePptxSlide(editor: Editor, view: MarkdownView, options: SlideOptionsResult) {
    const noteFile = view.file;
    if (!noteFile) return;

    const useDrive = options.uploadDestination === 'drive';

    // Drive 업로드를 선택한 경우에만 연결 체크
    if (useDrive && (!this.driveUploadService || !this.driveUploadService.isConnected())) {
      new Notice(t().notice.connectDriveFirst);
      return;
    }

    const slideProvider = this.settings.slideProvider || this.settings.defaultProviderId || this.settings.selectedProvider;
    const slideModel = this.settings.slideModel || this.getDefaultModelForProvider(slideProvider);
    const apiKey = this.getApiKeyForProvider(slideProvider);
    const providerInfo = this.getProviderInfo(slideProvider);
    this.isGenerating = true;
    let progressModal: ProgressModal | null = null;

    try {
      if (this.settings.showProgressModal) {
        progressModal = new ProgressModal(this.app, () => {
          this.isGenerating = false;
        }, 'pptx', useDrive);
        progressModal.open();
      }

      // Get content
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: t().progress.analyzing
      });

      let content: string;
      if (options.inputSource === 'custom') {
        content = options.customText;
      } else if (options.inputSource === 'selection') {
        content = editor.getSelection() || await this.app.vault.read(noteFile);
      } else {
        content = await this.app.vault.read(noteFile);
      }

      if (!content.trim()) {
        throw new GenerationErrorClass('NO_CONTENT', 'No content to generate from');
      }

      // Generate PPTX JSON data
      progressModal?.updateProgress({
        step: 'generating-slide',
        progress: 20,
        message: t().progress.generatingSlide,
        details: `${(this.settings.providers || []).find(p => p.id === slideProvider)?.name || slideProvider} (${slideModel})`
      });

      const systemPrompt = options.selectedPrompt;
      const isFlexibleMode = options.pptxStyle === 'flexible';

      // Generate PPTX file based on mode
      progressModal?.updateProgress({
        step: 'saving',
        progress: 50,
        message: t().progress.generatingSlide
      });

      let pptxResult;

      if (isFlexibleMode) {
        // Flexible mode: element-based layout
        const flexibleData = await this.slideService.generateFlexiblePptxSlideData(
          content,
          slideProvider,
          slideModel,
          apiKey,
          systemPrompt,
          providerInfo
        );
        pptxResult = await this.pptxService.generateFlexiblePptx(flexibleData);
      } else {
        // Standard mode: fixed slide types
        const presentationData = await this.slideService.generatePptxSlideData(
          content,
          slideProvider,
          slideModel,
          apiKey,
          systemPrompt,
          providerInfo
        );
        pptxResult = await this.pptxService.generatePptx(presentationData);
      }

      // 항상 로컬에 먼저 저장
      progressModal?.updateProgress({
        step: 'saving',
        progress: 60,
        message: t().progress.saving
      });

      const fileName = this.sanitizePptxFileName(pptxResult.title) + '.pptx';
      const slidePath = `${this.settings.slidesRootPath || 'StarCloud/Slide'}/${fileName}`;

      const folderPath = slidePath.substring(0, slidePath.lastIndexOf('/'));
      if (!this.app.vault.getAbstractFileByPath(folderPath)) {
        await this.app.vault.createFolder(folderPath);
      }
      await this.app.vault.createBinary(slidePath, pptxResult.pptxBuffer);

      // Drive 업로드 (선택 시)
      let driveEmbedCode: string | undefined;
      if (useDrive) {
        progressModal?.updateProgress({
          step: 'uploading',
          progress: 75,
          message: t().progress.uploading
        });

        try {
          const mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';
          const driveSlideFolder = `${this.settings.driveFolder || 'StarCloud'}/Slide`;
          const uploadResult = await this.driveUploadService!.uploadBuffer(
            pptxResult.pptxBuffer,
            mimeType,
            fileName,
            driveSlideFolder,
            this.settings.organizeFoldersByDate,
            (progress) => {
              progressModal?.updateProgress({
                step: 'uploading',
                progress: 75 + (progress.progress * 0.15),
                message: progress.message
              });
            }
          );
          driveEmbedCode = this.generatePptxEmbed(uploadResult, pptxResult.title);
        } catch (uploadError) {
          console.error('Drive upload failed (local file saved):', uploadError);
          const msg = uploadError instanceof Error ? uploadError.message : String(uploadError);
          new Notice(`Drive 업로드 실패 (로컬 파일은 저장됨): ${msg}`);
        }
      }

      // 노트에 삽입
      progressModal?.updateProgress({
        step: 'embedding',
        progress: 95,
        message: t().progress.embedding
      });

      const cursor = editor.getCursor();
      if (driveEmbedCode) {
        editor.replaceRange(driveEmbedCode + '\n\n', cursor);
      } else {
        editor.replaceRange(`![[${slidePath}]]\n\n`, cursor);
      }

      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: t().progress.slideComplete
      });

      new Notice(`PPTX 프레젠테이션이 생성되었습니다!\n${pptxResult.slideCount}장 슬라이드`);

    } catch (error) {
      console.error('PPTX generation error:', error);
      const message = error instanceof Error ? error.message : String(error);

      if (progressModal) {
        progressModal.showError(message);
      } else {
        new Notice(`Generation failed: ${message}`);
      }
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Sanitize filename for PPTX
   */
  private sanitizePptxFileName(title: string): string {
    return title
      .replace(/[<>:"/\\|?*]/g, '') // Remove invalid characters
      .replace(/\s+/g, '_')         // Replace spaces with underscores
      .substring(0, 50)             // Limit length
      || 'presentation';
  }

  /**
   * Generate embed code for PPTX uploaded to Google Drive
   */
  private generatePptxEmbed(uploadResult: DriveUploadResult, title: string): string {
    // Google Drive preview URL for Office documents
    const previewUrl = `https://drive.google.com/file/d/${uploadResult.fileId}/preview`;

    return `
<!-- PPTX Presentation: ${title} -->
<iframe
  src="${previewUrl}"
  width="100%"
  height="480"
  frameborder="0"
  allowfullscreen="true">
</iframe>

[Download PPTX](${uploadResult.webViewLink})
`.trim();
  }

  private showSlideOptionsModal(hasSelection: boolean): Promise<SlideOptionsResult> {
    return new Promise((resolve) => {
      const modal = new SlideOptionsModal(
        this.app,
        this.settings,
        hasSelection,
        (result) => resolve(result)
      );
      modal.open();
    });
  }

  /**
   * Upload file to Google Drive and embed in note
   */
  private async uploadFileToDrive(editor: Editor, view: MarkdownView) {
    // Check if Drive is connected
    if (!this.driveUploadService || !this.driveUploadService.isConnected()) {
      new Notice(t().notice.connectDriveFirst);
      return;
    }

    // Open upload modal (use Data subfolder for general uploads)
    const driveDataFolder = `${this.settings.driveFolder || 'StarCloud'}/Data`;
    const modal = new DriveUploadModal(
      this.app,
      this.driveUploadService,
      driveDataFolder,
      this.settings.organizeFoldersByDate !== false,
      this.settings.showTitleInEmbed !== false,
      (result: DriveUploadModalResult) => {
        // Insert embed code at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(result.embedCode + '\n\n', cursor);

        new Notice(t().notice.posterCreated);
      }
    );
    modal.open();
  }

  /**
   * Generate speech audio from note content
   */
  private async generateSpeech(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice(t().notice.generationInProgress);
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice(t().notice.noActiveNote);
      return;
    }

    // Check TTS prerequisites
    if (!this.checkTTSPrerequisites()) {
      return;
    }

    // Show speech options modal
    const options = await this.showSpeechOptionsModal();
    if (!options.confirmed) {
      return;
    }

    // Start speech generation
    await this.executeSpeechGeneration(editor, noteFile, options);
  }

  /**
   * Check TTS prerequisites
   */
  private checkTTSPrerequisites(): boolean {
    // Check script generation provider API key
    const scriptProvider = this.settings.speechScriptProvider || this.settings.selectedProvider;
    const scriptApiKey = this.getApiKeyForProvider(scriptProvider);
    if (!scriptApiKey) {
      const scriptProviderName = (this.settings.providers || []).find(p => p.id === scriptProvider)?.name || scriptProvider;
      new Notice(`스크립트 생성을 위해 ${scriptProviderName} API 키를 설정해주세요`);
      return false;
    }

    // Check TTS provider API key
    const ttsProvider = this.settings.ttsProvider;
    if (ttsProvider === 'gemini') {
      if (!this.settings.googleApiKey) {
        new Notice(t().notice.configureGoogleApiKey);
        return false;
      }
    } else if (ttsProvider === 'elevenlabs') {
      if (!this.settings.elevenlabsApiKey) {
        new Notice(t().notice.configureApiKey('ElevenLabs'));
        return false;
      }
    }

    return true;
  }

  /**
   * Execute speech generation flow
   */
  private async executeSpeechGeneration(
    editor: Editor,
    noteFile: TFile,
    options: SpeechOptionsResult
  ) {
    this.isGenerating = true;
    let progressModal: ProgressModal | null = null;

    try {
      // Show progress modal
      if (this.settings.showProgressModal) {
        progressModal = new ProgressModal(this.app, () => {
          this.isGenerating = false;
        }, 'speech', !!options.uploadToDrive);
        progressModal.open();
      }

      // Step 1: Get content
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: t().progress.analyzing
      });

      const content = await this.getSpeechContent(editor, noteFile, options);
      if (!content.trim()) {
        throw new GenerationErrorClass('NO_CONTENT', '생성할 콘텐츠가 없습니다');
      }

      // Step 2: Generate speech script
      progressModal?.updateProgress({
        step: 'generating-speech-script',
        progress: 15,
        message: t().progress.generatingScript,
        details: `${options.template} 템플릿으로 ${options.targetDuration}분 분량 생성`
      });

      const scriptProvider = this.settings.speechScriptProvider || this.settings.selectedProvider;
      const scriptModel = this.settings.speechScriptModel || PROVIDER_CONFIGS[scriptProvider].defaultModel;
      const scriptApiKey = this.getApiKeyForProvider(scriptProvider);

      let scriptResult = await this.speechPromptService.generateSpeechScript(
        content,
        options.template,
        options.targetDuration,
        options.language,
        scriptProvider,
        scriptModel,
        scriptApiKey,
        this.getProviderInfo(scriptProvider)
      );

      // Step 3: Preview (optional)
      if (this.settings.showSpeechPreview) {
        progressModal?.updateProgress({
          step: 'preview',
          progress: 35,
          message: t().progress.previewingPrompt
        });

        const previewResult = await this.showSpeechPreviewModal(
          scriptResult.script,
          options.template,
          scriptResult.estimatedDuration,
          scriptResult.wordCount
        );

        if (!previewResult.confirmed) {
          this.isGenerating = false;
          progressModal?.close();
          return;
        }

        if (previewResult.regenerate) {
          // Regenerate script
          progressModal?.updateProgress({
            step: 'generating-speech-script',
            progress: 15,
            message: t().progress.regeneratingPrompt
          });

          scriptResult = await this.speechPromptService.generateSpeechScript(
            content,
            options.template,
            options.targetDuration,
            options.language,
            scriptProvider,
            scriptModel,
            scriptApiKey
          );
        } else {
          // Use edited script
          scriptResult.script = previewResult.script;
        }
      }

      // Step 4: Generate audio
      progressModal?.updateProgress({
        step: 'generating-audio',
        progress: 45,
        message: t().progress.generatingAudio,
        details: `${TTS_PROVIDER_CONFIGS[options.ttsProvider].name} 사용 중`
      });

      const ttsApiKey = options.ttsProvider === 'gemini'
        ? this.settings.googleApiKey
        : this.settings.elevenlabsApiKey;

      let audioResult;
      const isDialogue = options.template === 'notebooklm-dialogue';

      if (isDialogue && options.dialogueVoices) {
        // Generate dialogue audio using native multi-speaker TTS
        audioResult = await this.ttsService.generateDialogueAudio(
          scriptResult.script,
          options.ttsProvider,
          options.ttsModel,
          ttsApiKey,
          options.dialogueVoices,
          this.settings.audioOutputFormat
        );
      } else {
        // Generate single voice audio
        audioResult = await this.ttsService.generateAudio(
          scriptResult.script,
          options.ttsProvider,
          options.ttsModel,
          ttsApiKey,
          options.voice,
          this.settings.audioOutputFormat
        );
      }

      // Step 5: Process audio (optional additional processing)
      progressModal?.updateProgress({
        step: 'processing-audio',
        progress: 65,
        message: t().progress.processingAudio
      });

      // Step 6: Save audio locally
      progressModal?.updateProgress({
        step: 'saving',
        progress: 75,
        message: t().progress.saving
      });

      const audioPath = await this.audioFileService.saveAudio(
        audioResult.audioData,
        audioResult.mimeType,
        noteFile,
        this.settings.audioVaultFolder || 'StarCloud/Audio'
      );

      // Step 7: Upload to Drive (optional)
      let driveResult: DriveUploadResult | null = null;

      if (options.uploadToDrive && this.driveUploadService?.isConnected()) {
        progressModal?.updateProgress({
          step: 'uploading',
          progress: 85,
          message: t().progress.uploading
        });

        const fileName = this.generateAudioFileName(noteFile.basename, options.template);

        // Use Audio subfolder for audio files
        const driveAudioFolder = `${this.settings.driveFolder || 'StarCloud'}/Audio`;
        driveResult = await this.driveUploadService.uploadBuffer(
          audioResult.audioData,
          audioResult.mimeType,
          fileName,
          driveAudioFolder,
          this.settings.organizeFoldersByDate,
          (progress) => {
            progressModal?.updateProgress({
              step: 'uploading',
              progress: 85 + (progress.progress * 0.1),
              message: progress.message
            });
          }
        );
      }

      // Step 8: Embed in note
      progressModal?.updateProgress({
        step: 'embedding',
        progress: 95,
        message: t().progress.embedding
      });

      if (driveResult) {
        // Embed Drive link
        await this.audioFileService.embedDriveAudioInNote(
          noteFile,
          driveResult.webViewLink,
          driveResult.fileId,
          `🎤 ${noteFile.basename} - Speech`,
          editor
        );
      } else {
        // Embed local file
        await this.audioFileService.embedAudioInNote(
          noteFile,
          audioPath,
          editor
        );
      }

      // Complete!
      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: t().progress.speechComplete
      });

      const durationStr = this.audioFileService.formatDuration(audioResult.duration);
      new Notice(`음성이 생성되었습니다! (${durationStr})`);

    } catch (error) {
      console.error('Speech generation error:', error);
      const message = error instanceof Error ? error.message : String(error);

      if (progressModal) {
        progressModal.showError(message);
      } else {
        new Notice(`음성 생성 실패: ${message}`);
      }
    } finally {
      this.isGenerating = false;
    }
  }

  /**
   * Get content for speech generation based on input source
   */
  private async getSpeechContent(
    editor: Editor,
    noteFile: TFile,
    options: SpeechOptionsResult
  ): Promise<string> {
    if (options.inputSource === 'custom' && options.customInputText) {
      return options.customInputText;
    }

    if (options.inputSource === 'clipboard') {
      try {
        const clipboardText = await navigator.clipboard.readText();
        if (clipboardText && clipboardText.trim()) {
          return clipboardText;
        }
        throw new Error('클립보드가 비어있습니다');
      } catch (error) {
        throw new GenerationErrorClass('NO_CONTENT', '클립보드 내용을 읽을 수 없습니다');
      }
    }

    if (options.inputSource === 'selection') {
      const selection = this.embedService.getSelectedText(editor);
      if (selection) {
        return selection;
      }
    }

    // Full note content
    return await this.app.vault.read(noteFile);
  }

  /**
   * Generate filename for audio file
   */
  private generateAudioFileName(noteBasename: string, template: string): string {
    const timestamp = Date.now().toString(36);
    const sanitized = noteBasename
      .replace(/[^a-zA-Z0-9가-힣ㄱ-ㅎㅏ-ㅣ]/g, '-')
      .replace(/-+/g, '-')
      .substring(0, 30);
    const extension = this.settings.audioOutputFormat === 'mp3' ? 'mp3' : 'wav';
    return `${sanitized}-${template}-${timestamp}.${extension}`;
  }

  /**
   * Show speech options modal
   */
  private showSpeechOptionsModal(): Promise<SpeechOptionsResult> {
    return new Promise((resolve) => {
      const modal = new SpeechOptionsModal(
        this.app,
        this.settings.defaultInputSource || 'fullNote',
        this.settings.defaultSpeechTemplate || 'key-summary',
        this.settings.preferredLanguage || 'ko',
        this.settings.ttsProvider || 'gemini',
        this.settings.ttsModel || TTS_PROVIDER_CONFIGS['gemini'].defaultModel,
        this.settings.defaultTtsVoice || 'Kore',
        this.settings.defaultTtsVoiceHostA || 'Kore',
        this.settings.defaultTtsVoiceHostB || 'Charon',
        this.settings.targetAudioDuration || 5,
        (result) => resolve(result)
      );
      modal.open();
    });
  }

  /**
   * Show speech preview modal
   */
  private showSpeechPreviewModal(
    script: string,
    template: string,
    estimatedDuration: number,
    wordCount: number
  ): Promise<SpeechPreviewResult> {
    return new Promise((resolve) => {
      const modal = new SpeechPreviewModal(
        this.app,
        script,
        template as any,
        estimatedDuration,
        wordCount,
        (result) => resolve(result)
      );
      modal.open();
    });
  }
}
