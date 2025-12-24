import { App, Modal, Setting } from 'obsidian';
import {
  QuickOptionsResult,
  InputSource,
  ImageStyle,
  IMAGE_STYLES,
  InfographicSubStyle,
  INFOGRAPHIC_SUB_STYLES,
  ImageSize,
  ImageOrientation,
  CartoonCuts,
  StarCloudStudioSettings
} from '../types';

export class QuickOptionsModal extends Modal {
  private result: QuickOptionsResult;
  private onSubmit: (result: QuickOptionsResult) => void;
  private hasSelection: boolean;
  private customInputTextArea: HTMLTextAreaElement | null = null;

  constructor(
    app: App,
    settings: StarCloudStudioSettings,
    hasSelection: boolean,
    onSubmit: (result: QuickOptionsResult) => void
  ) {
    super(app);
    this.hasSelection = hasSelection;
    this.onSubmit = onSubmit;
    this.result = {
      confirmed: false,
      inputSource: hasSelection ? 'selection' : settings.defaultInputSource,
      customInputText: '',
      imageStyle: settings.imageStyle,
      infographicSubStyle: settings.infographicSubStyle,
      imageSize: settings.imageSize,
      imageOrientation: 'horizontal',
      cartoonCuts: settings.cartoonCuts,
      customCartoonCuts: settings.customCartoonCuts
    };
  }

  onOpen() {
    const { contentEl } = this;
    contentEl.empty();
    contentEl.addClass('starcloud-quick-options-modal');

    contentEl.createEl('h2', { text: '🎨 포스터 생성 옵션' });

    // Input Source Section
    new Setting(contentEl)
      .setName('입력 소스')
      .setHeading();

    const inputSourceContainer = contentEl.createDiv({ cls: 'input-source-container' });

    const inputSources: { key: InputSource; icon: string; label: string; desc: string }[] = [
      { key: 'fullNote', icon: '📄', label: '전체 노트', desc: '노트 전체 내용' },
      { key: 'selection', icon: '✂️', label: '선택 영역', desc: '선택된 텍스트' },
      { key: 'custom', icon: '✏️', label: '직접 입력', desc: '텍스트 입력' }
    ];

    const inputSourceButtons: Map<InputSource, HTMLElement> = new Map();

    inputSources.forEach(source => {
      const isDisabled = source.key === 'selection' && !this.hasSelection;
      const btn = inputSourceContainer.createDiv({
        cls: `source-btn ${this.result.inputSource === source.key ? 'active' : ''} ${isDisabled ? 'disabled' : ''}`
      });
      btn.createEl('span', { text: source.icon, cls: 'source-icon' });
      const textDiv = btn.createDiv({ cls: 'source-text' });
      textDiv.createEl('span', { text: source.label, cls: 'source-label' });
      textDiv.createEl('span', { text: source.desc, cls: 'source-desc' });

      if (isDisabled) {
        textDiv.createEl('span', { text: '(선택 필요)', cls: 'source-hint' });
      }

      inputSourceButtons.set(source.key, btn);

      if (!isDisabled) {
        btn.onclick = () => this.selectInputSource(source.key, inputSourceButtons, customInputContainer);
      }
    });

    // Custom Input TextArea
    const customInputContainer = contentEl.createDiv({ cls: 'custom-input-container' });
    if (this.result.inputSource !== 'custom') {
      customInputContainer.style.display = 'none';
    }
    this.customInputTextArea = customInputContainer.createEl('textarea', {
      cls: 'custom-input-textarea',
      attr: {
        rows: '4',
        placeholder: '포스터로 만들 내용을 직접 입력하세요...'
      }
    });
    this.customInputTextArea.value = this.result.customInputText;
    this.customInputTextArea.oninput = () => {
      if (this.customInputTextArea) {
        this.result.customInputText = this.customInputTextArea.value;
      }
    };

    // Image Style Section
    new Setting(contentEl)
      .setName('이미지 스타일')
      .setHeading();

    const styleContainer = contentEl.createDiv({ cls: 'style-container' });

    const styleOptions: { key: ImageStyle; icon: string; name: string }[] = [
      { key: 'infographic', icon: '📊', name: '인포그래픽' },
      { key: 'poster', icon: '🎨', name: '포스터' },
      { key: 'diagram', icon: '📐', name: '다이어그램' },
      { key: 'mindmap', icon: '🧠', name: '마인드맵' },
      { key: 'timeline', icon: '📅', name: '타임라인' },
      { key: 'cartoon', icon: '🎬', name: '카툰' }
    ];

    const styleButtons: Map<ImageStyle, HTMLElement> = new Map();

    styleOptions.forEach(style => {
      const btn = styleContainer.createDiv({
        cls: `style-btn ${this.result.imageStyle === style.key ? 'active' : ''}`
      });
      btn.createEl('span', { text: style.icon, cls: 'style-icon' });
      btn.createEl('span', { text: style.name, cls: 'style-label' });
      styleButtons.set(style.key, btn);
      btn.onclick = () => this.selectStyle(style.key, styleButtons);
    });

    // Infographic Sub-Style Section (conditional)
    this.renderInfographicSubStyleSection(contentEl);

    // Cartoon Cuts Section (conditional)
    this.renderCartoonCutsSection(contentEl);

    // Image Orientation & Resolution Section (same line)
    new Setting(contentEl)
      .setName('이미지 설정')
      .setHeading();

    const orientationResolutionRow = contentEl.createDiv({ cls: 'orientation-resolution-row' });

    // Orientation buttons
    const orientationContainer = orientationResolutionRow.createDiv({ cls: 'orientation-container' });

    const orientations: { key: ImageOrientation; icon: string; label: string }[] = [
      { key: 'horizontal', icon: '▬', label: '가로' },
      { key: 'vertical', icon: '▮', label: '세로' }
    ];

    orientations.forEach(orient => {
      const btn = orientationContainer.createDiv({
        cls: `orientation-btn ${this.result.imageOrientation === orient.key ? 'active' : ''}`
      });
      btn.createEl('span', { text: orient.icon, cls: 'orientation-icon' });
      btn.createEl('span', { text: orient.label, cls: 'orientation-label' });
      btn.onclick = () => {
        this.result.imageOrientation = orient.key;
        orientationContainer.querySelectorAll('.orientation-btn').forEach(b => b.removeClass('active'));
        btn.addClass('active');
      };
    });

    // Resolution dropdown
    const resolutionContainer = orientationResolutionRow.createDiv({ cls: 'resolution-container' });
    resolutionContainer.createEl('span', { text: '해상도:', cls: 'resolution-label' });
    const resolutionSelect = resolutionContainer.createEl('select', { cls: 'resolution-select' });

    const resolutionOptions = [
      { value: '1K', label: '1K (1024px)' },
      { value: '2K', label: '2K (2048px)' },
      { value: '4K', label: '4K (4096px)' }
    ];

    resolutionOptions.forEach(opt => {
      const option = resolutionSelect.createEl('option', { value: opt.value, text: opt.label });
      if (opt.value === this.result.imageSize) {
        option.selected = true;
      }
    });

    resolutionSelect.onchange = () => {
      this.result.imageSize = resolutionSelect.value as ImageSize;
    };

    // Action Buttons
    const buttonContainer = contentEl.createDiv({ cls: 'modal-button-container' });

    const cancelButton = buttonContainer.createEl('button', { text: '취소' });
    cancelButton.onclick = () => {
      this.result.confirmed = false;
      this.close();
    };

    const generateButton = buttonContainer.createEl('button', {
      text: '🎨 포스터 생성',
      cls: 'mod-cta'
    });
    generateButton.onclick = () => {
      this.result.confirmed = true;
      this.close();
    };

    // Add custom styles
    this.addStyles();
  }

  private selectInputSource(
    source: InputSource,
    buttons: Map<InputSource, HTMLElement>,
    customInputContainer: HTMLElement
  ) {
    this.result.inputSource = source;
    buttons.forEach((btn, key) => {
      btn.removeClass('active');
      if (key === source) btn.addClass('active');
    });

    if (source === 'custom') {
      customInputContainer.style.display = 'block';
      if (this.customInputTextArea) {
        this.customInputTextArea.focus();
      }
    } else {
      customInputContainer.style.display = 'none';
    }
  }

  private selectStyle(style: ImageStyle, buttons: Map<ImageStyle, HTMLElement>) {
    this.result.imageStyle = style;
    buttons.forEach((btn, key) => {
      btn.removeClass('active');
      if (key === style) btn.addClass('active');
    });
    this.reRenderConditionalSections();
  }

  private reRenderConditionalSections() {
    const existingInfographicSection = this.contentEl.querySelector('.infographic-substyle-section');
    if (existingInfographicSection) existingInfographicSection.remove();

    const existingCartoonSection = this.contentEl.querySelector('.cartoon-cuts-section');
    if (existingCartoonSection) existingCartoonSection.remove();

    const settingsItems = this.contentEl.querySelectorAll('.setting-item');
    let orientationHeading: Element | undefined;
    for (const item of Array.from(settingsItems)) {
      const name = item.querySelector('.setting-item-name');
      if (name && name.textContent === '이미지 설정') {
        orientationHeading = item;
        break;
      }
    }

    if (orientationHeading && orientationHeading.parentNode) {
      if (this.result.imageStyle === 'infographic') {
        const subStyleSection = this.renderInfographicSubStyleSectionEl();
        orientationHeading.parentNode.insertBefore(subStyleSection, orientationHeading);
      } else if (this.result.imageStyle === 'cartoon') {
        const cartoonSection = this.renderCartoonCutsSectionEl();
        orientationHeading.parentNode.insertBefore(cartoonSection, orientationHeading);
      }
    }
  }

  private renderInfographicSubStyleSection(containerEl: HTMLElement) {
    if (this.result.imageStyle !== 'infographic') return;
    const section = this.renderInfographicSubStyleSectionEl();
    containerEl.appendChild(section);
  }

  private renderInfographicSubStyleSectionEl(): HTMLElement {
    const section = createDiv({ cls: 'infographic-substyle-section' });

    new Setting(section)
      .setName('인포그래픽 스타일')
      .setHeading();

    const subStyleGrid = section.createDiv({ cls: 'substyle-grid' });

    const subStyleOptions: { key: InfographicSubStyle; name: string; desc: string }[] = [
      { key: 'general', name: '일반', desc: '기본 인포그래픽' },
      { key: 'visualStory', name: '비주얼 스토리텔링', desc: '카드뉴스, SNS' },
      { key: 'tedEd', name: 'TED-Ed 교육', desc: '교육, 튜토리얼' },
      { key: 'journalism', name: '저널리즘', desc: '보도자료, 리포트' },
      { key: 'gamification', name: '게이미피케이션', desc: '이벤트, 프로세스' },
      { key: 'vcPitch', name: 'VC 피칭', desc: '투자 제안서' }
    ];

    subStyleOptions.forEach(subStyle => {
      const subStyleCard = subStyleGrid.createDiv({
        cls: `substyle-card ${this.result.infographicSubStyle === subStyle.key ? 'selected' : ''}`
      });
      subStyleCard.createDiv({ cls: 'substyle-name', text: subStyle.name });
      subStyleCard.createDiv({ cls: 'substyle-desc', text: subStyle.desc });
      subStyleCard.onclick = () => {
        this.result.infographicSubStyle = subStyle.key;
        subStyleGrid.querySelectorAll('.substyle-card').forEach(card => card.removeClass('selected'));
        subStyleCard.addClass('selected');
      };
    });

    return section;
  }

  private renderCartoonCutsSection(containerEl: HTMLElement) {
    if (this.result.imageStyle !== 'cartoon') return;
    const section = this.renderCartoonCutsSectionEl();
    containerEl.appendChild(section);
  }

  private renderCartoonCutsSectionEl(): HTMLElement {
    const section = createDiv({ cls: 'cartoon-cuts-section' });

    new Setting(section)
      .setName('카툰 컷 수')
      .addDropdown(dropdown => {
        dropdown.addOption('4', '4컷 (2x2)');
        dropdown.addOption('6', '6컷 (2x3)');
        dropdown.addOption('8', '8컷 (2x4)');
        dropdown.addOption('custom', '커스텀');
        dropdown.setValue(this.result.cartoonCuts);
        dropdown.onChange((value: CartoonCuts) => {
          this.result.cartoonCuts = value;
          this.reRenderCartoonCustomInput(section);
        });
      });

    this.reRenderCartoonCustomInput(section);
    return section;
  }

  private reRenderCartoonCustomInput(section: HTMLElement) {
    const existingInput = section.querySelector('.custom-cuts-input');
    if (existingInput) existingInput.remove();

    if (this.result.cartoonCuts === 'custom') {
      new Setting(section)
        .setClass('custom-cuts-input')
        .setName('커스텀 컷 수')
        .setDesc('2-12 사이의 숫자')
        .addText(text => {
          text.setValue(String(this.result.customCartoonCuts));
          text.onChange((value) => {
            const num = parseInt(value) || 4;
            this.result.customCartoonCuts = Math.min(12, Math.max(2, num));
          });
        });
    }
  }

  private addStyles() {
    const style = document.createElement('style');
    style.textContent = `
      .starcloud-quick-options-modal {
        padding: 16px;
        max-width: 480px;
      }

      .starcloud-quick-options-modal h2 {
        margin-bottom: 12px;
      }

      .starcloud-quick-options-modal .setting-item-heading {
        padding: 8px 0 4px 0;
        margin: 0;
      }

      .starcloud-quick-options-modal .setting-item-heading .setting-item-name {
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
        min-height: 80px;
        padding: 10px;
        font-size: 13px;
        line-height: 1.4;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        background: var(--background-primary);
        color: var(--text-normal);
        resize: vertical;
      }

      .custom-input-textarea:focus {
        outline: none;
        border-color: var(--interactive-accent);
      }

      /* Style Buttons */
      .style-container {
        display: flex;
        flex-wrap: wrap;
        gap: 6px;
        margin-bottom: 12px;
      }

      .style-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 12px;
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

      .style-icon {
        font-size: 14px;
      }

      .style-label {
        font-size: 12px;
        font-weight: 500;
      }

      /* Orientation & Resolution Row */
      .orientation-resolution-row {
        display: flex;
        align-items: center;
        gap: 16px;
        margin-bottom: 12px;
      }

      .orientation-container {
        display: flex;
        gap: 6px;
      }

      .orientation-btn {
        display: inline-flex;
        align-items: center;
        gap: 6px;
        padding: 6px 14px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .orientation-btn:hover {
        border-color: var(--interactive-accent);
        background: var(--background-modifier-hover);
      }

      .orientation-btn.active {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .orientation-icon {
        font-size: 14px;
      }

      .orientation-label {
        font-size: 12px;
        font-weight: 500;
      }

      .resolution-container {
        display: flex;
        align-items: center;
        gap: 8px;
      }

      .resolution-label {
        font-size: 12px;
        color: var(--text-muted);
      }

      .resolution-select {
        padding: 4px 8px;
        font-size: 12px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 4px;
        background: var(--background-primary);
        color: var(--text-normal);
      }

      /* Substyle Grid */
      .substyle-grid {
        display: grid;
        grid-template-columns: repeat(2, 1fr);
        gap: 6px;
        margin-bottom: 12px;
      }

      .substyle-card {
        padding: 8px 10px;
        border: 1px solid var(--background-modifier-border);
        border-radius: 6px;
        cursor: pointer;
        transition: all 0.15s ease;
      }

      .substyle-card:hover {
        border-color: var(--interactive-accent);
      }

      .substyle-card.selected {
        border-color: var(--interactive-accent);
        background: var(--interactive-accent);
        color: var(--text-on-accent);
      }

      .substyle-card.selected .substyle-desc {
        color: var(--text-on-accent);
        opacity: 0.8;
      }

      .substyle-name {
        font-size: 12px;
        font-weight: 500;
        margin-bottom: 2px;
      }

      .substyle-desc {
        font-size: 10px;
        color: var(--text-muted);
      }

      /* Modal Buttons */
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
