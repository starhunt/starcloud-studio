import { App, Modal, Setting } from 'obsidian';
import {
  SlideInputSource,
  SlideOptionsResult,
  SlideOutputFormat,
  HtmlSlideStyle,
  PptxSlideStyle,
  SlideUploadDestination,
  SlidePromptConfig,
  StarCloudStudioSettings
} from '../types';
import { BUILTIN_HTML_PROMPTS, BUILTIN_PPTX_PROMPTS } from '../settingsData';

export class SlideOptionsModal extends Modal {
  private result: SlideOptionsResult;
  private hasSelection: boolean;
  private settings: StarCloudStudioSettings;
  private onSubmit: (result: SlideOptionsResult) => void;
  private customInputTextArea: HTMLTextAreaElement | null = null;
  private promptPreviewArea: HTMLTextAreaElement | null = null;
  private styleSection: HTMLElement | null = null;
  private uploadSection: HTMLElement | null = null;

  constructor(
    app: App,
    settings: StarCloudStudioSettings,
    hasSelection: boolean,
    onSubmit: (result: SlideOptionsResult) => void
  ) {
    super(app);
    this.settings = settings;
    this.hasSelection = hasSelection;
    this.onSubmit = onSubmit;
    this.result = {
      confirmed: false,
      inputSource: hasSelection ? 'selection' : 'fullNote',
      customText: '',
      outputFormat: settings.defaultSlideOutputFormat,
      htmlStyle: settings.defaultHtmlSlideStyle,
      pptxStyle: settings.defaultPptxSlideStyle,
      selectedPrompt: this.getDefaultPrompt(settings.defaultSlideOutputFormat, settings.defaultHtmlSlideStyle, settings.defaultPptxSlideStyle),
      uploadDestination: settings.defaultSlideUploadDestination
    };
  }

  private getDefaultPrompt(format: SlideOutputFormat, htmlStyle: HtmlSlideStyle, pptxStyle: PptxSlideStyle): string {
    if (format === 'html') {
      if (htmlStyle === 'custom') return '';
      // Check for user override first, then fall back to built-in
      if (htmlStyle === 'vertical-scroll') {
        return this.settings.htmlVerticalScrollPromptOverride || BUILTIN_HTML_PROMPTS['vertical-scroll'].prompt;
      }
      // htmlStyle === 'presentation'
      return this.settings.htmlPresentationPromptOverride || BUILTIN_HTML_PROMPTS['presentation'].prompt;
    } else {
      if (pptxStyle === 'custom') return '';
      // Check for user override first, then fall back to built-in
      if (pptxStyle === 'standard') {
        return this.settings.pptxStandardPromptOverride || BUILTIN_PPTX_PROMPTS['standard'].prompt;
      }
      // pptxStyle === 'flexible'
      return this.settings.pptxFlexiblePromptOverride || BUILTIN_PPTX_PROMPTS['flexible'].prompt;
    }
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starcloud-slide-options-modal');

    contentEl.createEl('h2', { text: '슬라이드 생성 옵션' });

    // 1. Input Source Section
    this.renderInputSourceSection(contentEl);

    // 2. Custom Input Textarea (hidden by default)
    const customInputContainer = contentEl.createDiv({ cls: 'custom-input-container' });
    if (this.result.inputSource !== 'custom') {
      customInputContainer.style.display = 'none';
    }
    this.customInputTextArea = customInputContainer.createEl('textarea', {
      cls: 'custom-input-textarea',
      attr: { rows: '6', placeholder: '슬라이드로 만들 내용을 직접 입력하세요...' }
    });
    this.customInputTextArea.oninput = () => {
      if (this.customInputTextArea) {
        this.result.customText = this.customInputTextArea.value;
      }
    };

    // 3. Output Format Section
    this.renderOutputFormatSection(contentEl);

    // 4. Style Section (HTML or PPTX styles) - conditional
    this.styleSection = contentEl.createDiv({ cls: 'style-section' });
    this.renderStyleSection();

    // 5. Prompt Preview Section
    this.renderPromptPreviewSection(contentEl);

    // 6. Upload Options Section
    this.uploadSection = contentEl.createDiv({ cls: 'upload-section' });
    this.renderUploadOptionsSection();

    // 7. Action Buttons
    this.renderActionButtons(contentEl);

    // Add styles
    this.addStyles();
  }

  private renderInputSourceSection(contentEl: HTMLElement) {
    new Setting(contentEl).setName('입력 소스').setHeading();

    const container = contentEl.createDiv({ cls: 'input-source-container' });

    const sources: { key: SlideInputSource; icon: string; label: string; desc: string }[] = [
      { key: 'fullNote', icon: '📄', label: '전체 노트', desc: '노트 전체 내용' },
      { key: 'selection', icon: '✂️', label: '선택 영역', desc: '선택된 텍스트' },
      { key: 'custom', icon: '✏️', label: '직접 입력', desc: '텍스트 입력' }
    ];

    const buttons: Map<SlideInputSource, HTMLElement> = new Map();

    sources.forEach(source => {
      const isDisabled = source.key === 'selection' && !this.hasSelection;
      const btn = container.createDiv({
        cls: `source-btn ${this.result.inputSource === source.key ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`
      });
      btn.createEl('span', { text: source.icon, cls: 'source-icon' });
      const textDiv = btn.createDiv({ cls: 'source-text' });
      textDiv.createEl('span', { text: source.label, cls: 'source-label' });
      textDiv.createEl('span', { text: source.desc, cls: 'source-desc' });

      if (isDisabled) {
        textDiv.createEl('span', { text: '(선택 필요)', cls: 'source-hint' });
      }

      buttons.set(source.key, btn);

      if (!isDisabled) {
        btn.onclick = () => {
          this.result.inputSource = source.key;
          buttons.forEach((b, k) => {
            b.removeClass('active');
            if (k === source.key) b.addClass('active');
          });
          // Toggle custom input visibility
          const customContainer = this.contentEl.querySelector('.custom-input-container') as HTMLElement;
          if (customContainer) {
            customContainer.style.display = source.key === 'custom' ? 'block' : 'none';
            if (source.key === 'custom' && this.customInputTextArea) {
              this.customInputTextArea.focus();
            }
          }
        };
      }
    });
  }

  private renderOutputFormatSection(contentEl: HTMLElement) {
    new Setting(contentEl).setName('출력 형식').setHeading();

    const container = contentEl.createDiv({ cls: 'format-container' });

    const formats: { key: SlideOutputFormat; icon: string; label: string }[] = [
      { key: 'html', icon: '🌐', label: 'HTML 슬라이드' },
      { key: 'pptx', icon: '📊', label: 'PowerPoint' }
    ];

    formats.forEach(format => {
      const btn = container.createDiv({
        cls: `format-btn ${this.result.outputFormat === format.key ? 'active' : ''}`
      });
      btn.createEl('span', { text: format.icon, cls: 'format-icon' });
      btn.createEl('span', { text: format.label, cls: 'format-label' });

      btn.onclick = () => {
        this.result.outputFormat = format.key;
        container.querySelectorAll('.format-btn').forEach(b => b.removeClass('active'));
        btn.addClass('active');
        // Update style and upload sections
        this.renderStyleSection();
        this.renderUploadOptionsSection();
        this.updatePromptPreview();
      };
    });
  }

  private renderStyleSection() {
    if (!this.styleSection) return;
    this.styleSection.empty();

    if (this.result.outputFormat === 'html') {
      this.renderHtmlStyleSection();
    } else {
      this.renderPptxStyleSection();
    }
  }

  private renderHtmlStyleSection() {
    if (!this.styleSection) return;

    new Setting(this.styleSection).setName('HTML 스타일').setHeading();

    const container = this.styleSection.createDiv({ cls: 'style-container' });

    const styles: { key: HtmlSlideStyle; icon: string; label: string; desc: string }[] = [
      { key: 'vertical-scroll', icon: '📜', label: '세로 스크롤', desc: '스크롤 탐색' },
      { key: 'presentation', icon: '➡️', label: '프레젠테이션', desc: '좌우 화살표' },
      { key: 'custom', icon: '✏️', label: '커스텀', desc: '설정에서 추가' }
    ];

    // Get custom HTML prompts
    const customPrompts = this.settings.customHtmlPrompts || [];
    const hasCustomPrompts = customPrompts.length > 0;

    styles.forEach(style => {
      // Hide custom option if no custom prompts exist
      if (style.key === 'custom' && !hasCustomPrompts) return;

      const btn = container.createDiv({
        cls: `style-btn ${this.result.htmlStyle === style.key ? 'active' : ''}`
      });
      btn.createEl('span', { text: style.icon, cls: 'style-icon' });
      const textDiv = btn.createDiv({ cls: 'style-text' });
      textDiv.createEl('span', { text: style.label, cls: 'style-label' });
      textDiv.createEl('span', { text: style.desc, cls: 'style-desc' });

      btn.onclick = () => {
        this.result.htmlStyle = style.key;
        container.querySelectorAll('.style-btn').forEach(b => b.removeClass('active'));
        btn.addClass('active');
        this.updatePromptPreview();
      };
    });

    // If custom is selected, show custom prompt selector
    if (this.result.htmlStyle === 'custom' && hasCustomPrompts) {
      this.renderCustomPromptSelector('html');
    }
  }

  private renderPptxStyleSection() {
    if (!this.styleSection) return;

    new Setting(this.styleSection).setName('PPTX 스타일').setHeading();

    const container = this.styleSection.createDiv({ cls: 'style-container' });

    const styles: { key: PptxSlideStyle; icon: string; label: string; desc: string }[] = [
      { key: 'standard', icon: '📋', label: '고정 레이아웃', desc: '10개 타입' },
      { key: 'flexible', icon: '🎨', label: '유연 배치', desc: '요소 기반' },
      { key: 'custom', icon: '✏️', label: '커스텀', desc: '설정에서 추가' }
    ];

    // Get custom PPTX prompts
    const customPrompts = this.settings.customPptxPrompts || [];
    const hasCustomPrompts = customPrompts.length > 0;

    styles.forEach(style => {
      // Hide custom option if no custom prompts exist
      if (style.key === 'custom' && !hasCustomPrompts) return;

      const btn = container.createDiv({
        cls: `style-btn ${this.result.pptxStyle === style.key ? 'active' : ''}`
      });
      btn.createEl('span', { text: style.icon, cls: 'style-icon' });
      const textDiv = btn.createDiv({ cls: 'style-text' });
      textDiv.createEl('span', { text: style.label, cls: 'style-label' });
      textDiv.createEl('span', { text: style.desc, cls: 'style-desc' });

      btn.onclick = () => {
        this.result.pptxStyle = style.key;
        container.querySelectorAll('.style-btn').forEach(b => b.removeClass('active'));
        btn.addClass('active');
        this.updatePromptPreview();
      };
    });

    // If custom is selected, show custom prompt selector
    if (this.result.pptxStyle === 'custom' && hasCustomPrompts) {
      this.renderCustomPromptSelector('pptx');
    }
  }

  private renderCustomPromptSelector(type: 'html' | 'pptx') {
    if (!this.styleSection) return;

    const customPrompts = type === 'html' ? this.settings.customHtmlPrompts : this.settings.customPptxPrompts;
    if (!customPrompts || customPrompts.length === 0) return;

    const selectorContainer = this.styleSection.createDiv({ cls: 'custom-prompt-selector' });

    new Setting(selectorContainer)
      .setName('커스텀 프롬프트 선택')
      .addDropdown(dropdown => {
        customPrompts.forEach(p => {
          dropdown.addOption(p.id, p.name);
        });
        dropdown.setValue(customPrompts[0].id);
        dropdown.onChange(value => {
          const selected = customPrompts.find(p => p.id === value);
          if (selected) {
            this.result.selectedPrompt = selected.prompt;
            this.updatePromptPreview();
          }
        });
      });
  }

  private renderPromptPreviewSection(contentEl: HTMLElement) {
    new Setting(contentEl).setName('프롬프트 미리보기').setHeading();

    const previewContainer = contentEl.createDiv({ cls: 'prompt-preview-container' });

    // Description
    const descEl = previewContainer.createEl('p', {
      cls: 'prompt-description',
      text: this.getCurrentPromptDescription()
    });

    // Textarea (read-only)
    this.promptPreviewArea = previewContainer.createEl('textarea', {
      cls: 'prompt-preview-textarea',
      attr: { rows: '8', readonly: 'true' }
    });
    this.promptPreviewArea.value = this.getCurrentPrompt();
  }

  private updatePromptPreview() {
    if (!this.promptPreviewArea) return;

    // Update prompt text
    this.result.selectedPrompt = this.getCurrentPrompt();
    this.promptPreviewArea.value = this.result.selectedPrompt;

    // Update description
    const descEl = this.contentEl.querySelector('.prompt-description');
    if (descEl) {
      descEl.textContent = this.getCurrentPromptDescription();
    }
  }

  private getCurrentPrompt(): string {
    if (this.result.outputFormat === 'html') {
      if (this.result.htmlStyle === 'custom') {
        // Use first custom prompt if available
        const customs = this.settings.customHtmlPrompts || [];
        return customs[0]?.prompt || '';
      }
      // Check for user override first, then fall back to built-in
      if (this.result.htmlStyle === 'vertical-scroll') {
        return this.settings.htmlVerticalScrollPromptOverride || BUILTIN_HTML_PROMPTS['vertical-scroll'].prompt;
      }
      // htmlStyle === 'presentation'
      return this.settings.htmlPresentationPromptOverride || BUILTIN_HTML_PROMPTS['presentation'].prompt;
    } else {
      if (this.result.pptxStyle === 'custom') {
        const customs = this.settings.customPptxPrompts || [];
        return customs[0]?.prompt || '';
      }
      // Check for user override first, then fall back to built-in
      if (this.result.pptxStyle === 'standard') {
        return this.settings.pptxStandardPromptOverride || BUILTIN_PPTX_PROMPTS['standard'].prompt;
      }
      // pptxStyle === 'flexible'
      return this.settings.pptxFlexiblePromptOverride || BUILTIN_PPTX_PROMPTS['flexible'].prompt;
    }
  }

  private getCurrentPromptDescription(): string {
    if (this.result.outputFormat === 'html') {
      if (this.result.htmlStyle === 'custom') {
        const customs = this.settings.customHtmlPrompts || [];
        return customs[0]?.description || '커스텀 프롬프트';
      }
      // Check if using user override
      const isOverridden = (this.result.htmlStyle === 'vertical-scroll' && this.settings.htmlVerticalScrollPromptOverride) ||
                           (this.result.htmlStyle === 'presentation' && this.settings.htmlPresentationPromptOverride);
      const baseDesc = BUILTIN_HTML_PROMPTS[this.result.htmlStyle]?.description || '';
      return isOverridden ? `${baseDesc} (사용자 수정됨)` : baseDesc;
    } else {
      if (this.result.pptxStyle === 'custom') {
        const customs = this.settings.customPptxPrompts || [];
        return customs[0]?.description || '커스텀 프롬프트';
      }
      // Check if using user override
      const isOverridden = (this.result.pptxStyle === 'standard' && this.settings.pptxStandardPromptOverride) ||
                           (this.result.pptxStyle === 'flexible' && this.settings.pptxFlexiblePromptOverride);
      const baseDesc = BUILTIN_PPTX_PROMPTS[this.result.pptxStyle]?.description || '';
      return isOverridden ? `${baseDesc} (사용자 수정됨)` : baseDesc;
    }
  }

  private renderUploadOptionsSection() {
    if (!this.uploadSection) return;
    this.uploadSection.empty();

    new Setting(this.uploadSection).setName('업로드 옵션').setHeading();

    const container = this.uploadSection.createDiv({ cls: 'upload-container' });

    // Different options based on output format
    const options: { key: SlideUploadDestination; icon: string; label: string }[] = this.result.outputFormat === 'html'
      ? [
          { key: 'none', icon: '💾', label: '로컬만' },
          { key: 'drive', icon: '☁️', label: 'Google Drive' },
          { key: 'github', icon: '🐙', label: 'GitHub Pages' }
        ]
      : [
          { key: 'none', icon: '💾', label: '로컬만' },
          { key: 'drive', icon: '☁️', label: 'Google Drive' }
        ];

    options.forEach(option => {
      const btn = container.createDiv({
        cls: `upload-btn ${this.result.uploadDestination === option.key ? 'active' : ''}`
      });
      btn.createEl('span', { text: option.icon, cls: 'upload-icon' });
      btn.createEl('span', { text: option.label, cls: 'upload-label' });

      btn.onclick = () => {
        this.result.uploadDestination = option.key;
        container.querySelectorAll('.upload-btn').forEach(b => b.removeClass('active'));
        btn.addClass('active');
      };
    });

    // Note about GitHub Pages
    if (this.result.outputFormat === 'html') {
      this.uploadSection.createEl('p', {
        cls: 'upload-note',
        text: '* GitHub Pages에 업로드하면 iframe으로 미리보기가 가능합니다.'
      });
    }
  }

  private renderActionButtons(contentEl: HTMLElement) {
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelBtn = buttonContainer.createEl('button', { text: '취소' });
    cancelBtn.onclick = () => {
      this.result.confirmed = false;
      this.close();
    };

    const generateBtn = buttonContainer.createEl('button', {
      text: '🎬 슬라이드 생성',
      cls: 'mod-cta'
    });
    generateBtn.onclick = () => {
      this.result.confirmed = true;
      this.result.selectedPrompt = this.getCurrentPrompt();
      this.close();
    };
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .starcloud-slide-options-modal {
        padding: 16px;
        max-width: 520px;
      }

      .starcloud-slide-options-modal h2 {
        margin-bottom: 12px;
      }

      .starcloud-slide-options-modal .setting-item-heading {
        padding: 8px 0 4px 0;
        margin: 0;
      }

      .starcloud-slide-options-modal .setting-item-heading .setting-item-name {
        font-size: 13px;
      }

      /* Input Source Buttons */
      .input-source-container {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .source-btn {
        flex: 1;
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .source-btn:hover:not(.disabled) {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .source-btn.active {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .source-btn.active .source-desc,
      .source-btn.active .source-hint {
        color: var(--text-on-accent);
        opacity: 0.8;
      }

      .source-btn.disabled {
        opacity: 0.5;
        cursor: not-allowed;
      }

      .source-icon {
        font-size: 16px;
        line-height: 1;
        margin-top: 2px;
      }

      .source-text {
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      .source-label {
        font-size: 13px;
        font-weight: 600;
      }

      .source-desc {
        font-size: 11px;
        color: var(--text-muted);
      }

      .source-hint {
        font-size: 10px;
        color: var(--text-error);
      }

      /* Custom Input */
      .custom-input-container {
        margin-bottom: 12px;
      }

      .custom-input-textarea {
        width: 100%;
        min-height: 100px;
        padding: 10px;
        font-size: 13px;
        line-height: 1.4;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
      }

      /* Format Buttons */
      .format-container {
        display: flex;
        gap: 8px;
        margin-bottom: 12px;
      }

      .format-btn {
        flex: 1;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        padding: 10px 16px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .format-btn:hover {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .format-btn.active {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .format-icon {
        font-size: 16px;
      }

      .format-label {
        font-size: 13px;
        font-weight: 500;
      }

      /* Style Buttons */
      .style-container {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-bottom: 12px;
      }

      .style-btn {
        display: flex;
        align-items: flex-start;
        gap: 8px;
        padding: 8px 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .style-btn:hover {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .style-btn.active {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .style-btn.active .style-desc {
        color: var(--text-on-accent);
        opacity: 0.8;
      }

      .style-icon {
        font-size: 14px;
        margin-top: 2px;
      }

      .style-text {
        display: flex;
        flex-direction: column;
        gap: 1px;
      }

      .style-label {
        font-size: 12px;
        font-weight: 500;
      }

      .style-desc {
        font-size: 10px;
        color: var(--text-muted);
      }

      /* Prompt Preview */
      .prompt-preview-container {
        margin-bottom: 12px;
      }

      .prompt-description {
        font-size: 12px;
        color: var(--text-muted);
        margin-bottom: 8px;
      }

      .prompt-preview-textarea {
        width: 100%;
        min-height: 150px;
        max-height: 200px;
        padding: 10px;
        font-family: var(--font-monospace);
        font-size: 11px;
        line-height: 1.4;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-secondary);
        color: var(--text-muted);
        resize: vertical;
      }

      /* Upload Options */
      .upload-container {
        display: flex;
        gap: 8px;
        margin-bottom: 8px;
      }

      .upload-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .upload-btn:hover {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .upload-btn.active {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .upload-icon {
        font-size: 14px;
      }

      .upload-label {
        font-size: 12px;
        font-weight: 500;
      }

      .upload-note {
        font-size: 11px;
        color: var(--text-muted);
        margin: 0;
      }

      /* Action Buttons */
      .modal-button-container {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 16px;
        padding-top: 12px;
        border-top: 1px solid var(--background-modifier-border);
      }
    `;
    this.contentEl.appendChild(style);
  }

  onClose() {
    this.onSubmit(this.result);
    const { contentEl } = this;
    contentEl.empty();
  }
}
