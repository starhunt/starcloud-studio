import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import {
  NanoBananaCloudSettings,
  QuickOptionsResult,
  PreviewModalResult,
  SlideOptionsResult,
  OAuthTokens,
  InputSource,
  EmbedPosition,
  GenerationErrorClass
} from './types';
import { DEFAULT_SETTINGS, BUILTIN_SLIDE_PROMPTS } from './settingsData';
import { NanoBananaCloudSettingTab } from './settings';
import { PromptService } from './services/promptService';
import { ImageService } from './services/imageService';
import { SlideService } from './services/slideService';
import { FileService } from './services/fileService';
import { GoogleOAuthFlow } from './services/googleOAuthFlow';
import { DriveUploadService } from './services/driveUploadService';
import { EmbedService } from './services/embedService';
import { QuickOptionsModal } from './modals/quickOptionsModal';
import { PreviewModal } from './modals/previewModal';
import { ProgressModal, ProgressMode } from './modals/progressModal';
import { SlideOptionsModal } from './modals/slideOptionsModal';

export default class NanoBananaCloudPlugin extends Plugin {
  settings: NanoBananaCloudSettings;

  // Services
  private promptService: PromptService;
  private imageService: ImageService;
  private slideService: SlideService;
  private fileService: FileService;
  private driveUploadService: DriveUploadService | null = null;
  private embedService: EmbedService;

  // State
  private isGenerating = false;

  async onload() {
    await this.loadSettings();

    // Initialize services
    this.promptService = new PromptService();
    this.imageService = new ImageService();
    this.slideService = new SlideService();
    this.fileService = new FileService(this.app);
    this.embedService = new EmbedService(this.app);

    // Initialize Drive service if credentials exist
    if (this.settings.googleClientId && this.settings.googleClientSecret) {
      this.initDriveService();
    }

    // Add settings tab
    this.addSettingTab(new NanoBananaCloudSettingTab(this.app, this));

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

    // Add ribbon icon
    this.addRibbonIcon('image', 'Generate Knowledge Poster', () => {
      const view = this.app.workspace.getActiveViewOfType(MarkdownView);
      if (view && view.editor) {
        void this.generatePoster(view.editor, view);
      } else {
        new Notice('Please open a note first');
      }
    });

    console.log('NanoBanana Cloud plugin loaded');
  }

  onunload() {
    console.log('NanoBanana Cloud plugin unloaded');
  }

  async loadSettings() {
    this.settings = Object.assign({}, DEFAULT_SETTINGS, await this.loadData());
  }

  async saveSettings() {
    await this.saveData(this.settings);

    // Reinitialize Drive service when settings change
    if (this.settings.googleClientId && this.settings.googleClientSecret) {
      this.initDriveService();
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
      new Notice('Please configure Google OAuth credentials in settings first');
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

      new Notice('Successfully connected to Google Drive!');
      return true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      new Notice(`Failed to connect: ${message}`);
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

    new Notice('Disconnected from Google Drive');
  }

  /**
   * Main poster generation flow
   */
  private async generatePoster(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice('Generation already in progress');
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice('No active note');
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
      new Notice('Generation already in progress');
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice('No active note');
      return;
    }

    const hasSelection = this.embedService.hasSelection(editor);
    if (!hasSelection) {
      new Notice('Please select some text first');
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
        });
        progressModal.open();
      }

      // Step 1: Get content based on input source
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: '노트 내용 분석 중...'
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
        message: 'AI 프롬프트 생성 중...',
        details: `Using ${this.settings.selectedProvider}`
      });

      let promptResult = await this.promptService.generatePrompt(
        content,
        this.settings.selectedProvider,
        this.settings.promptModel,
        this.getApiKeyForProvider(),
        options.imageStyle,
        options.imageStyle === 'infographic' ? options.infographicSubStyle : undefined
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
          message: '프롬프트 확인 중...'
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
            message: '프롬프트 재생성 중...'
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
        message: '이미지 생성 중...',
        details: 'This may take a minute...'
      });

      const cartoonCuts = options.cartoonCuts === 'custom'
        ? options.customCartoonCuts
        : parseInt(options.cartoonCuts);

      const imageResult = await this.executeWithRetry(
        () => this.imageService.generateImage(
          promptResult.prompt,
          this.settings.googleApiKey,
          this.settings.imageModel,
          options.imageStyle,
          this.settings.preferredLanguage,
          options.imageSize,
          cartoonCuts,
          options.infographicSubStyle
        ),
        this.settings.autoRetryCount
      );

      // Step 5: Upload to Google Drive
      progressModal?.updateProgress({
        step: 'uploading',
        progress: 70,
        message: 'Google Drive에 업로드 중...'
      });

      if (!this.driveUploadService) {
        throw new GenerationErrorClass('OAUTH_ERROR', 'Google Drive not connected');
      }

      const fileName = this.generateFileName(noteFile.basename);

      const uploadResult = await this.driveUploadService.uploadImage(
        imageResult.imageData,
        imageResult.mimeType,
        fileName,
        this.settings.driveFolder,
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
        message: '노트에 삽입 중...'
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

      // Complete!
      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: '포스터 생성 완료!'
      });

      new Notice('Knowledge Poster created successfully!');

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
  private getApiKeyForProvider(): string {
    const keyMap: Record<string, string> = {
      openai: this.settings.openaiApiKey,
      google: this.settings.googleApiKey,
      anthropic: this.settings.anthropicApiKey,
      xai: this.settings.xaiApiKey,
      glm: this.settings.glmApiKey
    };
    return keyMap[this.settings.selectedProvider] || '';
  }

  /**
   * Check prerequisites before generation
   */
  private checkPrerequisites(): boolean {
    if (!this.settings.googleApiKey) {
      new Notice('Please configure Google API key in settings');
      return false;
    }

    if (!this.isGoogleDriveConnected()) {
      new Notice('Please connect to Google Drive in settings');
      return false;
    }

    const apiKey = this.getApiKeyForProvider();
    if (!apiKey) {
      new Notice(`Please configure ${this.settings.selectedProvider} API key in settings`);
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
          console.log(`Retry ${attempt + 1}/${maxRetries} after ${delay}ms...`);
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
   * Generate interactive HTML slide
   */
  private async generateSlide(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice('Generation already in progress');
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice('No active note');
      return;
    }

    // Check API key
    const apiKey = this.getApiKeyForProvider();
    if (!apiKey) {
      new Notice(`Please configure ${this.settings.selectedProvider} API key in settings`);
      return;
    }

    // Show slide options modal
    const options = await this.showSlideOptionsModal();
    if (!options.confirmed) {
      return;
    }

    this.isGenerating = true;
    let progressModal: ProgressModal | null = null;

    try {
      if (this.settings.showProgressModal) {
        progressModal = new ProgressModal(this.app, () => {
          this.isGenerating = false;
        }, 'slide');
        progressModal.open();
      }

      // Get content
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: '콘텐츠 분석 중...'
      });

      let content: string;
      if (options.inputSource === 'custom-text') {
        content = options.customText;
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
        details: `${this.settings.selectedProvider} 사용 중 (긴 콘텐츠는 수 분 소요될 수 있습니다)`
      });

      const systemPrompt = options.selectedPromptConfig.prompt;
      const result = await this.slideService.generateSlide(
        content,
        this.settings.selectedProvider,
        this.settings.promptModel,
        apiKey,
        systemPrompt
      );

      // Save slide
      progressModal?.updateProgress({
        step: 'saving',
        progress: 80,
        message: '슬라이드 저장 중...'
      });

      const slidePath = await this.fileService.saveSlide(
        result.htmlContent,
        noteFile,
        this.settings.slidesRootPath || '999-Slides',
        result.title
      );

      // Embed in note
      progressModal?.updateProgress({
        step: 'embedding',
        progress: 95,
        message: '노트에 삽입 중...'
      });

      await this.fileService.embedSlideInNote(noteFile, slidePath);

      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: '슬라이드 생성 완료!'
      });

      new Notice('인터랙티브 슬라이드가 생성되었습니다!');

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

  private showSlideOptionsModal(): Promise<SlideOptionsResult> {
    return new Promise((resolve) => {
      const modal = new SlideOptionsModal(
        this.app,
        this.settings.defaultSlidePromptType || 'notebooklm-summary',
        this.settings.customSlidePrompts || [],
        (result) => resolve(result),
        this.settings.preferredLanguage
      );
      modal.open();
    });
  }
}
