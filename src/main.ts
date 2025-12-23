import { Editor, MarkdownView, Notice, Plugin, TFile } from 'obsidian';
import {
  NanoBananaCloudSettings,
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
  DialogueSegment
} from './types';
import { DEFAULT_SETTINGS, BUILTIN_SLIDE_PROMPTS } from './settingsData';
import { NanoBananaCloudSettingTab } from './settings';
import { PromptService } from './services/promptService';
import { ImageService } from './services/imageService';
import { SlideService } from './services/slideService';
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

export default class NanoBananaCloudPlugin extends Plugin {
  settings: NanoBananaCloudSettings;

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
  private getApiKeyForProvider(provider?: AIProvider): string {
    const targetProvider = provider || this.settings.selectedProvider;
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
   * Generate interactive HTML slide or PPTX presentation
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

    // Check API key for slide provider
    const slideProvider = this.settings.slideProvider || this.settings.selectedProvider;
    const apiKey = this.getApiKeyForProvider(slideProvider);
    if (!apiKey) {
      new Notice(`Please configure ${slideProvider} API key in settings for slide generation`);
      return;
    }

    // Show slide options modal
    const options = await this.showSlideOptionsModal();
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

    const slideProvider = this.settings.slideProvider || this.settings.selectedProvider;
    const slideModel = this.settings.slideModel || PROVIDER_CONFIGS[slideProvider].defaultModel;
    const apiKey = this.getApiKeyForProvider(slideProvider);
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
        details: `${slideProvider} (${slideModel}) 사용 중 (긴 콘텐츠는 수 분 소요될 수 있습니다)`
      });

      const systemPrompt = options.selectedPromptConfig.prompt;
      const result = await this.slideService.generateSlide(
        content,
        slideProvider,
        slideModel,
        apiKey,
        systemPrompt
      );

      // Save slide
      progressModal?.updateProgress({
        step: 'saving',
        progress: 60,
        message: '슬라이드 저장 중...'
      });

      const slidePath = await this.fileService.saveSlide(
        result.htmlContent,
        noteFile,
        this.settings.slidesRootPath || '999-Slides',
        result.title
      );

      // Git commit and push if enabled
      let githubPagesUrl: string | undefined;

      if (this.settings.gitEnabled && this.settings.autoCommitPush) {
        progressModal?.updateProgress({
          step: 'uploading',
          progress: 75,
          message: 'GitHub에 커밋 & 푸시 중...'
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
          console.log('Slide pushed to GitHub Pages:', githubPagesUrl);
        } else {
          console.warn('Git push warning:', gitResult.message);
          new Notice(`Git: ${gitResult.message}`);
        }
      }

      // Embed in note
      progressModal?.updateProgress({
        step: 'embedding',
        progress: 95,
        message: '노트에 삽입 중...'
      });

      await this.fileService.embedSlideInNote(noteFile, slidePath, githubPagesUrl, editor);

      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: '슬라이드 생성 완료!'
      });

      if (githubPagesUrl) {
        new Notice(`슬라이드가 생성되었습니다!\n${githubPagesUrl}`);
      } else {
        new Notice('인터랙티브 슬라이드가 생성되었습니다!');
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

    // Check if Drive is connected for PPTX upload
    if (!this.driveUploadService || !this.driveUploadService.isConnected()) {
      new Notice('PPTX 업로드를 위해 Google Drive에 먼저 연결해주세요.');
      return;
    }

    const slideProvider = this.settings.slideProvider || this.settings.selectedProvider;
    const slideModel = this.settings.slideModel || PROVIDER_CONFIGS[slideProvider].defaultModel;
    const apiKey = this.getApiKeyForProvider(slideProvider);
    this.isGenerating = true;
    let progressModal: ProgressModal | null = null;

    try {
      if (this.settings.showProgressModal) {
        progressModal = new ProgressModal(this.app, () => {
          this.isGenerating = false;
        }, 'pptx');
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

      // Generate PPTX JSON data
      progressModal?.updateProgress({
        step: 'generating-slide',
        progress: 20,
        message: 'PPTX 데이터 생성 중...',
        details: `${slideProvider} (${slideModel}) 사용 중 (긴 콘텐츠는 수 분 소요될 수 있습니다)`
      });

      const systemPrompt = options.selectedPromptConfig.prompt;
      const isFlexibleMode = options.pptxGenerationStyle === 'flexible';

      // Generate PPTX file based on mode
      progressModal?.updateProgress({
        step: 'saving',
        progress: 50,
        message: 'PPTX 파일 생성 중...'
      });

      let pptxResult;

      if (isFlexibleMode) {
        // Flexible mode: element-based layout
        const flexibleData = await this.slideService.generateFlexiblePptxSlideData(
          content,
          slideProvider,
          slideModel,
          apiKey,
          systemPrompt
        );
        pptxResult = await this.pptxService.generateFlexiblePptx(flexibleData);
      } else {
        // Standard mode: fixed slide types
        const presentationData = await this.slideService.generatePptxSlideData(
          content,
          slideProvider,
          slideModel,
          apiKey,
          systemPrompt
        );
        pptxResult = await this.pptxService.generatePptx(presentationData);
      }

      // Upload to Google Drive
      progressModal?.updateProgress({
        step: 'uploading',
        progress: 70,
        message: 'Google Drive에 업로드 중...'
      });

      const fileName = this.sanitizePptxFileName(pptxResult.title) + '.pptx';
      const mimeType = 'application/vnd.openxmlformats-officedocument.presentationml.presentation';

      const uploadResult = await this.driveUploadService.uploadBuffer(
        pptxResult.pptxBuffer,
        mimeType,
        fileName,
        this.settings.driveFolder || 'NanoBanana',
        this.settings.organizeFoldersByDate,
        (progress) => {
          progressModal?.updateProgress({
            step: 'uploading',
            progress: 70 + (progress.progress * 0.2),
            message: progress.message
          });
        }
      );

      // Embed in note
      progressModal?.updateProgress({
        step: 'embedding',
        progress: 95,
        message: '노트에 삽입 중...'
      });

      const embedCode = this.generatePptxEmbed(uploadResult, pptxResult.title);
      const cursor = editor.getCursor();
      editor.replaceRange(embedCode + '\n\n', cursor);

      progressModal?.updateProgress({
        step: 'complete',
        progress: 100,
        message: 'PPTX 생성 완료!'
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

  private showSlideOptionsModal(): Promise<SlideOptionsResult> {
    return new Promise((resolve) => {
      const modal = new SlideOptionsModal(
        this.app,
        this.settings.defaultSlidePromptType || 'notebooklm-summary',
        this.settings.customSlidePrompts || [],
        (result) => resolve(result),
        this.settings.preferredLanguage,
        this.settings.defaultSlideOutputFormat || 'html',
        this.settings.defaultPptxGenerationStyle || 'standard'
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
      new Notice('Please connect to Google Drive first (Command: Connect to Google Drive)');
      return;
    }

    // Open upload modal
    const modal = new DriveUploadModal(
      this.app,
      this.driveUploadService,
      this.settings.driveFolder || 'NanoBanana',
      this.settings.organizeFoldersByDate !== false,
      this.settings.showTitleInEmbed !== false,
      (result: DriveUploadModalResult) => {
        // Insert embed code at cursor position
        const cursor = editor.getCursor();
        editor.replaceRange(result.embedCode + '\n\n', cursor);

        new Notice('File uploaded and embedded successfully!');
      }
    );
    modal.open();
  }

  /**
   * Generate speech audio from note content
   */
  private async generateSpeech(editor: Editor, view: MarkdownView) {
    if (this.isGenerating) {
      new Notice('Generation already in progress');
      return;
    }

    const noteFile = view.file;
    if (!noteFile) {
      new Notice('No active note');
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
      new Notice(`스크립트 생성을 위해 ${scriptProvider} API 키를 설정해주세요`);
      return false;
    }

    // Check TTS provider API key
    const ttsProvider = this.settings.ttsProvider;
    if (ttsProvider === 'gemini') {
      if (!this.settings.googleApiKey) {
        new Notice('Gemini TTS를 위해 Google API 키를 설정해주세요');
        return false;
      }
    } else if (ttsProvider === 'elevenlabs') {
      if (!this.settings.elevenlabsApiKey) {
        new Notice('ElevenLabs API 키를 설정해주세요');
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
        }, 'speech');
        progressModal.open();
      }

      // Step 1: Get content
      progressModal?.updateProgress({
        step: 'analyzing',
        progress: 5,
        message: '콘텐츠 분석 중...'
      });

      const content = await this.getSpeechContent(editor, noteFile, options);
      if (!content.trim()) {
        throw new GenerationErrorClass('NO_CONTENT', '생성할 콘텐츠가 없습니다');
      }

      // Step 2: Generate speech script
      progressModal?.updateProgress({
        step: 'generating-speech-script',
        progress: 15,
        message: '스피치 스크립트 생성 중...',
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
        scriptApiKey
      );

      // Step 3: Preview (optional)
      if (this.settings.showSpeechPreview) {
        progressModal?.updateProgress({
          step: 'preview',
          progress: 35,
          message: '스크립트 확인 중...'
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
            message: '스크립트 재생성 중...'
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
        message: '음성 생성 중...',
        details: `${TTS_PROVIDER_CONFIGS[options.ttsProvider].name} 사용 중`
      });

      const ttsApiKey = options.ttsProvider === 'gemini'
        ? this.settings.googleApiKey
        : this.settings.elevenlabsApiKey;

      let audioResult;
      const isDialogue = options.template === 'notebooklm-dialogue';

      if (isDialogue && options.dialogueVoices) {
        // Parse dialogue segments
        const segments = this.speechPromptService.parseDialogueSegments(scriptResult.script);

        // Generate dialogue audio with alternating voices
        audioResult = await this.ttsService.generateDialogueAudio(
          segments,
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
        message: '오디오 처리 중...'
      });

      // Step 6: Save audio locally
      progressModal?.updateProgress({
        step: 'saving',
        progress: 75,
        message: '오디오 저장 중...'
      });

      const audioPath = await this.audioFileService.saveAudio(
        audioResult.audioData,
        audioResult.mimeType,
        noteFile,
        this.settings.audioVaultFolder || 'Audio/TTS'
      );

      // Step 7: Upload to Drive (optional)
      let driveResult: DriveUploadResult | null = null;

      if (options.uploadToDrive && this.driveUploadService?.isConnected()) {
        progressModal?.updateProgress({
          step: 'uploading',
          progress: 85,
          message: 'Google Drive에 업로드 중...'
        });

        const fileName = this.generateAudioFileName(noteFile.basename, options.template);

        driveResult = await this.driveUploadService.uploadBuffer(
          audioResult.audioData,
          audioResult.mimeType,
          fileName,
          this.settings.driveFolder || 'NanoBanana',
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
        message: '노트에 삽입 중...'
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
        message: '음성 생성 완료!'
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
